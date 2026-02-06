import { createClient } from '@/utils/supabase/server'

export type Vehicle = {
  Vehicle_Plate: string
  Vehicle_Type: string | null
  Brand: string | null
  Model: string | null
  Year: string | null
  Max_Weight_kg: number | null
  Max_Volume_cbm: number | null
  Current_Mileage: number | null
  Last_Service_Date: string | null
  Next_Service_Mileage: number | null
  Driver_ID: string | null
  Branch_ID: string | null
  Active_Status: string | null
  Insurance_Expiry: string | null
  Tax_Expiry: string | null
}

// ดึงรถทั้งหมด (pagination + search)
export async function getAllVehicles(
  page = 1, 
  limit = 20, 
  query = ''
): Promise<{ data: Vehicle[], count: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    
    let dbQuery = supabase
      .from('Master_Vehicles')
      .select('*', { count: 'exact' })
      .order('Vehicle_Plate', { ascending: true })

    if (query) {
      dbQuery = dbQuery.or(`Vehicle_Plate.ilike.%${query}%,Brand.ilike.%${query}%,Model.ilike.%${query}%`)
    }

    const { data, error, count } = await dbQuery.range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching vehicles:', JSON.stringify(error))
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch (e) {
    console.error('Exception fetching vehicles:', e)
    return { data: [], count: 0 }
  }
}

// ดึงรถที่ Active
export async function getActiveVehicles(): Promise<Vehicle[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('Master_Vehicles')
      .select('*')
      .eq('Active_Status', 'Active')
      .order('Vehicle_Plate', { ascending: true })
    
    if (error) {
      console.error('Error fetching active vehicles:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching active vehicles:', e)
    return []
  }
}

// นับสถิติรถ
export async function getVehicleStats() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('Master_Vehicles')
      .select('Active_Status, Next_Service_Mileage, Current_Mileage')
    
    if (error) {
      console.error('Error fetching vehicle stats:', JSON.stringify(error))
      return { total: 0, active: 0, maintenance: 0, dueSoon: 0 }
    }
    
    const vehicles = data || []
    const dueSoon = vehicles.filter(v => {
      if (v.Next_Service_Mileage && v.Current_Mileage) {
        return (v.Next_Service_Mileage - v.Current_Mileage) < 1000
      }
      return false
    }).length
    
    return {
      total: vehicles.length,
      active: vehicles.filter(v => v.Active_Status === 'Active').length,
      maintenance: vehicles.filter(v => v.Active_Status === 'Maintenance').length,
      dueSoon,
    }
  } catch (e) {
    console.error('Exception fetching vehicle stats:', e)
    return { total: 0, active: 0, maintenance: 0, dueSoon: 0 }
  }
}
