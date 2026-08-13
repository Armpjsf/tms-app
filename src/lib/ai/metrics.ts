"use server"

/**
 * AI Metrics Layer (Phase 1 of the AI-first roadmap)
 * ---------------------------------------------------
 * Canonical, DETERMINISTIC business metrics with explicit provenance.
 *
 * Why this exists: an AI assistant must never invent or re-compute numbers.
 * Every figure the assistant reports should come from one of these functions,
 * which return not just the value but WHAT it covers (period, filters, row
 * count, when it was computed) so the answer can be cited and trusted.
 *
 * Period handling is Bangkok-time and flexible, so the AI can answer
 * "สัปดาห์ที่แล้ว", "เดือนที่แล้ว", or a custom range — not just "today".
 */

import { createAdminClient } from "@/utils/supabase/server"

const TH_TZ = "Asia/Bangkok"

// Status buckets — kept in sync with the rest of the system (see lib/ai/tools.ts).
const ACTIVE_STATUS = ['In Progress', 'In Transit', 'Picked Up', 'Arrived Pickup', 'Arrived Dropoff', 'กำลังโหลด', 'ระหว่างขนส่ง', 'กำลังดำเนินการ']
const COMPLETED_STATUS = ['Completed', 'Delivered', 'Complete', 'Verified', 'เสร็จสิ้น', 'สำเร็จ', 'ส่งงานแล้ว']
const PENDING_STATUS = ['New', 'Pending', 'Requested', 'Assigned', 'รอรับบริการ', 'รอดำเนินการ', 'รอคนขับ', 'ยืนยันงาน']
const CANCELLED_STATUS = ['Cancelled', 'Cancel', 'Failed', 'ยกเลิก']
// Revenue is recognised only once a job is delivered/billed (matches the
// dashboard's financial definition).
const REVENUE_STATUS = ['Completed', 'Complete', 'Delivered', 'Verified', 'Billed', 'Paid']

export type PeriodKey =
  | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_7_days' | 'last_30_days'

export type ResolvedPeriod = { from: string; to: string; label: string }

function ymdTH(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TH_TZ })
}

/** Resolve a period key (or explicit {from,to}) into Bangkok YYYY-MM-DD bounds. */
export async function resolvePeriod(period: PeriodKey | { from: string; to: string } = 'today'): Promise<ResolvedPeriod> {
  if (typeof period === 'object') {
    return { from: period.from, to: period.to, label: `${period.from} ถึง ${period.to}` }
  }
  const now = new Date()
  const today = ymdTH(now)
  const dayMs = 86_400_000
  const shift = (n: number) => ymdTH(new Date(now.getTime() + n * dayMs))
  // Day-of-week in Bangkok (0=Sun)
  const dow = Number(new Date(now.toLocaleString('en-US', { timeZone: TH_TZ })).getDay())
  const mondayOffset = (dow === 0 ? -6 : 1 - dow) // ISO week starts Monday
  const thisMonday = shift(mondayOffset)
  const thisMonthFirst = today.slice(0, 8) + '01'

  switch (period) {
    case 'today': return { from: today, to: today, label: 'วันนี้' }
    case 'yesterday': return { from: shift(-1), to: shift(-1), label: 'เมื่อวาน' }
    case 'this_week': return { from: thisMonday, to: today, label: 'สัปดาห์นี้' }
    case 'last_week': return { from: shift(mondayOffset - 7), to: shift(mondayOffset - 1), label: 'สัปดาห์ที่แล้ว' }
    case 'this_month': return { from: thisMonthFirst, to: today, label: 'เดือนนี้' }
    case 'last_month': {
      const d = new Date(now.toLocaleString('en-US', { timeZone: TH_TZ }))
      const firstOfThis = new Date(d.getFullYear(), d.getMonth(), 1)
      const lastMonthEnd = new Date(firstOfThis.getTime() - dayMs)
      const lastMonthFirst = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1)
      return { from: ymdTH(lastMonthFirst), to: ymdTH(lastMonthEnd), label: 'เดือนที่แล้ว' }
    }
    case 'last_7_days': return { from: shift(-6), to: today, label: '7 วันล่าสุด' }
    case 'last_30_days': return { from: shift(-29), to: today, label: '30 วันล่าสุด' }
    default: return { from: today, to: today, label: 'วันนี้' }
  }
}

