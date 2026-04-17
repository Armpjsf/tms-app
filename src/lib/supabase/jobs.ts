"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { logActivity } from '@/lib/supabase/logs'
import { getDriverSession } from '@/lib/actions/auth-actions'
import { getUserBranchId, isSuperAdmin, getCustomerId } from "@/lib/permissions"
 
export type JobAssignment = {
  Vehicle_Type: string
  Vehicle_Plate: string
  Driver_ID: string
  Sub_ID?: string
  Show_Price_To_Driver?: boolean
  Cost_Driver_Total?: number
  Price_Cust_Total?: number
  Branch_ID?: string
}

export type Job = {
  Job_ID: string
  Job_Status: string
  Plan_Date: string | null
  Pickup_Date?: string | null
  Delivery_Date: string | null
  Customer_ID: string | null
  Customer_Name: string | null
  Route_Name: string | null
  Driver_ID: string | null
  Driver_Name: string | null
  Vehicle_Plate: string | null
  Vehicle_Type: string | null
  Origin_Location: string | null
  Dest_Location: string | null
  Total_Drop: number | null
  Price_Cust_Total: number
  Cost_Driver_Total: number
  Price_Cust_Extra?: number | null
  Cost_Driver_Extra?: number | null
  Cargo_Type: string | null
  Notes: string | null
  original_origins_json: string | null
  original_destinations_json: string | null
  extra_costs_json: string | null
  origins?: unknown
  destinations?: unknown
  extra_costs?: unknown
  assignments?: JobAssignment[]
  Created_At: string | null
  Photo_Proof_Url: string | null
  Signature_Url: string | null
  Pickup_Photo_Url: string | null
  Pickup_Signature_Url: string | null
  Sub_ID: string | null
  Show_Price_To_Driver: boolean
  Weight_Kg?: number | null
  Volume_Cbm?: number | null
  Zone?: string | null
  Invoice_ID?: string | null
  Billing_Note_ID?: string | null
  Driver_Payment_ID?: string | null
  Pickup_Lat?: number | null
  Pickup_Lon?: number | null
  Delivery_Lat?: number | null
  Delivery_Lon?: number | null
  Branch_ID?: string | null
  Est_Distance_KM?: number | null
  Verification_Status?: 'Pending' | 'Verified' | 'Rejected' | null
  Verification_Note?: string | null
  Verified_By?: string | null
  Verified_At?: string | null
  Loaded_Qty?: number | null
  Price_Per_Unit?: number | null
  Billing_Notes?: {
    Status: string
  } | null
}

// Removed duplicate definition

// ดึงงานทั้งหมดวันนี้

export async function getTodayJobs(): Promise<Job[]> {
  try {
    const isAdmin = await isSuperAdmin()
    const branchId = await getUserBranchId()
    const customerId = await getCustomerId()
    const supabase = (isAdmin || customerId) ? await createAdminClient() : await createClient()
    
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    
    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Plan_Date', today)
    
    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    } else if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data } = await dbQuery
      .order('Created_At', { ascending: false })
    
    if (data === null) {
      return []
    }
    
    return data || []
  } catch {
    return []
  }
}

// ดึงงานตามสถานะ
export async function getJobsByStatus(status: string): Promise<Job[]> {
  try {
    const isAdmin = await isSuperAdmin()
    const branchId = await getUserBranchId()
    const customerId = await getCustomerId()
    const supabase = (isAdmin || customerId) ? await createAdminClient() : await createClient()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Job_Status', status)
    
    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    } else if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data } = await dbQuery
      .order('Created_At', { ascending: false })
      .limit(100)
    
    if (data === null) {
      return []
    }
    
    return data || []
  } catch {
    return []
  }
}

