import { createClient } from '@/utils/supabase/server'

export type GPSData = {
  Driver_ID: string
  Driver_Name: string
  Vehicle_Plate: string | null
  Current_Lat: number | null
  Current_Lon: number | null
  Last_Update: string | null
  Active_Status: string | null
}

// ดึงตำแหน่ง GPS ของคนขับทั้งหมด
export async function getAllGPSData(): Promise<GPSData[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('Driver_ID, Driver_Name, Vehicle_Plate, Current_Lat, Current_Lon, Last_Update, Active_Status')
      .eq('Active_Status', 'Active')
    
    if (error) {
      console.error('Error fetching GPS data:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching GPS data:', e)
    return []
  }
}

// นับสถิติ GPS
export async function getGPSStats() {
  try {
    const supabase = await createClient()
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('Current_Lat, Current_Lon, Last_Update, Active_Status')
      .eq('Active_Status', 'Active')
    
    if (error) {
      console.error('Error fetching GPS stats:', JSON.stringify(error))
      return { total: 0, online: 0, offline: 0 }
    }
    
    const drivers = data || []
    const online = drivers.filter(d => d.Last_Update && d.Last_Update > fiveMinutesAgo).length
    
    return {
      total: drivers.length,
      online,
      offline: drivers.length - online,
    }
  } catch (e) {
    console.error('Exception fetching GPS stats:', e)
    return { total: 0, online: 0, offline: 0 }
  }
}
