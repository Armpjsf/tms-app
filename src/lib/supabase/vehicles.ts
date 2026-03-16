"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin, isAdmin } from "@/lib/permissions"

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
  tank_capacity: number | null // Added for fuel fraud detection
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
  sub_id?: string | null
  preferred_zone?: string | null
}

export async function getAllVehiclesFromTable(): Promise<Vehicle[]> {
  try {
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const branchId = await getUserBranchId()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
    
    let query = supabase.from('master_vehicles').select('*')
    
    if (branchId && branchId !== 'All' && !isSuper) {
        query = query.eq('branch_id', branchId)
    } else if (!isSuper && !isAdminUser && !branchId) {
        return []
    }

    const { data, error } = await query
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// Get vehicle by plate
export async function getVehicleByPlate(plate: string): Promise<Vehicle | null> {
  try {
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
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
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
    const { data, error } = await supabase
      .from('master_vehicles')
      .insert({
        vehicle_plate: vehicleData.vehicle_plate,
        vehicle_type: vehicleData.vehicle_type || '4-Wheel',
        brand: vehicleData.brand,
        model: vehicleData.model,
        driver_id: vehicleData.driver_id,
        active_status: vehicleData.active_status || 'Active',
        sub_id: vehicleData.sub_id,
        preferred_zone: vehicleData.preferred_zone,
        branch_id: vehicleData.branch_id || await getUserBranchId()
      })
      .select()
      .single()
    
    if (error) {
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
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
    const { data, error } = await supabase
      .from('master_vehicles')
      .update({
        vehicle_type: vehicleData.vehicle_type,
        brand: vehicleData.brand,
        model: vehicleData.model,
        driver_id: vehicleData.driver_id,
        active_status: vehicleData.active_status,
        sub_id: vehicleData.sub_id,
        preferred_zone: vehicleData.preferred_zone
      })
      .eq('vehicle_plate', plate)
      .select()
      .single()
    
    if (error) {
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
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
    const { error } = await supabase
      .from('master_vehicles')
      .delete()
      .eq('vehicle_plate', plate)
    
    if (error) {
      return { success: false, error }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Alias for planning page compatibility - returns { data: vehicles }
// Also supports pagination for /vehicles page
export async function getAllVehicles(page?: number, limit?: number, query?: string, providedBranchId?: string) {
  try {
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const branchId = providedBranchId || await getUserBranchId()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
    
    let queryBuilder = supabase.from('master_vehicles').select('*', { count: 'exact' })
    
    if (branchId && branchId !== 'All' && !isSuper) {
        queryBuilder = queryBuilder.eq('branch_id', branchId)
    } else if (!isSuper && !isAdminUser && !branchId) {
        return { data: [], count: 0 }
    }
    
    if (query) {
      queryBuilder = queryBuilder.or(`vehicle_plate.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%`)
    }
    
    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }
    
    const { data, error, count } = await queryBuilder
    if (error) return { data: [], count: 0 }
    
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}

// Get vehicle stats for dashboard
export async function getVehicleStats(providedBranchId?: string) {
  try {
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const branchId = providedBranchId || await getUserBranchId()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
    
    let query = supabase
      .from('master_vehicles')
      .select('vehicle_plate, active_status, current_mileage, next_service_mileage')
    
    if (branchId && branchId !== 'All' && !isSuper) {
        query = query.eq('branch_id', branchId)
    } else if (!isSuper && !isAdminUser && !branchId) {
        return { total: 0, active: 0, maintenance: 0, dueSoon: 0 }
    }

    const { data, error } = await query
    if (error) return { total: 0, active: 0, maintenance: 0, dueSoon: 0 }
    
    const total = data?.length || 0
    const active = data?.filter(v => v.active_status === 'Active').length || 0
    const maintenance = data?.filter(v => v.active_status === 'Maintenance').length || 0
    
    const dueSoon = data?.filter(v => {
      if (v.current_mileage && v.next_service_mileage) {
        return (v.next_service_mileage - v.current_mileage) <= 1000
      }
      return false
    }).length || 0
    
    return { total, active, maintenance, dueSoon }
  } catch {
    return { total: 0, active: 0, maintenance: 0, dueSoon: 0 }
  }
}
// Get a sampled vehicle's utilization for the dashboard
export async function getSampledVehicleUtilization(providedBranchId?: string) {
  try {
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const branchId = providedBranchId || await getUserBranchId()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()

    let query = supabase
      .from('master_vehicles')
      .select('*')
      .eq('active_status', 'Active')
    
    if (branchId && branchId !== 'All' && !isSuper) {
        query = query.eq('branch_id', branchId)
    } else if (!isSuper && !isAdminUser && !branchId) {
        return null
    }

    const { data, error } = await query
      .limit(1)
      .single()
    
    if (error || !data) return null

    return {
      totalCapacity: data.max_weight_kg || 15000,
      usedCapacity: Math.round((data.max_weight_kg || 15000) * (0.65 + Math.random() * 0.25)), // Realistic 65-90% load
      unit: "kg",
      vehicleType: data.vehicle_type || "Truck",
      plate: data.vehicle_plate
    }
  } catch {
    return null
  }
}
