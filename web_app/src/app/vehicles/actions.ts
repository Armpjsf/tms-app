'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type VehicleFormData = {
  Vehicle_Plate: string
  Vehicle_Type: string
  Brand: string
  Model: string
  Active_Status: string
}

export async function createVehicle(data: VehicleFormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Master_Vehicles')
    .insert({
      Vehicle_Plate: data.Vehicle_Plate,
      Vehicle_Type: data.Vehicle_Type,
      Brand: data.Brand,
      Model: data.Model,
      Active_Status: 'Active',
    })

  if (error) {
    console.error('Error creating vehicle:', error)
    return { success: false, message: 'Failed to create vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle created successfully' }
}

export async function updateVehicle(plate: string, data: Partial<VehicleFormData>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Master_Vehicles')
    .update(data)
    .eq('Vehicle_Plate', plate)

  if (error) {
    console.error('Error updating vehicle:', error)
    return { success: false, message: 'Failed to update vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle updated successfully' }
}

export async function deleteVehicle(plate: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Master_Vehicles')
    .delete()
    .eq('Vehicle_Plate', plate)

  if (error) {
    console.error('Error deleting vehicle:', error)
    return { success: false, message: 'Failed to delete vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle deleted successfully' }
}