type Provenance = { metric: string; period: ResolvedPeriod; branch: string; rowCount: number; generatedAt: string }
function provenance(metric: string, period: ResolvedPeriod, branchId: string | undefined, rowCount: number): Provenance {
  return { metric, period, branch: branchId && branchId !== 'All' ? branchId : 'ทุกสาขา', rowCount, generatedAt: new Date().toISOString() }
}

function applyBranch<T extends { eq: (c: string, v: string) => T }>(q: T, branchId?: string): T {
  return branchId && branchId !== 'All' ? q.eq('Branch_ID', branchId) : q
}

/** Job counts by status bucket for a period. */
export async function getOpsSummary(period: PeriodKey | { from: string; to: string } = 'today', branchId?: string) {
  const supabase = createAdminClient()
  const p = await resolvePeriod(period)
  let q = supabase.from('Jobs_Main').select('Job_Status').gte('Plan_Date', p.from).lte('Plan_Date', p.to)
  q = applyBranch(q, branchId)
  const { data, error } = await q
  const rows = error ? [] : (data || [])
  const inBucket = (b: string[]) => rows.filter(r => b.includes((r as { Job_Status?: string }).Job_Status || '')).length
  const active = inBucket(ACTIVE_STATUS), completed = inBucket(COMPLETED_STATUS)
  const pending = inBucket(PENDING_STATUS), cancelled = inBucket(CANCELLED_STATUS)
  return {
    total: rows.length,
    active, completed, pending, cancelled,
    other: rows.length - (active + completed + pending + cancelled),
    _provenance: provenance('ops_summary', p, branchId, rows.length),
  }
}

/** Revenue / cost / profit for a period, optionally broken down by customer or branch. */
export async function getRevenueSummary(
  period: PeriodKey | { from: string; to: string } = 'this_month',
  branchId?: string,
  groupBy?: 'customer' | 'branch',
) {
  const supabase = createAdminClient()
  const p = await resolvePeriod(period)
  let q = supabase.from('Jobs_Main')
    .select('Price_Cust_Total, Cost_Driver_Total, Customer_Name, Branch_ID, Job_Status')
    .gte('Plan_Date', p.from).lte('Plan_Date', p.to)
    .in('Job_Status', REVENUE_STATUS)
  q = applyBranch(q, branchId)
  const { data, error } = await q
  const rows = error ? [] : (data || [])
  const num = (v: unknown) => Number(v) || 0
  const revenue = rows.reduce((s, r) => s + num((r as { Price_Cust_Total?: unknown }).Price_Cust_Total), 0)
  const cost = rows.reduce((s, r) => s + num((r as { Cost_Driver_Total?: unknown }).Cost_Driver_Total), 0)
  const netProfit = revenue - cost

  let breakdown: { key: string; revenue: number; jobs: number }[] | undefined
  if (groupBy) {
    const field = groupBy === 'customer' ? 'Customer_Name' : 'Branch_ID'
    const map = new Map<string, { revenue: number; jobs: number }>()
    for (const r of rows) {
      const k = String((r as Record<string, unknown>)[field] ?? '—')
      const cur = map.get(k) || { revenue: 0, jobs: 0 }
      cur.revenue += num((r as { Price_Cust_Total?: unknown }).Price_Cust_Total); cur.jobs += 1
      map.set(k, cur)
    }
    breakdown = [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }

  return {
    revenue, cost, netProfit,
    margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    jobCount: rows.length,
    ...(breakdown ? { topBy: groupBy, breakdown } : {}),
    _provenance: provenance('revenue_summary', p, branchId, rows.length),
  }
}

/** Per-day series (jobs / completed / revenue) across a period — for "รายวัน" asks. */
export async function getDailyTrend(period: PeriodKey | { from: string; to: string } = 'last_7_days', branchId?: string) {
  const supabase = createAdminClient()
  const p = await resolvePeriod(period)
  let q = supabase.from('Jobs_Main')
    .select('Plan_Date, Job_Status, Price_Cust_Total')
    .gte('Plan_Date', p.from).lte('Plan_Date', p.to)
  q = applyBranch(q, branchId)
  const { data, error } = await q
  const rows = error ? [] : (data || [])
  const num = (v: unknown) => Number(v) || 0
  const byDay = new Map<string, { total: number; completed: number; revenue: number }>()
  for (const r of rows) {
    const j = r as { Plan_Date?: string; Job_Status?: string; Price_Cust_Total?: unknown }
    const day = j.Plan_Date || '—'
    const cur = byDay.get(day) || { total: 0, completed: 0, revenue: 0 }
    cur.total += 1
    if (COMPLETED_STATUS.includes(j.Job_Status || '')) cur.completed += 1
    if (REVENUE_STATUS.includes(j.Job_Status || '')) cur.revenue += num(j.Price_Cust_Total)
    byDay.set(day, cur)
  }
  const days = [...byDay.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date))
  return { days, totalJobs: rows.length, _provenance: provenance('daily_trend', p, branchId, rows.length) }
}

