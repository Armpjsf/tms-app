import { createClient } from '@/utils/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

export type FuelLog = {
  Log_ID: string
  Date_Time: string | null
  Driver_ID: string | null
  Vehicle_Plate: string | null
  Odometer: number | null
  Liters: number
  Price_Total: number
  Station_Name: string | null
  Photo_Url: string | null
  Branch_ID: string | null
  Status: string | null
  Fuel_Type?: string
  Driver_Name?: string
  Efficiency_Status?: 'Normal' | 'Warning' | 'Critical'
  Capacity_Status?: 'Normal' | 'Overflow'
  Tank_Capacity?: number
}

// ดึงบันทึกเติมน้ำมันวันนี้
export async function getTodayFuelLogs(): Promise<FuelLog[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('Fuel_Logs')
    .select('*')
    .gte('Date_Time', today)
    .order('Date_Time', { ascending: false })
  
  if (error) {
    console.error('Error fetching fuel logs:', error)
    return []
  }
  
  return data || []
}

// Helper to get previous log for efficiency calculation
async function getPreviousLog(supabase: SupabaseClient, vehiclePlate: string, currentDate: string) {
  const { data } = await supabase
    .from('Fuel_Logs')
    .select('Odometer, Liters')
    .eq('Vehicle_Plate', vehiclePlate)
    .lt('Date_Time', currentDate)
    .order('Date_Time', { ascending: false })
    .limit(1)
    .single()
  return data
}

// ดึงบันทึกเติมน้ำมันทั้งหมด (pagination + search + date filter)
export async function getAllFuelLogs(
  page = 1, 
  limit = 20, 
  query = '',
  startDate?: string,
  endDate?: string
): Promise<{ data: (FuelLog & { Km_Per_Liter?: number })[], count: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    
    let dbQuery = supabase
      .from('Fuel_Logs')
      .select('*', { count: 'exact' })
      .order('Date_Time', { ascending: false })

    if (query) {
      dbQuery = dbQuery.or(`Vehicle_Plate.ilike.%${query}%`)
    }

    if (startDate) {
      dbQuery = dbQuery.gte('Date_Time', `${startDate}T00:00:00`)
    }

    if (endDate) {
      dbQuery = dbQuery.lte('Date_Time', `${endDate}T23:59:59`)
    }

    const { data: logs, error, count } = await dbQuery.range(offset, offset + limit - 1)
  
    if (error) {
      console.error('Error fetching fuel logs:', error)
      return { data: [], count: 0 }
    }

    // Fetch Drivers to map names
    const { data: drivers } = await supabase
      .from('Master_Drivers')
      .select('Driver_ID, Driver_Name')
    
    const driverMap = new Map(drivers?.map(d => [d.Driver_ID, d.Driver_Name]) || [])

    // Fetch Vehicles to get Tank Capacity
    const { data: vehicles } = await supabase
        .from('master_vehicles')
        .select('vehicle_plate, tank_capacity')
    
    const vehicleMap = new Map(vehicles?.map(v => [v.vehicle_plate, v.tank_capacity]) || [])

    // Enrich logs with Driver Name, Efficiency, and alerts
    const enrichedLogs = await Promise.all(logs?.map(async (log) => {
      let kmPerLiter = 0
      let efficiencyStatus = 'Normal' // Normal, Warning, Critical
      let capacityStatus = 'Normal'   // Normal, Overflow

      // Check Tank Capacity Overflow
      const tankCapacity = vehicleMap.get(log.Vehicle_Plate) || 50 // Default 50L if missing
      if (log.Liters > tankCapacity * 1.1) { // Allow 10% overflow buffer
          capacityStatus = 'Overflow'
      }

      if (log.Vehicle_Plate && log.Date_Time && log.Odometer && log.Liters) {
         const prevLog = await getPreviousLog(supabase, log.Vehicle_Plate, log.Date_Time)
         if (prevLog && prevLog.Odometer) {
            const distance = log.Odometer - prevLog.Odometer
            if (distance > 0 && log.Liters > 0) {
                kmPerLiter = distance / log.Liters
                
                // Efficiency Alerts
                // Truck (4-wheel) avg 8-12 km/l. 
                // Large truck 2-5 km/l.
                // For now, use simple threshold < 5 is Critical, < 8 is Warning
                if (kmPerLiter < 5) efficiencyStatus = 'Critical'
                else if (kmPerLiter < 8) efficiencyStatus = 'Warning'
            }
         }
      }

      return {
        ...log,
        Driver_Name: driverMap.get(log.Driver_ID) || 'Unknown',
        Km_Per_Liter: kmPerLiter,
        Efficiency_Status: efficiencyStatus,
        Capacity_Status: capacityStatus,
        Tank_Capacity: tankCapacity
      }
    }) || [])
  
    return { data: enrichedLogs, count: count || 0 }
  } catch (e) {
    console.error('Exception fetching fuel logs:', e)
    return { data: [], count: 0 }
  }
}

// นับสถิติน้ำมันวันนี้
export async function getTodayFuelStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('Fuel_Logs')
    .select('Liters, Price_Total')
    .gte('Date_Time', today)
  
  if (error) {
    console.error('Error fetching fuel stats:', error)
    return { totalLiters: 0, totalAmount: 0, count: 0 }
  }
  
  const logs = data || []
  return {
    totalLiters: logs.reduce((sum, l) => sum + (l.Liters || 0), 0),
    totalAmount: logs.reduce((sum, l) => sum + (l.Price_Total || 0), 0),
    count: logs.length,
  }
}