// ดึงงานทั้งหมด (pagination + search + status filter)
export async function getAllJobs(
  page = 1, 
  limit = 50, 
  query = '',
  status = '', // Add status parameter
  startDate = '', // Add startDate parameter
  endDate = '' // Add endDate parameter
): Promise<{ data: Job[], count: number }> {
  try {
    const isAdmin = await isSuperAdmin()
    const branchId = await getUserBranchId()
    const customerId = await getCustomerId()
    const supabase = (isAdmin || customerId) ? await createAdminClient() : await createClient()
    
    const offset = (page - 1) * limit
    
    let dbQuery = supabase
      .from('Jobs_Main')
      .select(`
        *,
        Billing_Notes!Billing_Note_ID(Status)
      `, { count: 'exact' })
    
    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    } else if (isAdmin && (!branchId || branchId === 'All')) {
        // No filter
    } else if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { data: [], count: 0 }
    }

    if (startDate) {
      dbQuery = dbQuery.gte('Plan_Date', startDate)
    }
    if (endDate) {
      dbQuery = dbQuery.lte('Plan_Date', endDate)
    }

    dbQuery = dbQuery
      .order('Plan_Date', { ascending: false })
      .order('Created_At', { ascending: false })

    if (query) {
      dbQuery = dbQuery.or(`Job_ID.ilike.%${query}%,Customer_Name.ilike.%${query}%,Route_Name.ilike.%${query}%`)
    }

    if (status) {
      dbQuery = dbQuery.eq('Job_Status', status)
    }

    const { data, count } = await dbQuery.range(offset, offset + limit - 1)
    
    if (data === null) {
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}

// นับสถิติงานตามช่วงเวลา (Default: วันนี้)
export async function getTodayJobStats(branchId?: string, startDate?: string, endDate?: string) {
  try {
    const isAdmin = await isSuperAdmin()
    const userBranchId = await getUserBranchId()
    const customerId = await getCustomerId()
    const supabase = (isAdmin || customerId) ? await createAdminClient() : await createClient()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    
    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_Status')

    if (startDate && endDate) {
        dbQuery = dbQuery.gte('Plan_Date', startDate).lte('Plan_Date', endDate)
    } else {
        dbQuery = dbQuery.eq('Plan_Date', today)
    }

    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    } else {
        const effectiveBranchId = branchId || userBranchId
        if (effectiveBranchId && effectiveBranchId !== 'All') {
            dbQuery = dbQuery.eq('Branch_ID', effectiveBranchId)
        } else if (!isAdmin && !userBranchId) {
            return { total: 0, delivered: 0, inProgress: 0, pending: 0 }
        }
    }
    
    const { data } = await dbQuery
    
    if (data === null) {
      return { total: 0, delivered: 0, inProgress: 0, pending: 0 }
    }
    
    const jobs = data || []
    return {
      total: jobs.length,
      delivered: jobs.filter(j => j.Job_Status === 'Delivered' || j.Job_Status === 'Completed').length,
      inProgress: jobs.filter(j => j.Job_Status === 'In Transit' || j.Job_Status === 'In Progress' || j.Job_Status === 'Arrived Pickup' || j.Job_Status === 'Arrived Dropoff').length,
      pending: jobs.filter(j => j.Job_Status === 'New' || j.Job_Status === 'Assigned' || j.Job_Status === 'Requested' || j.Job_Status === 'Pending').length,
      sos: jobs.filter(j => j.Job_Status === 'SOS').length
    }
  } catch {
    return { total: 0, delivered: 0, inProgress: 0, pending: 0 }
  }
}

// ยอดเงินวันนี้ (Estimated)
export async function getTodayFinancials(branchId?: string) {
  try {
    const isAdmin = await isSuperAdmin()
    const userBranchId = await getUserBranchId()
    const customerId = await getCustomerId()
    const supabase = (isAdmin || customerId) ? await createAdminClient() : await createClient()
    const today = new Date().toISOString().split('T')[0]

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Price_Cust_Total')
      .eq('Plan_Date', today)

    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    } else {
        const effectiveBranchId = branchId || userBranchId
        if (effectiveBranchId && effectiveBranchId !== 'All') {
            dbQuery = dbQuery.eq('Branch_ID', effectiveBranchId)
        } else if (!isAdmin && !userBranchId) {
            return { revenue: 0 }
        }
    }

    const { data } = await dbQuery
      .neq('Job_Status', 'Cancelled') // Exclude cancelled jobs
    
    if (!data) return { revenue: 0 }

    const revenue = data.reduce((sum, job) => sum + (job.Price_Cust_Total || 0), 0) || 0
    return { revenue }
  } catch {
    return { revenue: 0 }
  }
}

