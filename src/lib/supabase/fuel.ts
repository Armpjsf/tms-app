import { createClient } from '@/utils/supabase/server'

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

// ดึงบันทึกเติมน้ำมันทั้งหมด (pagination + search)
export async function getAllFuelLogs(
  page = 1, 
  limit = 20, 
  query = ''
): Promise<{ data: FuelLog[], count: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    
    let dbQuery = supabase
      .from('Fuel_Logs')
      .select('*', { count: 'exact' })
      .order('Date_Time', { ascending: false })

    if (query) {
      dbQuery = dbQuery.or(`Vehicle_Plate.ilike.%${query}%,Driver_Name.ilike.%${query}%`)
    }

    const { data, error, count } = await dbQuery.range(offset, offset + limit - 1)
  
    if (error) {
      console.error('Error fetching fuel logs:', error)
      return { data: [], count: 0 }
    }
  
    return { data: data || [], count: count || 0 }
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
