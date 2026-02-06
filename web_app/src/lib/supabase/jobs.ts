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
