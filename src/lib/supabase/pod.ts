import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

export type PODRecord = {
  Job_ID: string
  Job_Status: string
  Plan_Date: string | null
  Customer_Name: string | null
  Driver_Name: string | null
  Vehicle_Plate: string | null
  Route_Name: string | null
  Photo_Proof_Url: string | null
  Signature_Url: string | null
  Actual_Delivery_Time: string | null
  Delivery_Lat: number | null
  Delivery_Lon: number | null
}

// ดึงรายการ POD วันนี้
export async function getTodayPODs(): Promise<PODRecord[]> {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date, Customer_Name, Driver_Name, Vehicle_Plate, Route_Name, Photo_Proof_Url, Signature_Url, Actual_Delivery_Time, Delivery_Lat, Delivery_Lon')
      .eq('Plan_Date', today)
      .in('Job_Status', ['Delivered', 'Complete', 'In Transit', 'Picked Up'])

    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data, error } = await dbQuery
      .order('Actual_Delivery_Time', { ascending: false })
    
    if (error) {
      console.error('Error fetching PODs:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching PODs:', e)
    return []
  }
}

// ดึงรายการ POD ทั้งหมด
export async function getAllPODs(page = 1, limit = 50): Promise<{ data: PODRecord[], count: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date, Customer_Name, Driver_Name, Vehicle_Plate, Route_Name, Photo_Proof_Url, Signature_Url, Actual_Delivery_Time, Delivery_Lat, Delivery_Lon', { count: 'exact' })
      .in('Job_Status', ['Delivered', 'Complete', 'Completed', 'In Transit', 'Picked Up', 'Assigned', 'New', 'Failed'])
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { data: [], count: 0 }
    }

    const { data, error, count } = await dbQuery
      .order('Plan_Date', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching all PODs:', JSON.stringify(error))
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch (e) {
    console.error('Exception fetching all PODs:', e)
    return { data: [], count: 0 }
  }
}

// นับสถิติ POD
export async function getPODStats() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_Status, Photo_Proof_Url, Signature_Url')
      .eq('Plan_Date', today)
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { total: 0, withPhoto: 0, withSignature: 0, complete: 0 }
    }

    const { data, error } = await dbQuery
    
    if (error) {
      console.error('Error fetching POD stats:', JSON.stringify(error))
      return { total: 0, withPhoto: 0, withSignature: 0, complete: 0 }
    }
    
    const jobs = data || []
    return {
      total: jobs.length,
      withPhoto: jobs.filter(j => j.Photo_Proof_Url).length,
      withSignature: jobs.filter(j => j.Signature_Url).length,
      complete: jobs.filter(j => j.Job_Status === 'Delivered' || j.Job_Status === 'Complete').length,
    }
  } catch (e) {
    console.error('Exception fetching POD stats:', e)
    return { total: 0, withPhoto: 0, withSignature: 0, complete: 0 }
  }
}
