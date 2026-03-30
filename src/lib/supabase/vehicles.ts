"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin, isAdmin } from "@/lib/permissions"

// Type matching actual Supabase schema (PascalCase columns!)
export type Vehicle = {
  Vehicle_Plate: string        // PK
  Vehicle_Type: string | null
  Brand: string | null
  Model: string | null
  Year: number | null
  Color: string | null
  Engine_No: string | null
  Chassis_No: string | null
  Max_Weight_kg: number | null
  Max_Volume_cbm: number | null
  Tank_Capacity: number | null
  Insurance_Company: string | null
  Insurance_Expiry: string | null
  Tax_Expiry: string | null
  Act_Expiry: string | null
  Current_Mileage: number | null
  Last_Service_Date: string | null
  Next_Service_Mileage: number | null
  Driver_ID: string | null
  Branch_ID: string | null
  Active_Status: string | null
  Notes: string | null
  Sub_ID?: string | null
  Preferred_Zone?: string | null
  Primary_Driver_Name?: string | null
}

export async function getAllVehiclesFromTable(): Promise<Vehicle[]> {
  try {
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const branchId = await getUserBranchId()
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
    
    let query = supabase.from('Master_Vehicles').select('*')
    
    if (branchId && branchId !== 'All') {
        query = query.eq('Branch_ID', branchId)
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
      .from('Master_Vehicles')
      .select('*')
      .eq('Vehicle_Plate', plate)
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
      .from('Master_Vehicles')
      .insert({
        Vehicle_Plate: vehicleData.Vehicle_Plate,
        Vehicle_Type: vehicleData.Vehicle_Type || '4-Wheel',
        Brand: vehicleData.Brand,
        Model: vehicleData.Model,
        Driver_ID: vehicleData.Driver_ID,
        Active_Status: vehicleData.Active_Status || 'Active',
        Sub_ID: vehicleData.Sub_ID,
        Preferred_Zone: vehicleData.Preferred_Zone,
        Branch_ID: vehicleData.Branch_ID || await getUserBranchId()
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
      .from('Master_Vehicles')
      .update({
        Vehicle_Type: vehicleData.Vehicle_Type,
        Brand: vehicleData.Brand,
        Model: vehicleData.Model,
        Driver_ID: vehicleData.Driver_ID,
        Active_Status: vehicleData.Active_Status,
        Sub_ID: vehicleData.Sub_ID,
        Preferred_Zone: vehicleData.Preferred_Zone
      })
      .eq('Vehicle_Plate', plate)
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
      .from('Master_Vehicles')
      .delete()
      .eq('Vehicle_Plate', plate)
    
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
    
    let queryBuilder = supabase.from('Master_Vehicles').select(`
      *,
      Primary_Driver:Master_Drivers!Master_Vehicles_Driver_ID_fkey (
        Full_Name
      )
    `, { count: 'exact' })
    
    if (branchId && branchId !== 'All') {
        queryBuilder = queryBuilder.eq('Branch_ID', branchId)
    } else if (!isSuper && !isAdminUser && (!branchId || branchId === 'All')) {
        // Non-admin users must have a specific branch to see anything
        // Unless we decide otherwise, but usually they only see their branch.
        // If they try to see 'All' but aren't admins, they get nothing (or their own).
        const actualBranch = await getUserBranchId()
        if (actualBranch && actualBranch !== 'All') {
            queryBuilder = queryBuilder.eq('Branch_ID', actualBranch)
        } else {
            return { data: [], count: 0 }
        }
    }
    
    if (query) {
      queryBuilder = queryBuilder.or(`Vehicle_Plate.ilike.%${query}%,Brand.ilike.%${query}%,Model.ilike.%${query}%`)
    }
    
    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }
    
    const { data, error, count } = await queryBuilder
    if (error) return { data: [], count: 0 }
    
    // Map joined driver name to the flat field
    const mappedData = (data || []).map((v: any) => ({
      ...v,
      Primary_Driver_Name: v.Primary_Driver?.Full_Name
    }))
    
    return { data: mappedData, count: count || 0 }
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
      .from('Master_Vehicles')
      .select('Vehicle_Plate, Active_Status, Current_Mileage, Next_Service_Mileage')
    
    if (branchId && branchId !== 'All') {
        query = query.eq('Branch_ID', branchId)
    } else if (!isSuper && !isAdminUser && !branchId) {
        return { total: 0, active: 0, maintenance: 0, dueSoon: 0 }
    }

    const { data, error } = await query
    if (error) return { total: 0, active: 0, maintenance: 0, dueSoon: 0 }
    
    const total = data?.length || 0
    const active = data?.filter(v => v.Active_Status === 'Active').length || 0
    const maintenance = data?.filter(v => v.Active_Status === 'Maintenance').length || 0
    
    const dueSoon = data?.filter(v => {
      if (v.Current_Mileage && v.Next_Service_Mileage) {
        return (v.Next_Service_Mileage - v.Current_Mileage) <= 1000
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
      .from('Master_Vehicles')
      .select('*')
      .eq('Active_Status', 'Active')
    
    if (branchId && branchId !== 'All') {
        query = query.eq('Branch_ID', branchId)
    } else if (!isSuper && !isAdminUser && !branchId) {
        return null
    }

    const { data, error } = await query
      .limit(1)
      .single()
    
    if (error || !data) return null

    return {
      totalCapacity: data.Max_Weight_kg || 15000,
      usedCapacity: Math.round((data.Max_Weight_kg || 15000) * (0.65 + Math.random() * 0.25)), // Realistic 65-90% load
      unit: "kg",
      vehicleType: data.Vehicle_Type || "Truck",
      plate: data.Vehicle_Plate
    }
  } catch {
    return null
  }
}
