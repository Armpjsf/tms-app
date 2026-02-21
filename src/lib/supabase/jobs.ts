"use server"

import { createClient } from '@/utils/supabase/server'

export type Job = {
  Job_ID: string
  Job_Status: string
  Plan_Date: string | null
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
  Cargo_Type: string | null
  Notes: string | null
  original_origins_json: any
  original_destinations_json: any
  extra_costs_json: any
  Created_At: string | null
  Photo_Proof_Url: string | null
  Signature_Url: string | null
  Sub_ID: string | null
  Show_Price_To_Driver: boolean
  Weight_Kg?: number | null
  Volume_Cbm?: number | null
  Zone?: string | null
  Invoice_ID?: string | null
}

// ดึงงานทั้งหมดวันนี้
import { getUserBranchId, isSuperAdmin, getCustomerId } from "@/lib/permissions"

export async function getTodayJobs(): Promise<Job[]> {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Plan_Date', today)
    
    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    const customerId = await getCustomerId()
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !customerId && !branchId) {
        return []
    }

    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    }

    const { data, error } = await dbQuery
      .order('Created_At', { ascending: false })
    
    if (error) {
      console.error('Error fetching today jobs:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching today jobs:', e)
    return []
  }
}

// ดึงงานตามสถานะ
export async function getJobsByStatus(status: string): Promise<Job[]> {
  try {
    const supabase = await createClient()
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    const customerId = await getCustomerId()

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

    const { data, error } = await dbQuery
      .order('Created_At', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('Error fetching jobs by status:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching jobs by status:', e)
    return []
  }
}

// ดึงงานทั้งหมด (pagination + search + status filter)
export async function getAllJobs(
  page = 1, 
  limit = 50, 
  query = '',
  status = '' // Add status parameter
): Promise<{ data: Job[], count: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    
    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*', { count: 'exact' })
    
    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    const customerId = await getCustomerId()
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !customerId && !branchId) {
        return { data: [], count: 0 }
    }

    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
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

    const { data, error, count } = await dbQuery.range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching all jobs:', JSON.stringify(error))
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch (e) {
    console.error('Exception fetching all jobs:', e)
    return { data: [], count: 0 }
  }
}

// นับสถิติงานวันนี้
export async function getTodayJobStats(branchId?: string) {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const userBranchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    const customerId = await getCustomerId()
    
    let dbQuery = supabase
      .from('Jobs_Main')
      .select('Job_Status')
      .eq('Plan_Date', today)

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
    
    const { data, error } = await dbQuery
    
    if (error) {
      console.error('Error fetching job stats:', JSON.stringify(error))
      return { total: 0, delivered: 0, inProgress: 0, pending: 0 }
    }
    
    const jobs = data || []
    return {
      total: jobs.length,
      delivered: jobs.filter(j => j.Job_Status === 'Delivered' || j.Job_Status === 'Completed').length,
      inProgress: jobs.filter(j => j.Job_Status === 'In Transit' || j.Job_Status === 'In Progress').length,
      pending: jobs.filter(j => j.Job_Status === 'New' || j.Job_Status === 'Assigned').length,
    }
  } catch (e) {
    console.error('Exception fetching job stats:', e)
    return { total: 0, delivered: 0, inProgress: 0, pending: 0 }
  }
}

// ยอดเงินวันนี้ (Estimated)
export async function getTodayFinancials(branchId?: string) {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const userBranchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    const customerId = await getCustomerId()

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

    const { data, error } = await dbQuery
      .neq('Job_Status', 'Cancelled') // Exclude cancelled jobs
    
    if (error) return { revenue: 0 }

    const revenue = data?.reduce((sum, job) => sum + (job.Price_Cust_Total || 0), 0) || 0
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
    const supabase = await createClient()
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    
    let query = supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Driver_ID', driverId)

    if (branchId && branchId !== 'All') {
        query = query.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    if (options.startDate) {
        query = query.gte('Plan_Date', options.startDate)
    }

    if (options.endDate) {
        query = query.lte('Plan_Date', options.endDate)
    }

    if (options.status && options.status !== 'All') {
        query = query.eq('Job_Status', options.status)
    }

    const { data, error } = await query
      .order('Plan_Date', { ascending: false })
      .order('Created_At', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('Error fetching driver jobs:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching driver jobs:', e)
    return []
  }
}

// ดึงรายละเอียดงาน By ID
export async function getJobById(jobId: string): Promise<Job | null> {
    try {
        const supabase = await createClient()
        const branchId = await getUserBranchId()
        const isAdmin = await isSuperAdmin()

        let query = supabase
            .from('Jobs_Main')
            .select('*')
            .eq('Job_ID', jobId)
        
        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        } else if (!isAdmin && !branchId) {
            return null
        }

        const { data, error } = await query
            .single()
        
        if (error) return null
        return data
    } catch (e) {
        console.error(e)
        return null
    }
}
// สถิติยอดจัดส่งย้อนหลัง 7 วัน
export async function getWeeklyJobStats(branchId?: string) {
  try {
    const supabase = await createClient()
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)

    const startDate = sevenDaysAgo.toISOString().split('T')[0]
    const userBranchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    const customerId = await getCustomerId()
    
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

    const { data, error } = await dbQuery
      .order('Plan_Date', { ascending: true })

    if (error) {
      console.error('Error fetching weekly stats:', JSON.stringify(error))
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
  } catch (e) {
    console.error('Exception fetching weekly stats:', e)
    return []
  }
}

