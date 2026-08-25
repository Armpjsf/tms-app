import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Self-heal cron (ESG forward-correctness — Phase 1, Fix 3).
 *
 * Jobs sometimes get saved with a location NAME but null Pickup/Delivery
 * coordinates (e.g. created before the location was geocoded, or via a path that
 * didn't hydrate coords). Once Master_Locations holds coordinates for that name,
 * this job back-fills them onto the job rows so the ESG carbon calculation can
 * count the trip instead of flagging it "incomplete".
 *
 * Coord-only: distance itself is recovered by the ESG reader's Haversine
 * fallback once coordinates are present, so no OSRM calls are made here.
 *
 * Protected by CRON_SECRET. Bounded to a recent window to stay cheap.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Only heal jobs created within this window — older jobs predate the ESG effort
// and are intentionally left as-is.
const WINDOW_DAYS = 120

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const since = new Date()
    since.setDate(since.getDate() - WINDOW_DAYS)
    const sinceStr = since.toISOString()

    // Recent jobs that still lack pickup/delivery coords but do carry a name.
    const { data: jobs, error: fetchErr } = await supabase
      .from('Jobs_Main')
      .select('Job_ID, Origin_Location, Dest_Location, Pickup_Lat, Pickup_Lon, Delivery_Lat, Delivery_Lon')
      .gte('Created_At', sinceStr)
      .or('Pickup_Lat.is.null,Delivery_Lat.is.null')
      .limit(5000)

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ status: 'ok', scanned: 0, healed: 0 })
    }

    // Build a name → coordinate map from the fully-geocoded location master.
    const { data: locs, error: locErr } = await supabase
      .from('Master_Locations')
      .select('Name, Lat, Lon')
    if (locErr) {
      return NextResponse.json({ error: locErr.message }, { status: 500 })
    }
    const hasCoord = (lat: unknown, lon: unknown) =>
      Number(lat) !== 0 && !Number.isNaN(Number(lat)) &&
      Number(lon) !== 0 && !Number.isNaN(Number(lon))
    const byName = new Map<string, { lat: number; lon: number }>()
    for (const l of locs || []) {
      const key = String(l.Name || '').trim().toLowerCase()
      if (key && hasCoord(l.Lat, l.Lon)) byName.set(key, { lat: Number(l.Lat), lon: Number(l.Lon) })
    }

    const lookup = (n: unknown) => byName.get(String(n ?? '').trim().toLowerCase())

    let healed = 0
    const errors: { jobId: string; error: string }[] = []

    for (const job of jobs) {
      const update: Record<string, number> = {}

      if (!hasCoord(job.Pickup_Lat, job.Pickup_Lon)) {
        const hit = lookup(job.Origin_Location)
        if (hit) { update.Pickup_Lat = hit.lat; update.Pickup_Lon = hit.lon }
      }
      if (!hasCoord(job.Delivery_Lat, job.Delivery_Lon)) {
        const hit = lookup(job.Dest_Location)
        if (hit) { update.Delivery_Lat = hit.lat; update.Delivery_Lon = hit.lon }
      }

      if (Object.keys(update).length > 0) {
        const { error: upErr } = await supabase
          .from('Jobs_Main')
          .update(update)
          .eq('Job_ID', job.Job_ID)
        if (upErr) errors.push({ jobId: job.Job_ID, error: upErr.message })
        else healed++
      }
    }

    return NextResponse.json({
      status: 'ok',
      window_days: WINDOW_DAYS,
      scanned: jobs.length,
      healed,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: (err as Error).message },
      { status: 500 },
    )
  }
}
