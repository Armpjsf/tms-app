import { createClient } from '@/utils/supabase/server'

// Type matching actual Supabase schema (lowercase columns!)
export type Vehicle = {
  vehicle_plate: string        // PK - lowercase!
  vehicle_type: string | null
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
  engine_no: string | null
  chassis_no: string | null
  max_weight_kg: number | null
  max_volume_cbm: number | null
  insurance_company: string | null
  insurance_expiry: string | null
  tax_expiry: string | null
  act_expiry: string | null
  current_mileage: number | null
  last_service_date: string | null
  next_service_mileage: number | null
  driver_id: string | null
  branch_id: string | null
  active_status: string | null
  notes: string | null
}

// Get all vehicles from master_vehicles table
export async function getAllVehiclesFromTable(): Promise<Vehicle[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('master_vehicles')
      .select('*')
    
    if (error) {
      console.error('Error fetching vehicles:', JSON.stringify(error))
      return []
    }
    return data || []
  } catch {
    return []
  }
}

// Get vehicle by plate
export async function getVehicleByPlate(plate: string): Promise<Vehicle | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('master_vehicles')
      .select('*')
      .eq('vehicle_plate', plate)
      .single()
    
    if (error) return null
    return data
  } catch {
    return null
  }
}

// Create vehicle
export async function createVehicle(vehicleData: Partial<Vehicle>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('master_vehicles')
      .insert({
        vehicle_plate: vehicleData.vehicle_plate,
        vehicle_type: vehicleData.vehicle_type || '4-Wheel',
        brand: vehicleData.brand,
        model: vehicleData.model,
        driver_id: vehicleData.driver_id,
        active_status: vehicleData.active_status || 'Active'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating vehicle:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Update vehicle
export async function updateVehicle(plate: string, vehicleData: Partial<Vehicle>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('master_vehicles')
      .update({
        vehicle_type: vehicleData.vehicle_type,
        brand: vehicleData.brand,
        model: vehicleData.model,
        driver_id: vehicleData.driver_id,
        active_status: vehicleData.active_status
      })
      .eq('vehicle_plate', plate)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating vehicle:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Delete vehicle
export async function deleteVehicle(plate: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('master_vehicles')
      .delete()
      .eq('vehicle_plate', plate)
    
    if (error) {
      console.error('Error deleting vehicle:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Alias for planning page compatibility - returns { data: vehicles }
// Also supports pagination for /vehicles page
export async function getAllVehicles(page?: number, limit?: number, query?: string) {
  try {
    const supabase = await createClient()
    let queryBuilder = supabase.from('master_vehicles').select('*', { count: 'exact' })
    
    // Apply search filter if query provided
    if (query) {
      queryBuilder = queryBuilder.or(`vehicle_plate.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%`)
    }
    
    // Apply pagination if provided
    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }
    
    const { data, error, count } = await queryBuilder
    
    if (error) {
      console.error('Error fetching vehicles:', JSON.stringify(error))
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}

// Get vehicle stats for dashboard
export async function getVehicleStats() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('master_vehicles')
      .select('vehicle_plate, active_status')
    
    if (error) {
      return { total: 0, active: 0, maintenance: 0 }
    }
    
    const total = data?.length || 0
    const active = data?.filter(v => v.active_status === 'Active').length || total
    const maintenance = data?.filter(v => v.active_status === 'Maintenance').length || 0
    
    return { total, active, maintenance }
  } catch {
    return { total: 0, active: 0, maintenance: 0 }
  }
}
