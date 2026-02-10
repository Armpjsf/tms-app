import { createClient } from '@/utils/supabase/server'

export type Job = {
  Job_ID: string
  Job_Status: string
  Plan_Date: string | null
  Customer_ID: string | null
  Customer_Name: string | null
  Route_Name: string | null
  Driver_ID: string | null
  Driver_Name: string | null
  Vehicle_Plate: string | null
  Origin_Location: string | null
  Dest_Location: string | null
  Total_Drop: number | null
  Price_Cust_Total: number
  Cost_Driver_Total: number
  Created_At: string | null
  Photo_Proof_Url: string | null
  Signature_Url: string | null
}

// ดึงงานทั้งหมดวันนี้
export async function getTodayJobs(): Promise<Job[]> {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Plan_Date', today)
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
    
    const { data, error } = await supabase
      .from('Jobs_Main')
      .select('*')
      .eq('Job_Status', status)
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

// ดึงงานทั้งหมด (pagination + search)
export async function getAllJobs(
  page = 1, 
  limit = 50, 
  query = ''
): Promise<{ data: Job[], count: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    
    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*', { count: 'exact' })
      .order('Plan_Date', { ascending: false })
      .order('Created_At', { ascending: false })

    if (query) {
      dbQuery = dbQuery.or(`Job_ID.ilike.%${query}%,Customer_Name.ilike.%${query}%,Route_Name.ilike.%${query}%`)
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
export async function getTodayJobStats() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('Jobs_Main')
      .select('Job_Status')
      .eq('Plan_Date', today)
    
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

// ดึงงานของ Driver เฉพาะคน
export async function getDriverJobs(driverId: string): Promise<Job[]> {
  try {
    const supabase = await createClient()
    
    // In a real scenario, filtering by Driver_ID is needed, but assuming we pass the 'Name' or 'ID' correctly
    // Since our mock data might use Driver_Name or Driver_ID (string)
    const { data, error } = await supabase
      .from('Jobs_Main')
      .select('*')
      .or(`Driver_ID.eq.${driverId},Driver_Name.eq.${driverId}`) // Try both just in case of inconsistent data
      .order('Plan_Date', { ascending: false })
      .order('Created_At', { ascending: false })
      .limit(50)
    
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
        const { data, error } = await supabase
            .from('Jobs_Main')
            .select('*')
            .eq('Job_ID', jobId)
            .single()
        
        if (error) return null
        return data
    } catch (e) {
        console.error(e)
        return null
    }
}
// สถิติยอดจัดส่งย้อนหลัง 7 วัน
export async function getWeeklyJobStats() {
  try {
    const supabase = await createClient()
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)

    const startDate = sevenDaysAgo.toISOString().split('T')[0]
    
    // ดึงข้อมูล 7 วันล่าสุด
    const { data, error } = await supabase
      .from('Jobs_Main')
      .select('Plan_Date, Job_Status')
      .gte('Plan_Date', startDate)
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
export async function getJobStatusDistribution() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('Jobs_Main')
            .select('Job_Status')

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
        const { data, error } = await supabase
            .from('Jobs_Main')
            .select('Driver_ID, Driver_Name, Vehicle_Plate')
            .not('Driver_ID', 'is', null)
        
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
        const { data, error } = await supabase
            .from('Jobs_Main')
            .select('Vehicle_Plate, Driver_Name')
            .not('Vehicle_Plate', 'is', null)

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
        let query = supabase
            .from('Jobs_Main')
            .select('*')
            .in('Job_Status', ['Completed', 'Delivered'])
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