// ดึงงานของ Driver เฉพาะคน
// ดึงงานของ Driver เฉพาะคน
// ดึงงานของ Driver เฉพาะคน (รองรับ Filter)
export async function getDriverJobs(
  driverId: string, 
  options: { startDate?: string, endDate?: string, status?: string } = {}
): Promise<Job[]> {
  try {
    // USE admin client for driver-specific queries to bypass RLS 
    // since drivers use custom cookie auth, not Supabase Auth
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    const supabase = createAdminClient()
    
    let query = supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Driver_ID', driverId)

    // Only apply branch filter if it's NOT a driver (Admin/Staff must see their branch)
    // Driver should see jobs assigned to them regardless of their profile branch_id
    if (branchId && branchId !== 'All' && !driverId) {
        query = query.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId && !driverId) {
        return []
    }

    if (options.startDate) {
        query = query.gte('Plan_Date', options.startDate)
    } else {
        const past = new Date()
        past.setDate(past.getDate() - 15)
        query = query.gte('Plan_Date', past.toISOString().split('T')[0])
    }

    if (options.endDate) {
        query = query.lte('Plan_Date', options.endDate)
    } else {
        const future = new Date()
        future.setDate(future.getDate() + 15)
        query = query.lte('Plan_Date', future.toISOString().split('T')[0])
    }

    if (options.status && options.status !== 'All') {
        query = query.eq('Job_Status', options.status)
    }

    const { data } = await query
      .order('Plan_Date', { ascending: false })
      .order('Created_At', { ascending: false })
      .limit(100)
    
    if (data === null) {
      return []
    }
    
    return data || []
  } catch {
    return []
  }
}

// ดึงรายละเอียดงาน By ID
export async function getJobById(jobId: string): Promise<Job | null> {
    try {
        const driverSession = await getDriverSession()
        const isAdmin = await isSuperAdmin()
        const branchId = await getUserBranchId()
        const customerId = await getCustomerId()
        
        // Use admin client if it's a driver or super admin
        const supabase = (isAdmin || driverSession) ? createAdminClient() : await createClient()

        // 1. SIMPLE CORE FETCH
        // We use select('*') first to rule out any join syntax errors
        const baseQuery = supabase
            .from('Jobs_Main')
            .select('*')
            .eq('Job_ID', jobId)
        
        // Apply Filters
        if (isAdmin) {
            // Admin sees all
        } else if (customerId) {
            baseQuery.eq('Customer_ID', customerId)
        } else if (driverSession) {
            // DRIVER: Allow if assigned to this driver OR if the job is unassigned (Marketplace/Draft)
            // This is safer and more flexible for drivers opening links
            baseQuery.or(`Driver_ID.eq.${driverSession.driverId},Driver_ID.is.null`)
        } else if (branchId && branchId !== 'All') {
            baseQuery.eq('Branch_ID', branchId)
        } else if (!branchId) {
            // If No session and No branch and Not Admin, return null
            return null
        }

        const { data, error: fetchError } = await baseQuery.single()
        
        if (!data || fetchError) {
            // Second chance: If not found and is admin, try finding strictly by ID (Branch override)
            if (isAdmin) {
                const { data: adminData } = await supabase
                    .from('Jobs_Main')
                    .select('*')
                    .eq('Job_ID', jobId)
                    .single()
                
                if (adminData) return await enrichJobWithCustomerData(adminData as Job)
            }
            return null
        }

        // 2. SECONDARY ENRICHMENT
        return await enrichJobWithCustomerData(data as Job)
    } catch (e) {
        console.error('[getJobById ERROR]', e)
        return null
    }
}

async function enrichJobWithCustomerData(job: Job): Promise<Job> {
    if (!job.Customer_ID) return job
    
    try {
        const supabase = createAdminClient()
        const { data: customer } = await supabase
            .from('Master_Customers')
            .select('Price_Per_Unit')
            .eq('Customer_ID', job.Customer_ID)
            .single()
        
        return {
            ...job,
            Price_Per_Unit: customer?.Price_Per_Unit || 0
        }
    } catch {
        return job
    }
}

