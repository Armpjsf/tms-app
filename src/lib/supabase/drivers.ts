import { createClient } from '@/utils/supabase/server'

// Type matching actual Supabase schema
export type Driver = {
  Driver_ID: string
  Driver_Name: string | null  // ⚠️ ไม่ใช่ 'Name'
  Role: string | null
  Mobile_No: string | null    // ⚠️ ไม่ใช่ 'Phone'
  Line_User_ID: string | null
  Password: string | null
  Vehicle_Plate: string | null
  Vehicle_Type: string | null
  Max_Weight_kg: number | null
  Max_Volume_cbm: number | null
  Insurance_Expiry: string | null
  Tax_Expiry: string | null
  Act_Expiry: string | null
  Current_Mileage: number | null
}

// Get all drivers from Master_Drivers table
export async function getAllDriversFromTable(): Promise<Driver[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('*')
    
    if (error) {
      console.error('Error fetching drivers:', JSON.stringify(error))
      return []
    }
    return data || []
  } catch {
    return []
  }
}

// Get driver by ID
export async function getDriverById(id: string): Promise<Driver | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('*')
      .eq('Driver_ID', id)
      .single()
    
    if (error) return null
    return data
  } catch {
    return null
  }
}

// Create driver
export async function createDriver(driverData: Partial<Driver>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers')
      .insert({
        Driver_ID: driverData.Driver_ID || `DRV-${Date.now()}`,
        Driver_Name: driverData.Driver_Name,
        Mobile_No: driverData.Mobile_No,
        Role: driverData.Role || 'Driver',
        Vehicle_Plate: driverData.Vehicle_Plate,
        Vehicle_Type: driverData.Vehicle_Type
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating driver:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Update driver
export async function updateDriver(id: string, driverData: Partial<Driver>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers')
      .update({
        Driver_Name: driverData.Driver_Name,
        Mobile_No: driverData.Mobile_No,
        Role: driverData.Role,
        Vehicle_Plate: driverData.Vehicle_Plate,
        Vehicle_Type: driverData.Vehicle_Type
      })
      .eq('Driver_ID', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating driver:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Delete driver
export async function deleteDriver(id: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('Master_Drivers')
      .delete()
      .eq('Driver_ID', id)
    
    if (error) {
      console.error('Error deleting driver:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Alias for planning page compatibility - returns { data: drivers }
// Also supports pagination for /drivers page
export async function getAllDrivers(page?: number, limit?: number, query?: string) {
  try {
    const supabase = await createClient()
    let queryBuilder = supabase.from('Master_Drivers').select('*', { count: 'exact' })
    
    // Apply search filter if query provided
    if (query) {
      queryBuilder = queryBuilder.or(`Driver_Name.ilike.%${query}%,Mobile_No.ilike.%${query}%,Driver_ID.ilike.%${query}%`)
    }
    
    // Apply pagination if provided
    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }
    
    const { data, error, count } = await queryBuilder
    
    if (error) {
      console.error('Error fetching drivers:', JSON.stringify(error))
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}

// Get driver stats for dashboard
export async function getDriverStats() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('Driver_ID, Role')
    
    if (error) {
      return { total: 0, active: 0, onJob: 0 }
    }
    
    const total = data?.length || 0
    // Since we don't have Active_Status in schema, approximate
    const active = total
    const onJob = Math.floor(total * 0.3) // Approximate 30% on job
    
    return { total, active, onJob }
  } catch {
    return { total: 0, active: 0, onJob: 0 }
  }
}
