"use server"

import { createAdminClient } from "@/lib/supabase/admin"

// 6.4 — เทียบ "แผน vs วิ่งจริง" แบบเงียบ (คนขับไม่ต้องกดอะไร)
// ดึง GPS trail จริงของงาน (gps_logs.job_id) มาเทียบกับจุด/ระยะที่วางแผนไว้
// ใช้แสดงให้แอดมินดูหลังบ้าน — ไม่มี UI ให้คนขับ

export type RouteAdherence = {
  hasGps: boolean
  gpsPoints: number
  actualKm: number | null       // ระยะที่วิ่งจริง (จาก GPS trail)
  plannedKm: number | null      // ระยะที่ประเมินไว้ (Est_Distance_KM)
  deviationPct: number | null   // ต่างจากแผนกี่ %
  stopsTotal: number            // จุดที่วางแผน (ต้นทาง+ปลายทาง)
  stopsVisited: number          // จุดที่ trail วิ่งผ่านใกล้ (<=300m)
  offRoute: boolean             // วิ่งจริงเกินแผน > 30%
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = (bLat - aLat) * Math.PI / 180
  const dLng = (bLng - aLng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

type Pt = { lat: number; lng: number }

function parsePoints(raw: unknown): Pt[] {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(arr)) return []
    return arr
      .map((p: { lat?: unknown; lng?: unknown; lon?: unknown }) => ({
        lat: Number(p?.lat),
        lng: Number(p?.lng ?? p?.lon),
      }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0))
  } catch {
    return []
  }
}

export async function getJobRouteAdherence(jobId: string): Promise<RouteAdherence | null> {
  try {
    const supabase = createAdminClient()

    const { data: job } = await supabase
      .from('Jobs_Main')
      .select('Job_ID, Est_Distance_KM, original_origins_json, original_destinations_json')
      .eq('Job_ID', jobId)
      .single()
    if (!job) return null

    const plannedStops = [
      ...parsePoints(job.original_origins_json),
      ...parsePoints(job.original_destinations_json),
    ]

    const { data: gps } = await supabase
      .from('gps_logs')
      .select('latitude, longitude, timestamp')
      .eq('job_id', jobId)
      .order('timestamp', { ascending: true })

    const trail: Pt[] = (gps || [])
      .map((g: { latitude: number | null; longitude: number | null }) => ({ lat: Number(g.latitude), lng: Number(g.longitude) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0))

    const plannedKm = job.Est_Distance_KM != null ? Number(job.Est_Distance_KM) : null

    if (trail.length < 2) {
      return {
        hasGps: false, gpsPoints: trail.length, actualKm: null, plannedKm,
        deviationPct: null, stopsTotal: plannedStops.length, stopsVisited: 0, offRoute: false,
      }
    }

    // ระยะวิ่งจริง = ผลรวม haversine ของจุดต่อเนื่อง
    let actualKm = 0
    for (let i = 1; i < trail.length; i++) {
      actualKm += haversineKm(trail[i - 1].lat, trail[i - 1].lng, trail[i].lat, trail[i].lng)
    }
    actualKm = Math.round(actualKm * 10) / 10

    // จุดที่วางแผนถูกวิ่งผ่านใกล้ (<= 300 ม.)
    const NEAR_KM = 0.3
    let stopsVisited = 0
    for (const stop of plannedStops) {
      const passed = trail.some(t => haversineKm(stop.lat, stop.lng, t.lat, t.lng) <= NEAR_KM)
      if (passed) stopsVisited++
    }

    const deviationPct = (plannedKm && plannedKm > 0)
      ? Math.round(((actualKm - plannedKm) / plannedKm) * 100)
      : null

    return {
      hasGps: true,
      gpsPoints: trail.length,
      actualKm,
      plannedKm,
      deviationPct,
      stopsTotal: plannedStops.length,
      stopsVisited,
      offRoute: deviationPct != null && deviationPct > 30,
    }
  } catch {
    return null
  }
}