// สถิติยอดจัดส่งย้อนหลัง 7 วัน
export async function getWeeklyJobStats(branchId?: string) {
  try {
    const isAdmin = await isSuperAdmin()
    const userBranchId = await getUserBranchId()
    const customerId = await getCustomerId()
    const supabase = (isAdmin || customerId) ? await createAdminClient() : await createClient()
    
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)

    const startDate = sevenDaysAgo.toISOString().split('T')[0]
    
    // ดึงข้อมูล 7 วันล่าสุด
    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Plan_Date, Job_Status')
      .gte('Plan_Date', startDate)

    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    } else {
        const effectiveBranchId = branchId || userBranchId
        if (effectiveBranchId && effectiveBranchId !== 'All') {
            dbQuery = dbQuery.eq('Branch_ID', effectiveBranchId)
        } else if (!isAdmin && !userBranchId) {
            return []
        }
    }

    const { data } = await dbQuery
      .order('Plan_Date', { ascending: true })

    if (data === null) {
      return []
    }

    // Group data by date
    const dailyStats: Record<string, { date: string, total: number, completed: number }> = {}
    
    // Initialize last 7 days with 0
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo)
        d.setDate(sevenDaysAgo.getDate() + i)
        const dateStr = d.toISOString().split('T')[0]
        const dayName = d.toLocaleDateString('th-TH', { weekday: 'short' }) // Mon, Tue...
        dailyStats[dateStr] = { date: dayName, total: 0, completed: 0 }
    }

    data?.forEach(job => {
        const dateStr = job.Plan_Date as string // Assuming Plan_Date is string YYYY-MM-DD
        if (dailyStats[dateStr]) {
            dailyStats[dateStr].total += 1
            if (['Delivered', 'Completed'].includes(job.Job_Status)) {
                dailyStats[dateStr].completed += 1
            }
        }
    })

    return Object.values(dailyStats)
  } catch {
    return []
  }
}

// สัดส่วนสถานะงาน (ทั้งหมด)
export async function getJobStatusDistribution(branchId?: string) {
    try {
        const isAdmin = await isSuperAdmin()
        const userBranchId = await getUserBranchId()
        const customerId = await getCustomerId()
        const supabase = (isAdmin || customerId) ? await createAdminClient() : await createClient()

        let dbQuery = supabase
            .from('Jobs_Main')
            .select('Job_Status')

        if (customerId) {
            dbQuery = dbQuery.eq('Customer_ID', customerId)
        } else {
            const effectiveBranchId = branchId || userBranchId
            if (effectiveBranchId && effectiveBranchId !== 'All') {
                dbQuery = dbQuery.eq('Branch_ID', effectiveBranchId)
            } else if (!isAdmin && !userBranchId) {
                return []
            }
        }

        const { data } = await dbQuery

        if (!data) return []

        const statusCounts: Record<string, number> = {}
        data?.forEach(job => {
            const status = job.Job_Status || 'Unknown'
            statusCounts[status] = (statusCounts[status] || 0) + 1
        })

        // Map colors for common statuses
        const result = Object.entries(statusCounts).map(([name, value]) => ({
            name,
            value,
            fill: getStatusColor(name)
        }))

        return result
    } catch {
        return []
    }
}

function getStatusColor(status: string) {
    switch (status) {
        case 'Completed': return '#10b981' // emerald-500
        case 'Delivered': return '#10b981'
        case 'In Progress': return '#3b82f6' // blue-500
        case 'In Transit': return '#3b82f6'
        case 'Pending': return '#f59e0b' // amber-500
        case 'New': return '#f59e0b'
        case 'Assigned': return '#8b5cf6' // violet-500
        case 'Failed': return '#ef4444' // red-500
        case 'Cancelled': return '#94a3b8' // slate-400
        default: return '#cbd5e1'
    }
}
import { sanitizeJobData } from './utils'