/** Jobs in a period whose driver cost exceeds the customer price (loss-making). */
export async function getLossMakingJobs(period: PeriodKey | { from: string; to: string } = 'this_month', branchId?: string) {
  const supabase = createAdminClient()
  const p = await resolvePeriod(period)
  let q = supabase.from('Jobs_Main')
    .select('Job_ID, Customer_Name, Price_Cust_Total, Cost_Driver_Total, Job_Status')
    .gte('Plan_Date', p.from).lte('Plan_Date', p.to)
    .in('Job_Status', REVENUE_STATUS)
  q = applyBranch(q, branchId)
  const { data, error } = await q
  const rows = error ? [] : (data || [])
  const num = (v: unknown) => Number(v) || 0
  const losers = rows
    .map(r => {
      const j = r as { Job_ID?: string; Customer_Name?: string; Price_Cust_Total?: unknown; Cost_Driver_Total?: unknown }
      const price = num(j.Price_Cust_Total), cost = num(j.Cost_Driver_Total)
      return { jobId: j.Job_ID, customer: j.Customer_Name, price, cost, loss: cost - price }
    })
    .filter(x => x.loss > 0)
    .sort((a, b) => b.loss - a.loss)
  const totalLoss = losers.reduce((s, x) => s + x.loss, 0)
  return {
    count: losers.length,
    totalLoss,
    sample: losers.slice(0, 10),
    _provenance: provenance('loss_making_jobs', p, branchId, rows.length),
  }
}

/** Jobs whose Delivery_Date has passed but are not yet delivered/closed. */
export async function getOverdueDeliveries(branchId?: string) {
  const supabase = createAdminClient()
  const today = ymdTH(new Date())
  const CLOSED = ['Completed', 'Complete', 'Delivered', 'Verified', 'Billed', 'Paid', 'Cancelled', 'Failed']
  let q = supabase.from('Jobs_Main')
    .select('Job_ID, Customer_Name, Driver_Name, Delivery_Date, Job_Status')
    .lt('Delivery_Date', today)
    .not('Job_Status', 'in', `(${CLOSED.map(s => `"${s}"`).join(',')})`)
    .order('Delivery_Date', { ascending: true })
    .limit(200)
  q = applyBranch(q, branchId)
  const { data, error } = await q
  const rows = error ? [] : (data || [])
  const p: ResolvedPeriod = { from: '—', to: today, label: `ค้างส่งถึงวันนี้ (${today})` }
  return {
    count: rows.length,
    sample: rows.slice(0, 10).map(r => {
      const j = r as { Job_ID?: string; Customer_Name?: string; Driver_Name?: string; Delivery_Date?: string; Job_Status?: string }
      return { jobId: j.Job_ID, customer: j.Customer_Name, driver: j.Driver_Name, dueDate: j.Delivery_Date, status: j.Job_Status }
    }),
    _provenance: provenance('overdue_deliveries', p, branchId, rows.length),
  }
}