// สัดส่วนสถานะงาน (ทั้งหมด)
export async function getJobStatusDistribution(branchId?: string) {
    try {
        const supabase = await createClient()
        const userBranchId = await getUserBranchId()
        const isAdmin = await isSuperAdmin()
        const customerId = await getCustomerId()

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

        const { data, error } = await dbQuery

        if (error) return []

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
// สร้างงานใหม่
export async function createJob(jobData: Partial<Job>) {
    try {
        const supabase = await createClient()
        
        // Generate Job ID (Format: JOB-YYYYMMDD-XXXX)
        const today = new Date()
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        const newJobId = `JOB-${dateStr}-${randomSuffix}`

        const { data, error } = await supabase
            .from('Jobs_Main')
            .insert({
                ...jobData,
                Job_ID: newJobId,
                Job_Status: 'New',
                Branch_ID: await getUserBranchId() || 'HQ',
                Created_At: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating job:', JSON.stringify(error))
            return { success: false, error }
        }

        return { success: true, data }
    } catch (e) {
        console.error('Exception creating job:', e)
        return { success: false, error: e }
    }
}

// ดึงรายชื่อคนขับทั้งหมด (จากประวัติงาน)
export async function getAllDrivers() {
    try {
        const supabase = await createClient()
        const branchId = await getUserBranchId()
        const isAdmin = await isSuperAdmin()

        let query = supabase
            .from('Jobs_Main')
            .select('Driver_ID, Driver_Name, Vehicle_Plate')
            .not('Driver_ID', 'is', null)
        
        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        } else if (!isAdmin && !branchId) {
            return []
        }

        const { data, error } = await query
        
        if (error) return []

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
        const supabase = await createClient()
        const branchId = await getUserBranchId()
        const isAdmin = await isSuperAdmin()

        let query = supabase
            .from('Jobs_Main')
            .select('Vehicle_Plate, Driver_Name')
            .not('Vehicle_Plate', 'is', null)

        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        } else if (!isAdmin && !branchId) {
            return []
        }

        const { data, error } = await query

        if (error) return []

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
export async function getJobsForBilling(startDate?: string, endDate?: string): Promise<Job[]> {
    try {
        const supabase = await createClient()
        const customerId = await getCustomerId()

        const branchId = await getUserBranchId()
        const isAdmin = await isSuperAdmin()

        let dbQuery = supabase
            .from('Jobs_Main')
            .select('*')
            .in('Job_Status', ['Completed', 'Delivered'])
        
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
        
        const { data, error } = await query
        
        if (error) {
            console.error('Error fetching billing jobs:', error)
            return []
        }
        
        return data || []
    } catch (e) {
        console.error('Exception fetching billing jobs:', e)
        return []
    }
}
// ดึงข้อมูล Dashboard สำหรับ Driver (Mobile)
export async function getDriverDashboardStats(driverId: string) {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    // 1. Get today's jobs for this driver
    const { data: jobs, error } = await supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Driver_ID', driverId)
      .eq('Plan_Date', today)
      .order('Created_At', { ascending: true }) // Order by time to find next job

    if (error) {
      console.error('Error fetching driver dashboard stats:', error)
      return { 
        stats: { total: 0, completed: 0 }, 
        gamification: { points: 0, rank: 'Bronze', nextRankPoints: 300, monthlyCompleted: 0 },
        currentJob: null 
      }
    }

    const total = jobs?.length || 0
    const completed = jobs?.filter(j => ['Completed', 'Delivered'].includes(j.Job_Status || '')).length || 0
    
    // Find current active job (In Progress/Transit) OR the first Pending/New job
    // Priority: In Progress > In Transit > Assigned > New
    const currentJob = jobs?.find(j => ['In Progress', 'In Transit'].includes(j.Job_Status || '')) 
      || jobs?.find(j => ['Assigned', 'New'].includes(j.Job_Status || '')) 
      || null

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
      gamification: {
          points,
          rank,
          nextRankPoints,
          monthlyCompleted: monthlyCompletedCount || 0
      },
      currentJob
    }
  } catch (e) {
    console.error('Exception fetching driver dashboard stats:', e)
     return { 
        stats: { total: 0, completed: 0 }, 
        gamification: { points: 0, rank: 'Bronze', nextRankPoints: 300, monthlyCompleted: 0 },
        currentJob: null 
      }
  }
}

// Get billable jobs for a customer
export async function getBillableJobs(customerId: string) {
  try {
    const supabase = await createClient()
    
    // Get jobs that are Complete/Delivered and NOT yet invoiced
    const { data, error } = await supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Customer_ID', customerId)
      .is('Invoice_ID', null) 
      .in('Job_Status', ['Complete', 'Delivered'])
      .order('Plan_Date', { ascending: true })

    if (error) {
      console.error('Error fetching billable jobs:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error:', error)
    return []
  }
}
