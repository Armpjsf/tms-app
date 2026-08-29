"use server"

import { createAdminClient } from '@/utils/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"
import { cookies } from "next/headers"
import { todayTH } from "@/lib/utils/date-th"

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
export async function getTodayFuelLogs(providedBranchId?: string): Promise<FuelLog[]> {
  try {
    const supabase = createAdminClient()
    const today = todayTH()
    
    const isSuper = await isSuperAdmin()
    const userBranchId = await getUserBranchId()
    const cookieStore = await cookies()
    const selectedBranch = cookieStore.get('selectedBranch')?.value
    const branchId = isSuper ? (providedBranchId || selectedBranch || userBranchId) : userBranchId

    let query = supabase
      .from('Fuel_Logs')
      .select('*')
      .gte('Date_Time', today)
    
    if (branchId && branchId !== 'All') {
      query = query.eq('Branch_ID', branchId)
    }

    const { data, error } = await query
      .order('Date_Time', { ascending: false })
    
    if (error) {
      return []
    }
    
    return data || []
  } catch {
    return []
  }
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
    .maybeSingle()
  return data
}

// ดึงบันทึกเติมน้ำมันทั้งหมด (pagination + search + date filter + vehicle filter + branch filter)
export async function getAllFuelLogs(
  page = 1, 
  limit = 20, 
  query = '',
  startDate?: string,
  endDate?: string,
  selectedVehicles?: string[],
  providedBranchId?: string
): Promise<{ data: (FuelLog & { Km_Per_Liter?: number; Price_Per_Liter?: number; Delta_Km?: number })[], count: number }> {
  try {
    const supabase = createAdminClient()
    const offset = (page - 1) * limit
    
    const isSuper = await isSuperAdmin()
    const userBranchId = await getUserBranchId()
    const cookieStore = await cookies()
    const selectedBranch = cookieStore.get('selectedBranch')?.value
    const branchId = isSuper ? (providedBranchId || selectedBranch || userBranchId) : (userBranchId || providedBranchId)

    let dbQuery = supabase
      .from('Fuel_Logs')
      .select('*', { count: 'exact' })
    
    if (branchId && branchId !== 'All') {
      dbQuery = dbQuery.eq('Branch_ID', branchId)
    }

    dbQuery = dbQuery.order('Date_Time', { ascending: false })

    if (query) {
      dbQuery = dbQuery.or(`Vehicle_Plate.ilike.%${query}%,Station_Name.ilike.%${query}%`)
    }

    if (selectedVehicles && selectedVehicles.length > 0) {
      dbQuery = dbQuery.in('Vehicle_Plate', selectedVehicles)
    }

    if (startDate) {
      dbQuery = dbQuery.gte('Date_Time', `${startDate}T00:00:00`)
    }

    if (endDate) {
      dbQuery = dbQuery.lte('Date_Time', `${endDate}T23:59:59`)
    }

    const { data: logs, error, count } = await dbQuery.range(offset, offset + limit - 1)
  
    if (error) {
      console.error("[getAllFuelLogs] Supabase query error:", error)
      return { data: [], count: 0 }
    }

    // Fetch Drivers to map names
    const { data: drivers } = await supabase
      .from('Master_Drivers')
      .select('Driver_ID, Driver_Name')
    
    const driverMap = new Map(drivers?.map(d => [d.Driver_ID, d.Driver_Name]) || [])

    // Fetch Vehicles to get Tank Capacity
    const { data: vehicles } = await supabase
        .from('Master_Vehicles')
        .select('Vehicle_Plate, Tank_Capacity')
    
    const vehicleMap = new Map(vehicles?.map(v => [v.Vehicle_Plate, v.Tank_Capacity]) || [])

    // Enrich logs with Driver Name, Efficiency, Price_Per_Liter, Delta_Km, and alerts
    const enrichedLogs = await Promise.all(logs?.map(async (log) => {
      let kmPerLiter = 0
      let deltaKm = 0
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
                deltaKm = distance
                kmPerLiter = +(distance / log.Liters).toFixed(2)
                
                // Efficiency Alerts
                if (kmPerLiter < 5) efficiencyStatus = 'Critical'
                else if (kmPerLiter < 8) efficiencyStatus = 'Warning'
            }
         }
      }

      const pricePerLiter = (log.Price_Total && log.Liters && log.Liters > 0)
        ? +(log.Price_Total / log.Liters).toFixed(2)
        : 0

      return {
        ...log,
        Driver_Name: driverMap.get(log.Driver_ID) || 'ไม่ระบุคนขับ',
        Price_Per_Liter: pricePerLiter,
        Delta_Km: deltaKm,
        Km_Per_Liter: kmPerLiter,
        Efficiency_Status: efficiencyStatus,
        Capacity_Status: capacityStatus,
        Tank_Capacity: tankCapacity
      }
    }) || [])
  
    return { data: enrichedLogs, count: count || 0 }
  } catch (e) {
    console.error("[getAllFuelLogs] Exception:", e)
    return { data: [], count: 0 }
  }
}

// ดึงบิลน้ำมันจริงของรถคันหนึ่ง สำหรับจับคู่กับเหตุการณ์เติมจาก GPS (DTC)
export type FuelBillForMatch = {
  Log_ID: string
  Date_Time: string | null
  Odometer: number | null
  Liters: number
  Price_Total: number
  Station_Name: string | null
}
export async function getFuelBillsForMatching(vehiclePlate: string, providedBranchId?: string): Promise<FuelBillForMatch[]> {
  try {
    if (!vehiclePlate) return []
    const supabase = createAdminClient()
    const isSuper = await isSuperAdmin()
    const userBranchId = await getUserBranchId()
    const cookieStore = await cookies()
    const selectedBranch = cookieStore.get('selectedBranch')?.value
    const branchId = isSuper ? (providedBranchId || selectedBranch || userBranchId) : userBranchId

    let query = supabase
      .from('Fuel_Logs')
      .select('Log_ID, Date_Time, Odometer, Liters, Price_Total, Station_Name')
      .eq('Vehicle_Plate', vehiclePlate)
      .order('Date_Time', { ascending: true })

    if (branchId && branchId !== 'All') {
      query = query.eq('Branch_ID', branchId)
    }

    const { data, error } = await query
    if (error) return []
    return (data || []) as FuelBillForMatch[]
  } catch {
    return []
  }
}

// นับสถิติน้ำมันวันนี้
export async function getTodayFuelStats(providedBranchId?: string) {
  try {
    const supabase = createAdminClient()
    const today = todayTH()
    
    const isSuper = await isSuperAdmin()
    const userBranchId = await getUserBranchId()
    const cookieStore = await cookies()
    const selectedBranch = cookieStore.get('selectedBranch')?.value
    const branchId = isSuper ? (providedBranchId || selectedBranch || userBranchId) : userBranchId

    let query = supabase
      .from('Fuel_Logs')
      .select('Liters, Price_Total')
      .gte('Date_Time', today)
    
    if (branchId && branchId !== 'All') {
      query = query.eq('Branch_ID', branchId)
    }

    const { data, error } = await query
    
    if (error) {
      return { totalLiters: 0, totalAmount: 0, count: 0 }
    }
    
    const logs = data || []
    return {
      totalLiters: logs.reduce((sum, l) => sum + (l.Liters || 0), 0),
      totalAmount: logs.reduce((sum, l) => sum + (l.Price_Total || 0), 0),
      count: logs.length,
    }
  } catch {
    return { totalLiters: 0, totalAmount: 0, count: 0 }
  }
}
