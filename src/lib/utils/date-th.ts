/**
 * Single source of truth for "now" in Thailand (UTC+7).
 *
 * Vercel's serverless/Fluid runtime is UTC, so `new Date().toISOString()`,
 * `.toTimeString()`, `.getHours()`, `.getDate()` etc. return UTC — which is off
 * by up to a full day during Thai 00:00–07:00 (UTC is still the previous day)
 * and 7 hours for any wall-clock time. Every "today" / "current time" value in
 * the app must go through these helpers so the whole system speaks Thai time.
 *
 * Note: raw `new Date().toISOString()` is still correct for storing DB
 * *timestamps* (they should be UTC instants) — only calendar-date keys and
 * wall-clock strings need these helpers.
 */

export const TH_TZ = "Asia/Bangkok"

/** Today's calendar date in Thailand as 'YYYY-MM-DD'. */
export function todayTH(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TH_TZ })
}

/** A given instant's Thai calendar date as 'YYYY-MM-DD'. */
export function dateKeyTH(d: Date | string | number): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: TH_TZ })
}

/**
 * Display helper for date fields that may be a plain 'YYYY-MM-DD' (Plan_Date) or
 * a full ISO timestamp (Pickup_Date/Delivery_Date). Returns the Thai calendar
 * date; falls back to '-' when empty. Use anywhere a รับ/ส่ง date is shown.
 */
export function fmtDateTH(v?: string | null): string {
  if (!v) return "-"
  if (!v.includes("T")) return v
  const d = new Date(v)
  return isNaN(d.getTime()) ? v : new Intl.DateTimeFormat("en-CA", { timeZone: TH_TZ }).format(d)
}

/** Wall-clock time in Thailand as 'HH:MM:SS' (24h). Defaults to now. */
export function timeTH(d: Date | string | number = new Date()): string {
  return new Date(d).toLocaleTimeString("en-GB", { timeZone: TH_TZ, hour12: false })
}

/** Current hour (0–23) in Thailand. */
export function hourTH(): number {
  return Number(new Date().toLocaleTimeString("en-GB", { timeZone: TH_TZ, hour12: false }).slice(0, 2))
}

/** First day of the current Thai month as 'YYYY-MM-DD'. */
export function monthStartTH(): string {
  return `${todayTH().slice(0, 8)}01`
}
