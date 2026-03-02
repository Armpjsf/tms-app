"use server"

import { createClient } from '@/utils/supabase/server'
import { getLatestDriverLocations } from '@/lib/supabase/gps'
import { getAllDriversFromTable } from '@/lib/supabase/drivers'
import { getUserBranchId } from '@/lib/permissions'

// ============================================================
// AI Auto-Assign Engine — TMS 2026
// คำนวณคะแนนความเหมาะสมของคนขับแต่ละคนต่องาน
// ============================================================

export type DriverSuggestion = {
  Driver_ID: string
  Driver_Name: string
  Vehicle_Plate: string
  Vehicle_Type: string
  Mobile_No: string
  match_score: number        // 0-100 overall match
  distance_km: number | null // distance from pickup point
  distance_score: number     // 0-100
  availability_score: number // 0 or 100
  vehicle_match_score: number // 0 or 100
  performance_score: number  // 0-100
  active_jobs_today: number
  on_time_rate: number       // 0-100%
  last_seen: string | null   // last GPS timestamp
}

// Scoring weights
const WEIGHTS = {
  distance: 0.35,
  availability: 0.25,
  vehicle_match: 0.20,
  performance: 0.20,
}

// ============================================================
// Main: Get Top N Driver Suggestions
// ============================================================
export async function getSuggestedDrivers(jobData: {
  Pickup_Lat?: number | null
  Pickup_Lon?: number | null
  Vehicle_Type?: string | null
  Plan_Date?: string | null
}, topN = 5): Promise<DriverSuggestion[]> {
  try {
    const supabase = await createClient()
    const branchId = await getUserBranchId()

    // 1. Get all active drivers
    const allDrivers = await getAllDriversFromTable()
    const activeDrivers = allDrivers.filter(d =>
      d.Active_Status === 'Active' || !d.Active_Status
    )

    // 2. Get latest GPS locations
    const gpsLocations = await getLatestDriverLocations()
    const gpsMap = new Map<string, { lat: number, lon: number, timestamp: string }>()
    gpsLocations.forEach((loc: any) => {
      gpsMap.set(loc.Driver_ID, {
        lat: loc.Latitude,
        lon: loc.Longitude,
        timestamp: loc.Timestamp
      })
    })

    // 3. Get today's job assignments (for availability check)
    const planDate = jobData.Plan_Date || new Date().toISOString().split('T')[0]
    const { data: todayJobs } = await supabase
      .from('Jobs_Main')
      .select('Driver_ID, Job_Status')
      .eq('Plan_Date', planDate)
      .not('Job_Status', 'in', '("Cancelled","Completed","Delivered")')

    const jobCountMap = new Map<string, number>()
    todayJobs?.forEach(j => {
      if (j.Driver_ID) {
        jobCountMap.set(j.Driver_ID, (jobCountMap.get(j.Driver_ID) || 0) + 1)
      }
    })

    // 4. Get performance stats (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: recentJobs } = await supabase
      .from('Jobs_Main')
      .select('Driver_ID, Job_Status, Plan_Date, Actual_Delivery_Time')
      .gte('Plan_Date', thirtyDaysAgo.toISOString().split('T')[0])
      .in('Job_Status', ['Completed', 'Delivered'])

    const performanceMap = new Map<string, { total: number, onTime: number }>()
    recentJobs?.forEach(j => {
      if (!j.Driver_ID) return
      const stats = performanceMap.get(j.Driver_ID) || { total: 0, onTime: 0 }
      stats.total += 1
      // Consider "on-time" if delivered (simplified heuristic)
      stats.onTime += 1
      performanceMap.set(j.Driver_ID, stats)
    })

    // 5. Score each driver
    const suggestions: DriverSuggestion[] = activeDrivers.map(driver => {
      // Distance Score
      const gps = gpsMap.get(driver.Driver_ID)
      let distanceKm: number | null = null
      let distanceScore = 50 // Default: no GPS data → neutral score

      if (gps && jobData.Pickup_Lat && jobData.Pickup_Lon) {
        distanceKm = haversineKm(gps.lat, gps.lon, jobData.Pickup_Lat, jobData.Pickup_Lon)
        // 0 km → 100, 50+ km → 0 (linear decay)
        distanceScore = Math.max(0, Math.min(100, 100 - (distanceKm * 2)))
      }

      // Availability Score
      const activeJobsToday = jobCountMap.get(driver.Driver_ID) || 0
      const availabilityScore = activeJobsToday === 0 ? 100 : activeJobsToday <= 2 ? 50 : 0

      // Vehicle Match Score
      let vehicleMatchScore = 70 // Default: no preference specified
      if (jobData.Vehicle_Type) {
        vehicleMatchScore = (driver.Vehicle_Type || '').toLowerCase().includes(jobData.Vehicle_Type.toLowerCase()) ? 100 : 0
      }

      // Performance Score
      const perf = performanceMap.get(driver.Driver_ID)
      let performanceScore = 60 // Default: new driver
      let onTimeRate = 0
      if (perf && perf.total > 0) {
        onTimeRate = Math.round((perf.onTime / perf.total) * 100)
        performanceScore = onTimeRate
      }

      // Overall weighted score
      const matchScore = Math.round(
        distanceScore * WEIGHTS.distance +
        availabilityScore * WEIGHTS.availability +
        vehicleMatchScore * WEIGHTS.vehicle_match +
        performanceScore * WEIGHTS.performance
      )

      return {
        Driver_ID: driver.Driver_ID,
        Driver_Name: driver.Driver_Name || 'ไม่ระบุชื่อ',
        Vehicle_Plate: driver.Vehicle_Plate || '-',
        Vehicle_Type: driver.Vehicle_Type || '-',
        Mobile_No: driver.Mobile_No || '',
        match_score: matchScore,
        distance_km: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
        distance_score: Math.round(distanceScore),
        availability_score: availabilityScore,
        vehicle_match_score: vehicleMatchScore,
        performance_score: performanceScore,
        active_jobs_today: activeJobsToday,
        on_time_rate: onTimeRate,
        last_seen: gps?.timestamp || null,
      }
    })

    // Sort by match_score descending, return top N
    suggestions.sort((a, b) => b.match_score - a.match_score)
    return suggestions.slice(0, topN)

  } catch (error) {
    console.error('AI Auto-Assign Error:', error)
    return []
  }
}

// ============================================================
// Haversine Formula — Calculate distance between two GPS points
// ============================================================
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
