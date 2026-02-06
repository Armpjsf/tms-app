import { createClient } from '@/utils/supabase/server'

export type Driver = {
  Driver_ID: string
  Driver_Name: string
  Role: string | null
  Mobile_No: string | null
  Vehicle_Plate: string | null
  Vehicle_Type: string | null
  Active_Status: string | null
  Driver_Score: number | null
  Current_Lat: number | null
  Current_Lon: number | null
  Last_Update: string | null
  Branch_ID: string | null
  Image_Url: string | null
}

// ดึงคนขับทั้งหมด (pagination + search)
export async function getAllDrivers(
  page = 1, 
  limit = 20, 
  query = ''
): Promise<{ data: Driver[], count: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    
    let dbQuery = supabase
      .from('Master_Drivers')
      .select('*', { count: 'exact' })
      .order('Driver_Name', { ascending: true })

    if (query) {
      dbQuery = dbQuery.or(`Driver_Name.ilike.%${query}%,Mobile_No.ilike.%${query}%`)
    }

    const { data, error, count } = await dbQuery.range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching drivers:', JSON.stringify(error))
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch (e) {
    console.error('Exception fetching drivers:', e)
    return { data: [], count: 0 }
  }
}

// ดึงคนขับที่ Active
export async function getActiveDrivers(): Promise<Driver[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('*')
      .eq('Active_Status', 'Active')
      .order('Driver_Name', { ascending: true })
    
    if (error) {
      console.error('Error fetching active drivers:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching active drivers:', e)
    return []
  }
}

// ดึงคนขับตาม ID
export async function getDriverById(driverId: string): Promise<Driver | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('*')
      .eq('Driver_ID', driverId)
      .single()
    
    if (error) {
      console.error('Error fetching driver:', JSON.stringify(error))
      return null
    }
    
    return data
  } catch (e) {
    console.error('Exception fetching driver:', e)
    return null
  }
}

// นับสถิติคนขับ
export async function getDriverStats() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('Active_Status')
    
    if (error) {
      console.error('Error fetching driver stats:', JSON.stringify(error))
      return { total: 0, active: 0, inactive: 0 }
    }
    
    const drivers = data || []
    return {
      total: drivers.length,
      active: drivers.filter(d => d.Active_Status === 'Active').length,
      inactive: drivers.filter(d => d.Active_Status !== 'Active').length,
      onJob: 0 // Placeholder as we don't have job linkage here yet
    }
  } catch (e) {
    console.error('Exception fetching driver stats:', e)
    return { total: 0, active: 0, inactive: 0, onJob: 0 }
  }
}