// สร้างงานใหม่
export async function createJob(jobData: Partial<Job>) {
    try {
        const isAdmin = await isSuperAdmin()
        const supabase = isAdmin ? await createAdminClient() : await createClient()
        
        // Generate Job ID (Format: JOB-YYYYMMDD-XXXX)
        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).replace(/-/g, '')
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        const newJobId = `JOB-${dateStr}-${randomSuffix}`

        const branchId = await getUserBranchId() || 'HQ'
        let custTotal = Number(jobData.Price_Cust_Total) || 0

        // Auto-calculate if total is 0 but we have customer and quantity
        if (custTotal === 0 && jobData.Customer_ID) {
            const { data: customer } = await supabase
                .from('Master_Customers')
                .select('Price_Per_Unit')
                .eq('Customer_ID', jobData.Customer_ID)
                .single()
            if (customer?.Price_Per_Unit) {
                const qty = Number(jobData.Weight_Kg || jobData.Volume_Cbm || jobData.Loaded_Qty || 0)
                if (qty > 0) {
                    custTotal = Number((qty * customer.Price_Per_Unit).toFixed(2))
                }
            }
        }

        const sanitized = sanitizeJobData({
            ...jobData,
            Job_ID: newJobId,
            Job_Status: 'New',
            Branch_ID: branchId,
            Price_Cust_Total: custTotal,
            Created_At: new Date().toISOString()
        })

        const { data, error } = await supabase
            .from('Jobs_Main')
            .insert(sanitized)
            .select()
            .single()
 
        if (error) {
            return { success: false, error }
        }

        // Log job creation
        await logActivity({
            module: 'Jobs',
            action_type: 'CREATE',
            target_id: newJobId,
            details: { 
                customer_name: jobData.Customer_Name,
                plan_date: jobData.Plan_Date,
                route: jobData.Route_Name,
                Branch_ID: jobData.Branch_ID || ''
            }
        })

        return { success: true, data }
    } catch (e) {
        return { success: false, error: e }
    }
}

// ดึงรายชื่อคนขับทั้งหมด (จากประวัติงาน)
export async function getAllDrivers() {
    try {
        const isAdmin = await isSuperAdmin()
        const supabase = isAdmin ? await createAdminClient() : await createClient()
        const branchId = await getUserBranchId()

        let query = supabase
            .from('Jobs_Main')
            .select('Driver_ID, Driver_Name, Vehicle_Plate')
            .not('Driver_ID', 'is', null)
        
        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        } else if (!isAdmin && !branchId) {
            return []
        }

        const { data } = await query
        
        if (!data) return []

        // De-duplicate by Driver_ID
        const uniqueDrivers = new Map()
        data?.forEach(item => {
            if (item.Driver_ID && !uniqueDrivers.has(item.Driver_ID)) {
                uniqueDrivers.set(item.Driver_ID, item)
            }
        })

        return Array.from(uniqueDrivers.values())
    } catch {
        return []
    }
}

// ดึงรายชื่อรถทั้งหมด
export async function getAllVehicles() {
    try {
        const isAdmin = await isSuperAdmin()
        const supabase = isAdmin ? await createAdminClient() : await createClient()
        const branchId = await getUserBranchId()

        let query = supabase
            .from('Jobs_Main')
            .select('Vehicle_Plate, Driver_Name')
            .not('Vehicle_Plate', 'is', null)

        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        } else if (!isAdmin && !branchId) {
            return []
        }

        const { data } = await query

        if (!data) return []

        const uniqueVehicles = new Map()
        data?.forEach(item => {
            if (item.Vehicle_Plate && !uniqueVehicles.has(item.Vehicle_Plate)) {
                uniqueVehicles.set(item.Vehicle_Plate, item)
            }
        })

        return Array.from(uniqueVehicles.values())
    } catch {
        return []
    }
}

