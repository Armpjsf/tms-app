import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin, isAdmin, getCustomerId } from "@/lib/permissions"
import { todayTH } from "@/lib/utils/date-th"

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
  Pickup_Photo_Url: string | null
  Pickup_Signature_Url: string | null
  Actual_Delivery_Time: string | null
  Delivery_Lat: number | null
  Delivery_Lon: number | null
  Floor_Climb_Url: string | null
}

// ดึงรายการ POD วันนี้
export async function getTodayPODs(): Promise<PODRecord[]> {
  try {
    const isSuper = await isSuperAdmin()
    const isRegularAdmin = await isAdmin()
    const customerId = await getCustomerId()
    const supabase = (isSuper || isRegularAdmin || customerId) ? createAdminClient() : await createClient()
    const today = todayTH()
    
    const branchId = await getUserBranchId()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date, Customer_Name, Driver_Name, Vehicle_Plate, Route_Name, Photo_Proof_Url, Signature_Url, Pickup_Photo_Url, Pickup_Signature_Url, Actual_Delivery_Time, Delivery_Lat, Delivery_Lon, Floor_Climb_Url, Created_At')
      .eq('Plan_Date', today)
      .in('Job_Status', ['Delivered', 'Complete', 'Completed', 'In Transit', 'Picked Up'])

    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    } else if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!(await isAdmin()) && !branchId) {
        return []
    }

    const { data, error } = await dbQuery
      .order('Plan_Date', { ascending: false })
      .order('Created_At', { ascending: false })
    
    if (error) {
      return []
    }
    
    return data || []
  } catch {
    return []
  }
}

// ดึงรายการ POD ทั้งหมด
export async function getAllPODs(page = 1, limit = 50, dateFrom?: string, dateTo?: string, query?: string, customerFilter?: string): Promise<{ data: PODRecord[], count: number }> {
  try {
    const isSuper = await isSuperAdmin()
    const isRegularAdmin = await isAdmin()
    const customerId = await getCustomerId()
    const supabase = (isSuper || isRegularAdmin || customerId) ? createAdminClient() : await createClient()
    const offset = (page - 1) * limit

    const branchId = await getUserBranchId()
    // ลูกค้าที่บังคับกรอง: บัญชีลูกค้าจริง (customerId) มาก่อน; ถ้าเป็นแอดมิน/ซูเปอร์
    // ให้ใช้ค่าที่เลือกจากดรอปดาวน์แถบบน (cookie selectedCustomer ที่ส่งเข้ามา)
    const effectiveCustomer = customerId || (customerFilter && customerFilter !== 'All' ? customerFilter : null)

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date, Customer_Name, Driver_Name, Vehicle_Plate, Route_Name, Photo_Proof_Url, Signature_Url, Pickup_Photo_Url, Pickup_Signature_Url, Actual_Delivery_Time, Delivery_Lat, Delivery_Lon, Floor_Climb_Url, Created_At', { count: 'exact' })
      .in('Job_Status', ['Delivered', 'Complete', 'Completed', 'In Transit', 'Picked Up', 'Assigned', 'New', 'Failed', 'In Progress', 'Pending'])

    if (effectiveCustomer) {
        dbQuery = dbQuery.eq('Customer_ID', effectiveCustomer)
    }

    if (customerId) {
        // บัญชีลูกค้า: กรองด้วย Customer_ID เท่านั้น (ทำไปแล้วด้านบน) ไม่ผูกสาขา
    } else if (isSuper && (!branchId || branchId === 'All')) {
        // No branch filter
    } else if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isSuper && !isRegularAdmin && !branchId) {
        return { data: [], count: 0 }
    }

    if (dateFrom) {
        dbQuery = dbQuery.gte('Plan_Date', dateFrom)
    }
    if (dateTo) {
        dbQuery = dbQuery.lte('Plan_Date', dateTo)
    }
    if (query) {
        dbQuery = dbQuery.or(`Job_ID.ilike.%${query}%,Customer_Name.ilike.%${query}%,Driver_Name.ilike.%${query}%`)
    }

    const { data, error, count } = await dbQuery
      .order('Plan_Date', { ascending: false })
      .order('Created_At', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}


// นับสถิติ POD
export async function getPODStats(dateFrom?: string, dateTo?: string, customerFilter?: string) {
  try {
    const isSuper = await isSuperAdmin()
    const isRegularAdmin = await isAdmin()
    const customerId = await getCustomerId()
    const supabase = (isSuper || isRegularAdmin || customerId) ? createAdminClient() : await createClient()

    const branchId = await getUserBranchId()
    const effectiveCustomer = customerId || (customerFilter && customerFilter !== 'All' ? customerFilter : null)

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_Status, Photo_Proof_Url, Signature_Url')
      .neq('Job_Status', 'Cancelled')

    if (effectiveCustomer) {
        dbQuery = dbQuery.eq('Customer_ID', effectiveCustomer)
    }

    if (customerId) {
        // บัญชีลูกค้า: กรองด้วย Customer_ID เท่านั้น
    } else if (isSuper && (!branchId || branchId === 'All')) {
        // No branch filter for super admin
    } else if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isSuper && !isRegularAdmin && !branchId) {
        return { total: 0, withPhoto: 0, withSignature: 0, complete: 0 }
    }

    // Filter by date if provided
    if (dateFrom && dateFrom.trim() !== '') {
        dbQuery = dbQuery.gte('Plan_Date', dateFrom)
    }
    if (dateTo && dateTo.trim() !== '') {
        dbQuery = dbQuery.lte('Plan_Date', dateTo)
    }

    const { data, error } = await dbQuery
    
    if (error) {
      console.error("Error fetching POD stats:", error)
      return { total: 0, withPhoto: 0, withSignature: 0, complete: 0 }
    }
    
    const jobs = data || []
    return {
      total: jobs.length,
      withPhoto: jobs.filter((j: { Photo_Proof_Url?: string | null, Signature_Url?: string | null, Job_Status?: string | null }) => j.Photo_Proof_Url).length,
      withSignature: jobs.filter((j: { Photo_Proof_Url?: string | null, Signature_Url?: string | null, Job_Status?: string | null }) => j.Signature_Url).length,
      complete: jobs.filter((j: { Photo_Proof_Url?: string | null, Signature_Url?: string | null, Job_Status?: string | null }) => j.Job_Status === 'Delivered' || j.Job_Status === 'Complete' || j.Job_Status === 'Completed').length,
    }
  } catch (err) {
    console.error("POD stats exception:", err)
    return { total: 0, withPhoto: 0, withSignature: 0, complete: 0 }
  }
}

