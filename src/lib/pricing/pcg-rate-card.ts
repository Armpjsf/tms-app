import 'server-only'

import { createAdminClient } from '@/utils/supabase/server'
import { getFuelPriceNumber } from '@/lib/actions/fuel-actions'
import { reverseGeocode } from '@/lib/ai/geocoding'

/**
 * PCG 4WJ freight pricing.
 *
 * PCG charges a fixed rate per destination that steps with the diesel retail
 * price (18 bands, 29–46 บาท/ลิตร). A trip's customer price = the rate of the
 * FARTHEST drop (the most expensive destination) at the day's diesel band.
 *
 * Rates live in the PCG_Rate_Card table (seeded from PCG_4WJ 18-07-69.pdf).
 * Destination strings on jobs are free text like
 *   "บมจ.ซีพีเอ็กซ์ตร้า (อ.เมือง จ.สุราษฎร์)"
 * so we extract อำเภอ + จังหวัด and match against the (normalized) rate rows.
 */

export const PCG_CUSTOMER_ID = 'PCG'
const BAND_MIN = 29
const BAND_MAX = 46

export type PcgRateRow = {
  seq: number | null
  name: string
  amphoe: string | null
  province: string | null
  is_combo: boolean
  rates: Record<string, number>
}

const stripSpaces = (s: string) => s.normalize('NFC').replace(/\s+/g, '')

// อำเภอ/จังหวัด key for matching: drop the อ./จ./กิ่งอ. prefix and all spaces.
function normAmphoe(s: string): string {
  const a = stripSpaces(s).replace(/^(?:กิ่งอ\.|อำเภอ|อ\.)/, '')
  // อำเภอเมือง is always "เมือง<จังหวัด>" (e.g. เมืองภูเก็ต) — the rate card
  // stores it as plain "เมือง", so collapse any "เมือง…" back to "เมือง".
  return a.startsWith('เมือง') ? 'เมือง' : a
}
function normProvince(s: string): string {
  return stripSpaces(s).replace(/^(?:จังหวัด|จ\.)/, '')
}

// Two จังหวัด names refer to the same province when one is a prefix of the
// other (handles abbreviations like สุราษฎร์ ↔ สุราษฎร์ธานี, ประจวบ ↔
// ประจวบคีรีขันต์) or they share a 4-char stem (tolerates the PDF typo
// "นครศรีธรราราช" vs "นครศรีธรรมราช").
function provinceMatches(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b || a.startsWith(b) || b.startsWith(a)) return true
  const stem = Math.min(4, a.length, b.length)
  return stem >= 3 && a.slice(0, stem) === b.slice(0, stem)
}

// Pull (อำเภอ, จังหวัด) out of a free-text destination / address. Accepts the
// short "อ.X จ.Y" form and the full "อำเภอX ... จังหวัดY" form (e.g. what a
// Google reverse-geocode returns).
export function extractAmphoeProvince(dest: string): { amphoe: string; province: string } | null {
  if (!dest) return null
  const text = dest.normalize('NFC')

  // Short form: อ.X ... จ.Y
  const short = text.match(/อ\.\s*([^)]+?)\s*จ\.\s*([^)\s]+)/)
  if (short) return { amphoe: normAmphoe('อ.' + short[1]), province: normProvince('จ.' + short[2]) }

  // Otherwise find อำเภอ and จังหวัด independently — covers Google reverse-geocode
  // addresses like "...ตำบลตลาดใหญ่ อำเภอเมืองภูเก็ต ภูเก็ต 83000 ประเทศไทย"
  // where the province is a bare word before the 5-digit postal code.
  const amMatch = text.match(/(?:อำเภอ|กิ่งอำเภอ|อ\.)\s*([^\s,]+)/)
  if (!amMatch) return null
  const amphoe = normAmphoe(amMatch[0])

  let province: string | null = null
  const provKw = text.match(/จังหวัด\s*([^\s,]+)/)
  if (provKw) province = normProvince('จังหวัด' + provKw[1])
  else {
    const prePostal = text.match(/([^\s,]+)\s+\d{5}\b/) // token right before the postal code
    if (prePostal) province = normProvince(prePostal[1])
  }
  if (!province) return null
  return { amphoe, province }
}

// Diesel price → band key ("29".."46"), clamped to the table's range.
export function bandForFuelPrice(fuel: number): string {
  const b = Math.min(BAND_MAX, Math.max(BAND_MIN, Math.floor(fuel)))
  return String(b)
}

let cache: { rows: PcgRateRow[]; at: number } | null = null
const CACHE_MS = 5 * 60 * 1000

export async function getPcgRates(): Promise<PcgRateRow[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('PCG_Rate_Card')
    .select('seq,name,amphoe,province,is_combo,rates')
    .eq('Active_Status', 'Active')
  if (error) { console.warn('[PCG_RATE] load failed:', error.message); return cache?.rows ?? [] }
  const rows = (data || []) as PcgRateRow[]
  cache = { rows, at: Date.now() }
  return rows
}

export type PcgPriceResult = {
  price: number
  band: string
  fuelPrice: number
  matchedDestination: string
  matchedDrops: number
  totalDrops: number
}

export type PcgDropInput = string | { name?: string | null; lat?: number | string | null; lng?: number | string | null }

/**
 * Resolve the PCG customer price for a trip from its drop destinations.
 * Returns null when the diesel price is unknown or no drop matches the card,
 * so callers can fall back to manual pricing instead of writing a wrong price.
 *
 * Each drop may be a name string or an object with name + lat/lng. When a
 * drop name has no "อ./จ." (jobs created in-app often store just the store
 * name), we reverse-geocode its coordinates to recover อำเภอ/จังหวัด before
 * matching — so pricing still works without a hand-typed area.
 */
export async function resolvePcgPrice(
  destinations: PcgDropInput[],
  date?: string,
): Promise<PcgPriceResult | null> {
  const drops = (destinations || [])
    .map(d => (typeof d === 'string' ? { name: d } : d))
    .filter(d => (d?.name && String(d.name).trim()) || d?.lat)
  if (drops.length === 0) return null

  const fuel = await getFuelPriceNumber(date).catch(() => null)
  if (fuel == null || !(fuel > 0)) return null
  const band = bandForFuelPrice(fuel)

  const rows = await getPcgRates()
  const singles = rows.filter(r => !r.is_combo && r.amphoe)

  const findRow = (ap: { amphoe: string; province: string }) =>
    singles.find(r => r.amphoe === ap.amphoe && provinceMatches(r.province || '', ap.province))

  let best: { price: number; name: string } | null = null
  let matched = 0
  let totalDrops = 0
  for (const drop of drops) {
    totalDrops += 1
    const name = String(drop.name || '').trim()
    let ap = name ? extractAmphoeProvince(name) : null

    // Fallback: name lacks อ./จ. → reverse-geocode the drop's coordinates.
    if (!ap) {
      const lat = Number(drop.lat), lng = Number(drop.lng)
      if (lat && lng && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        const label = await reverseGeocode(lat, lng).catch(() => null)
        if (label) ap = extractAmphoeProvince(label)
      }
    }
    if (!ap) continue

    const row = findRow(ap)
    if (!row) continue
    const price = Number(row.rates?.[band])
    if (!(price > 0)) continue
    matched += 1
    // Farthest drop = highest rate (rates rise with distance).
    if (!best || price > best.price) best = { price, name: row.name }
  }

  if (!best) return null
  return {
    price: best.price,
    band,
    fuelPrice: fuel,
    matchedDestination: best.name,
    matchedDrops: matched,
    totalDrops,
  }
}