// ดึงข้อมูลสำหรับหน้า Billing (Completed/Delivered)
export async function getJobsForBilling(explicitCustomerId?: string, startDate?: string, endDate?: string): Promise<Job[]> {
    try {
        const isAdmin = await isSuperAdmin()
        const branchId = await getUserBranchId()
        const sessionCustomerId = await getCustomerId()
        const customerId = explicitCustomerId || sessionCustomerId
        const supabase = isAdmin ? await createAdminClient() : await createClient()

        let dbQuery = supabase
            .from('Jobs_Main')
            .select('*')
            .in('Job_Status', ['Completed', 'Delivered'])
            .is('Billing_Note_ID', null)
            .is('Invoice_ID', null)
        
        if (customerId) {
            dbQuery = dbQuery.eq('Customer_ID', customerId)
        } else if (branchId && branchId !== 'All') {
            dbQuery = dbQuery.eq('Branch_ID', branchId)
        } else if (!isAdmin && !branchId) {
            return []
        }

        let query = dbQuery
            .order('Plan_Date', { ascending: false })
            
        if (startDate) {
            query = query.gte('Plan_Date', startDate)
        }
        if (endDate) {
            query = query.lte('Plan_Date', endDate)
        }
        
        const { data } = await query
        
        if (!data || data.length === 0) {
            return []
        }

        // Safer approach: Fetch Unit Prices separately to avoid join errors breaking the page
        try {
            const customerIds = [...new Set(data.filter(j => j.Customer_ID).map(j => j.Customer_ID))]
            const { data: customerPrices } = await supabase
                .from('Master_Customers')
                .select('Customer_ID, Price_Per_Unit')
                .in('Customer_ID', customerIds)

            if (customerPrices) {
                const priceMap = new Map(customerPrices.map(c => [c.Customer_ID, c.Price_Per_Unit]))
                return data.map(job => ({
                    ...job,
                    Price_Per_Unit: priceMap.get(job.Customer_ID) || 0
                })) as Job[]
            }
        } catch (e) {
            console.error("Mapping unit prices failed:", e)
        }
        
        return data as Job[]
    } catch {
        return []
    }
}
// ดึงข้อมูล Dashboard สำหรับ Driver (Mobile)
export async function getDriverDashboardStats(driverId: string) {
  try {
    // Use admin client to bypass RLS as drivers use custom session
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]
    
    // 1. Get ALL jobs for this driver (not just today) that are not cancelled
    const { data: jobs } = await supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Driver_ID', driverId)
      .neq('Job_Status', 'Cancelled')
      .order('Plan_Date', { ascending: true }) // Show oldest/overdue jobs first
      .order('Created_At', { ascending: true }) 

    if (!jobs) {
      return { 
        stats: { total: 0, completed: 0 }, 
        gamification: { points: 0, rank: 'Bronze', nextRankPoints: 300, monthlyCompleted: 0 },
        currentJob: null 
      }
    }

    const completed = jobs?.filter(j => ['Completed', 'Delivered'].includes(j.Job_Status || '')).length || 0
    
    // Calculate today's income (Only sum jobs where Show_Price_To_Driver is true)
    const todayIncome = jobs?.filter(j => 
        j.Plan_Date === today && 
        j.Job_Status !== 'Cancelled' &&
        j.Show_Price_To_Driver !== false // Enforce visibility rule
    ).reduce((sum, j) => sum + (j.Cost_Driver_Total || 0), 0) || 0

    // User requested "Remaining Jobs" as the main count
    const total = (jobs?.length || 0) - completed
    
    // Find current active job (In Progress/Transit, Arrived Pickup/Dropoff) OR the first Assigned/New job
    const activeJobs = jobs?.filter(j => !['Completed', 'Delivered', 'Cancelled'].includes(j.Job_Status || '')) || []
    const currentJob = activeJobs.length > 0 ? activeJobs[0] : null

    // 2. Gamification Stats (Monthly)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { count: monthlyCompletedCount } = await supabase
        .from('Jobs_Main')
        .select('*', { count: 'exact', head: true })
        .eq('Driver_ID', driverId)
        .gte('Plan_Date', startOfMonth)
        .in('Job_Status', ['Completed', 'Delivered'])

    const points = (monthlyCompletedCount || 0) * 10
    
    // Rank Logic
    let rank = 'Bronze'
    let nextRankPoints = 300
    if (points >= 1200) { rank = 'Platinum'; nextRankPoints = 0 }
    else if (points >= 700) { rank = 'Gold'; nextRankPoints = 1200 }
    else if (points >= 300) { rank = 'Silver'; nextRankPoints = 700 }

    return {
      stats: { total, completed },
      todayIncome,
      gamification: {
          points,
          rank,
          nextRankPoints,
          monthlyCompleted: monthlyCompletedCount || 0
      },
      currentJob,
      activeJobs // <--- Fixed: Added missing activeJobs to return 
    }
  } catch {
     return { 
        stats: { total: 0, completed: 0 }, 
        gamification: { points: 0, rank: 'Bronze', nextRankPoints: 300, monthlyCompleted: 0 },
        currentJob: null 
      }
  }
}

