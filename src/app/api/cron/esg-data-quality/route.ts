import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ESG data-quality monitor (Phase 3 — ongoing completeness evidence).
 *
 * Computes the completeness KPIs a verifier looks for, for a given month:
 *   - jobs with a usable distance (Est_Distance_KM > 0)
 *   - jobs recoverable via coordinates (distance 0 but Pickup coords present)
 *   - "incomplete" jobs that drop out of the carbon calc (no distance, no coords)
 *   - the resulting ESG efficiency rate
 *
 * Run monthly (cron-job.org) and keep the JSON output as an audit record showing
 * data quality was actively monitored — auditors value a tracked KPI over a
 * one-off snapshot.
 *
 * Query params:
 *   ?month=YYYY-MM   (default: current month, Asia/Bangkok)
 * Protected by CRON_SECRET.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function bangkokMonth(): string {
  const now = new Date(Date.now() + 7 * 3600 * 1000) // shift to UTC+7
  return now.toISOString().slice(0, 7)
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const month = (url.searchParams.get('month') || bangkokMonth()).slice(0, 7)
    const start = `${month}-01`
    // First day of next month.
    const [y, m] = month.split('-').map(Number)
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

    const supabase = createClient(supabaseUrl, supabaseKey)
    const head = (build: (q: any) => any) => {
      const q = supabase.from('Jobs_Main').select('*', { count: 'exact', head: true })
        .gte('Plan_Date', start).lt('Plan_Date', next)
      build(q)
      return q.then((r: { count: number | null }) => r.count || 0)
    }

    const [total, withDist, distZeroButCoord, incomplete] = await Promise.all([
      head((q) => q),
      head((q) => q.gt('Est_Distance_KM', 0)),
      head((q) => q.or('Est_Distance_KM.is.null,Est_Distance_KM.eq.0').not('Pickup_Lat', 'is', null)),
      head((q) => q.or('Est_Distance_KM.is.null,Est_Distance_KM.eq.0').is('Pickup_Lat', null)),
    ])

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)
    const efficiencyRate = pct(total - incomplete)

    return NextResponse.json({
      status: 'ok',
      month,
      total_jobs: total,
      distance_present: { count: withDist, pct: pct(withDist) },
      recoverable_by_coords: { count: distZeroButCoord, pct: pct(distZeroButCoord) },
      incomplete: { count: incomplete, pct: pct(incomplete) },
      esg_efficiency_rate: efficiencyRate,
      // A month is verification-ready when nothing is dropped from the calc.
      audit_ready: incomplete === 0,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: (err as Error).message },
      { status: 500 },
    )
  }
}
