'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'

export type VehicleFormData = {
  vehicle_plate: string
  vehicle_type: string
  brand: string
  model: string
  active_status: string
  current_mileage?: number
  next_service_mileage?: number
  Branch_ID?: string
}

export async function createVehicle(data: VehicleFormData) {
  const supabase = await createClient()
  const userBranchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

  const finalBranchId = (isAdmin && data.Branch_ID) ? data.Branch_ID : userBranchId

  const { error } = await supabase
    .from('master_vehicles')
    .insert({
      vehicle_plate: data.vehicle_plate,
      vehicle_type: data.vehicle_type,
      brand: data.brand,
      model: data.model,
      active_status: 'Active',
      current_mileage: data.current_mileage || 0,
      next_service_mileage: data.next_service_mileage || 0,
      Branch_ID: finalBranchId
    })

  if (error) {
    console.error('Error creating vehicle:', error)
    return { success: false, message: 'Failed to create vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle created successfully' }
}

export async function createBulkVehicles(vehicles: Partial<VehicleFormData>[]) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()

  // Prepare data
  const cleanData = vehicles.map(v => ({
    vehicle_plate: v.vehicle_plate,
    vehicle_type: v.vehicle_type || '4-Wheel',
    brand: v.brand,
    model: v.model,
    active_status: 'Active',
    current_mileage: v.current_mileage || 0,
    next_service_mileage: v.next_service_mileage || 0,
    Branch_ID: branchId
  })).filter(v => v.vehicle_plate)

  if (cleanData.length === 0) {
     return { success: false, message: 'No valid data found' }
  }

  const { error } = await supabase
    .from('master_vehicles')
    .insert(cleanData)

  if (error) {
    console.error('Error bulk creating vehicles:', error)
    return { success: false, message: `Failed to import: ${error.message}` }
  }

  revalidatePath('/vehicles')
  return { success: true, message: `Successfully imported ${cleanData.length} vehicles` }
}

export async function updateVehicle(plate: string, data: Partial<VehicleFormData>) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

    let query = supabase
      .from('master_vehicles')
      .update({
        vehicle_type: data.vehicle_type,
        brand: data.brand,
        model: data.model,
        active_status: data.active_status,
        current_mileage: data.current_mileage,
        next_service_mileage: data.next_service_mileage
    })
    
  if (isAdmin && data.Branch_ID) {
     // @ts-ignore
     query = query.update({ Branch_ID: data.Branch_ID })
  }
  
  query = query.eq('vehicle_plate', plate)

  if (branchId && !isAdmin) {
      query = query.eq('Branch_ID', branchId)
  }

  const { error } = await query

  if (error) {
    console.error('Error updating vehicle:', error)
    return { success: false, message: 'Failed to update vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle updated successfully' }
}

export async function deleteVehicle(plate: string) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

  let query = supabase
    .from('master_vehicles')
    .delete()
    .eq('vehicle_plate', plate)

  if (branchId && !isAdmin) {
      query = query.eq('Branch_ID', branchId)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting vehicle:', error)
    return { success: false, message: 'Failed to delete vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle deleted successfully' }
}
