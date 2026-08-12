"use client"

// Direct-to-Supabase GPS ingestion (Plan B).
//
// The mobile app buffers positions and flushes them straight into Supabase with
// the public anon key — this path never touches Vercel, so we can sample as
// densely as a hardware GPS box without blowing serverless invocation limits.
// Writes are allowed by the "anon_insert_gps_logs" / "anon_*_latest_loc" RLS
// policies (see scripts/gps_direct_write_rls.sql); a DB trigger rejects any
// unknown driver_id so a leaked anon key can't spray garbage into the trail.

import { createClient } from "@/utils/supabase/client"

export type GpsPoint = {
  lat: number
  lng: number
  speed?: number
  ts: string // ISO timestamp of the fix
}

// One browser client for the whole session.
let _sb: ReturnType<typeof createClient> | null = null
function sb() {
  if (!_sb) _sb = createClient()
  return _sb
}

/**
 * Bulk-insert a batch of GPS points and refresh the driver's latest position.
 * Returns true on success. Best-effort: the latest-location upsert failing does
 * not fail the whole flush (the trail rows are what matter most).
 */
export async function flushGpsBatch(
  driverId: string,
  jobId: string | null,
  points: GpsPoint[],
): Promise<boolean> {
  if (!driverId || points.length === 0) return true

  const rows = points.map((p) => ({
    driver_id: driverId,
    latitude: p.lat,
    longitude: p.lng,
    speed: p.speed ?? 0,
    job_id: jobId,
    timestamp: p.ts,
  }))

  const { error } = await sb().from("gps_logs").insert(rows)
  if (error) {
    console.error("[GPS direct] batch insert failed:", error.message)
    return false
  }

  // Keep the live-map's "latest position" table current (newest point wins).
  const last = points[points.length - 1]
  const nowIso = new Date().toISOString()
  const { error: latestErr } = await sb()
    .from("driver_latest_locations")
    .upsert(
      {
        driver_id: driverId,
        latitude: last.lat,
        longitude: last.lng,
        speed: last.speed ?? 0,
        job_id: jobId,
        timestamp: last.ts,
        updated_at: nowIso,
      },
      { onConflict: "driver_id" },
    )
  if (latestErr) console.error("[GPS direct] latest upsert failed:", latestErr.message)

  return true
}