// Get billable jobs (Complete/Delivered and NOT yet invoiced)
export async function getBillableJobs(customerId?: string, startDate?: string, endDate?: string) {
  try {
    const isAdmin = await isSuperAdmin()
    const branchId = await getUserBranchId()
    const supabase = isAdmin ? await createAdminClient() : await createClient()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*')
      .is('Invoice_ID', null) 
      .is('Billing_Note_ID', null)
      .in('Job_Status', ['Completed', 'Delivered'])

    if (customerId && customerId !== 'all') {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    }

    if (startDate) {
        dbQuery = dbQuery.gte('Plan_Date', startDate)
    }

    if (endDate) {
        dbQuery = dbQuery.lte('Plan_Date', endDate)
    }

    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data, error } = await dbQuery
      .order('Plan_Date', { ascending: false })

    if (error || !data || data.length === 0) {
      return []
    }

    // Map unit prices from Master_Customers
    try {
        const uniqueCustomerIds = Array.from(new Set(data.filter(j => j.Customer_ID).map(j => j.Customer_ID)))
        
        const { data: customerPrices } = await supabase
            .from('Master_Customers')
            .select('Customer_ID, Price_Per_Unit')
            .in('Customer_ID', uniqueCustomerIds)

        if (customerPrices) {
            const priceMap = new Map(customerPrices.map(c => [c.Customer_ID, c.Price_Per_Unit]))
            return data.map(job => ({
                ...job,
                Price_Per_Unit: priceMap.get(job.Customer_ID) || 0
            })) as Job[]
        }
    } catch (e) {
        console.error("Mapping unit prices failed for billable jobs:", e)
    }
    
    return data as Job[]
  } catch {
    return []
  }
}
// Get unassigned jobs for the marketplace
export async function getMarketplaceJobs(providedBranchId?: string): Promise<Job[]> {
  try {
    // Use Admin Client to bypass branch RLS so we can show global bidding pool
    const supabase = createAdminClient()
    const customerId = await getCustomerId()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*')
      .in('Job_Status', ['New', 'Requested', 'Assigned'])
      .is('Driver_ID', null)
    
    // Logic:
    // 1. If it's a customer login, ONLY show their own unassigned jobs
    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    } 
    // 2. If a specific branch is selected (and not 'All'), filter by that branch
    else if (providedBranchId && providedBranchId !== 'All' && providedBranchId !== 'Global') {
        dbQuery = dbQuery.eq('Branch_ID', providedBranchId)
    }
    // 3. Otherwise (Super Admin / Staff viewing 'All'), show everything!

    const { data, error } = await dbQuery
      .order('Created_At', { ascending: false })
      .limit(50) 
    
    if (error) {
        console.error('[DEBUG] getMarketplaceJobs Error:', error)
        return []
    }
    
    return data || []
  } catch (err) {
    console.error('[DEBUG] getMarketplaceJobs Exception:', err)
    return []
  }
}

// ดึงการขอรถที่รอดำเนินการ (Requested) ทั้งหมด โดยไม่จำกัดวันที่
export async function getRequestedJobs(providedBranchId?: string): Promise<Job[]> {
    try {
        const isSuper = await isSuperAdmin()
        const supabase = createAdminClient()
        const userBranchId = await getUserBranchId()
        const customerId = await getCustomerId()
        const branchId = providedBranchId && providedBranchId !== 'All' ? providedBranchId : userBranchId

        let dbQuery = supabase
            .from('Jobs_Main')
            .select('*')
            .eq('Job_Status', 'Requested')
        
        if (customerId) {
            dbQuery = dbQuery.eq('Customer_ID', customerId)
        } else if (branchId && branchId !== 'All') {
            dbQuery = dbQuery.eq('Branch_ID', branchId)
        } else if (!isSuper && !branchId) {
            return []
        }

        const { data, error } = await dbQuery.order('Created_At', { ascending: false })

        if (error) {
            console.error('[DEBUG] getRequestedJobs select error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            })
            return []
        }

        if (!data) {
            return []
        }

        // Map column name Branch_ID to type field branch_id for frontend consistency
        const mappedData = data.map(job => ({
            ...job,
            branch_id: job.Branch_ID || job.branch_id
        }))

        if (mappedData.length > 0) {
            console.log('[DEBUG] getRequestedJobs sample job (first item):', JSON.stringify(mappedData[0], null, 2))
        }

        return mappedData as Job[]
    } catch {
        return []
    }
}
