"use server"

import { createClient } from '@/utils/supabase/server'

// Type matching actual Supabase schema (ProperCase columns!)
export type GPSLog = {
  Log_ID: string
  Driver_ID: string
  Vehicle_Plate?: string
  Latitude: number
  Longitude: number
  Timestamp: string
  Job_ID?: string
  Battery_Level?: number
  Speed?: number
}

// บันทึกพิกัด GPS
export async function saveGPSLog(data: {
  driverId: string
  vehiclePlate?: string
  lat: number
  lng: number
  jobId?: string
  battery?: number
  speed?: number
}) {
  try {
    const supabase = await createClient()
    
    // Note: GPS_Logs table uses lowercase column names
    const { error } = await supabase
      .from('gps_logs') // Use lowercase table name if possible, or verify match
      .insert({
        driver_id: data.driverId,
        vehicle_plate: data.vehiclePlate,
        latitude: data.lat,
        longitude: data.lng,
        job_id: data.jobId,
        battery_level: data.battery,
        speed: data.speed,
        // timestamp is auto-generated
      })

    if (error) {
      console.error('Error saving GPS log:', JSON.stringify(error))
      return { success: false, error }
    }

    return { success: true }
  } catch (e) {
    console.error('Exception saving GPS log:', e)
    return { success: false, error: e }
  }
}

// ดึงตำแหน่งล่าสุดของ Driver ทุกคน (สำหรับแสดงบน Map)
export async function getLatestDriverLocations() {
  try {
    const supabase = await createClient()

    // ดึงข้อมูล GPS ย้อนหลัง 1 ชั่วโมง
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('gps_logs')
      .select(`
        *,
        Master_Drivers ( Driver_Name )
      `)
      .gte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false })

    if (error) {
       console.error('Error fetching GPS logs:', JSON.stringify(error))
       return []
    }

    // Filter ให้เหลือเฉพาะ records ล่าสุดของแต่ละ Driver
    const latestLocations = new Map<string, any>()
    
    data?.forEach((log) => {
        const driverId = log.driver_id || log.Driver_ID
        if (!latestLocations.has(driverId)) {
            latestLocations.set(driverId, {
              ...log,
              Driver_ID: driverId,
              Driver_Name: log.Master_Drivers?.Driver_Name || 'Unknown Driver',
              Latitude: log.latitude || log.Latitude,
              Longitude: log.longitude || log.Longitude,
              Timestamp: log.timestamp || log.Timestamp
            })
        }
    })

    return Array.from(latestLocations.values())

  } catch (e) {
    console.error('Exception fetching driver locations:', e)
    return []
  }
}

// ดึงประวัติการเดินทางของ Driver ตามวันที่ (สำหรับแสดงเส้นทาง)
export async function getDriverRouteForDate(driverId: string, date: string) {
  try {
    const supabase = await createClient()

    // Create Start and End timestamps for the day
    const startDate = `${date}T00:00:00`
    const endDate = `${date}T23:59:59`

    const { data, error } = await supabase
      .from('gps_logs')
      .select('*') // select * to be safe with casing
      .eq('driver_id', driverId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Error fetching driver route:', JSON.stringify(error))
      return []
    }

    // Normalize data
    return data?.map(d => ({
        Latitude: d.latitude || d.Latitude,
        Longitude: d.longitude || d.Longitude,
        Timestamp: d.timestamp || d.Timestamp
    })) || []
  } catch (e) {
    console.error('Exception fetching driver route:', e)
    return []
  }
}

// ... (skipping getLatestDriverLocations rework for now as it's less critical than fleet status)

// ... (previous code)

export async function getFleetGPSStatus() {
  try {
    const supabase = await createClient()

    // 1. Get all drivers
    const { data: drivers, error: driverError } = await supabase
      .from('Master_Drivers')
      .select('Driver_ID, Driver_Name, Vehicle_Plate')
      // .eq('Active_Status', 'Active') 

    if (driverError) throw driverError

    // 2. Fetch latest log for EACH driver efficiently (Parallel)
    // This avoids fetching 1000s of logs and prevents "Failed to fetch" due to payload size
    const driversWithLocation = await Promise.all(drivers.map(async (driver) => {
        const { data: logs } = await supabase
            .from('gps_logs')
            .select('*')
            .eq('driver_id', driver.Driver_ID)
            .order('timestamp', { ascending: false })
            .limit(1)
        
        const log = logs?.[0]
        
        return {
            Driver_ID: driver.Driver_ID,
            Driver_Name: driver.Driver_Name || 'Unknown',
            Vehicle_Plate: driver.Vehicle_Plate || '-',
            Last_Update: log?.timestamp || log?.Timestamp || null, 
            Latitude: log?.latitude || log?.Latitude || null,
            Longitude: log?.longitude || log?.Longitude || null
        }
    }))

    return driversWithLocation

  } catch (e) {
    console.error('Error fetching fleet status:', e)
    return []
  }
}
