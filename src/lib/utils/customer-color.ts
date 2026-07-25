// Deterministic per-customer colour so the same customer always gets the same
// swatch across the app (no manual config). With many customers a fixed palette
// collides, so we spread the hash across the full hue wheel (fixed saturation /
// lightness) — hundreds of distinct hues that read on both light & dark surfaces.

function hashKey(key?: string | null): number {
  const s = String(key ?? '').trim().toLowerCase()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

// Golden-angle hue stepping (137.5°) decorrelates neighbouring hashes so colours
// spread evenly around the wheel instead of clustering — good separation for a
// few dozen customers. A second dimension (3 lightness/saturation tiers) adds
// perceptual slots so even near-equal hues still read differently.
const GOLDEN = 137.508
const TIERS = [
  { s: 70, l: 50 },
  { s: 60, l: 60 },
  { s: 78, l: 43 },
]

/**
 * Colour for a customer at a KNOWN position in the customer list. Golden-angle
 * stepping over a sequential index spreads hues evenly (guaranteed separation
 * for dozens of customers); the lightness tier advances each full wrap so later
 * customers stay distinct too. Use this (via the CustomerColorProvider) when the
 * customer's index is known; fall back to `customerColor` otherwise.
 */
export function colorByIndex(i: number): string {
  if (i < 0) return 'hsl(215 16% 65%)'
  const hue = Math.round((i * GOLDEN) % 360)
  const tier = TIERS[Math.floor((i * GOLDEN) / 360) % TIERS.length]
  return `hsl(${hue} ${tier.s}% ${tier.l}%)`
}

/** Stateless fallback colour, keyed by customer name (used for unknown customers). */
export function customerColor(key?: string | null): string {
  const s = String(key ?? '').trim()
  if (!s) return 'hsl(215 16% 65%)' // neutral slate for unknown
  const h = hashKey(s)
  const hue = Math.round((h * GOLDEN) % 360)
  const tier = TIERS[(h >>> 5) % TIERS.length]
  return `hsl(${hue} ${tier.s}% ${tier.l}%)`
}
