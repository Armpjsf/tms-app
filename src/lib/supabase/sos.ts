import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

export type SOSAlert = {
  Job_ID: string
  Job_Status: string
  Plan_Date: string | null
  Driver_ID: string | null
  Driver_Name: string | null
  Vehicle_Plate: string | null
  Route_Name: string | null
  Failed_Reason: string | null
  Failed_Time: string | null
  Delivery_Lat: number | null
  Delivery_Lon: number | null
}

// ดึง SOS Alerts ที่ Active
export async function getActiveSOSAlerts(): Promise<SOSAlert[]> {
  try {
    const supabase = await createClient()
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date, Driver_ID, Driver_Name, Vehicle_Plate, Route_Name, Failed_Reason, Failed_Time, Delivery_Lat, Delivery_Lon')
      .eq('Job_Status', 'SOS')
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data, error } = await dbQuery
      .order('Failed_Time', { ascending: false })
    
    if (error) {
      return []
    }
    
    return data || []
  } catch (e) {
    return []
  }
}

// ดึง SOS ทั้งหมด (รวม resolved)
export async function getAllSOSAlerts(): Promise<SOSAlert[]> {
  try {
    const supabase = await createClient()
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date, Driver_ID, Driver_Name, Vehicle_Plate, Route_Name, Failed_Reason, Failed_Time, Delivery_Lat, Delivery_Lon')
      .in('Job_Status', ['SOS', 'Failed'])
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data, error } = await dbQuery
      .order('Failed_Time', { ascending: false })
      .limit(50)
    
    if (error) {
      return []
    }
    
    return data || []
  } catch (e) {
    return []
  }
}

// นับ SOS Active
export async function getSOSCount(): Promise<number> {
  try {
    const supabase = await createClient()
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*', { count: 'exact', head: true })
      .eq('Job_Status', 'SOS')
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return 0
    }

    const { count, error } = await dbQuery
    
    if (error) {
      return 0
    }
    
    return count || 0
  } catch {
    return 0
  }
}
