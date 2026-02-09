'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type DriverFormData = {
  Driver_ID: string
  Driver_Name: string
  Mobile_No: string
  Vehicle_Plate: string
  Active_Status: string
}

export async function createDriver(data: DriverFormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Master_Drivers')
    .insert({
      Driver_ID: data.Driver_ID,
      Driver_Name: data.Driver_Name,
      Mobile_No: data.Mobile_No,
      Vehicle_Plate: data.Vehicle_Plate || null,
      Active_Status: 'Active',
    })

  if (error) {
    console.error('Error creating driver:', error)
    return { success: false, message: 'Failed to create driver' }
  }

  revalidatePath('/drivers')
  return { success: true, message: 'Driver created successfully' }
}

export async function updateDriver(driverId: string, data: Partial<DriverFormData>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Master_Drivers')
    .update(data)
    .eq('Driver_ID', driverId)

  if (error) {
    console.error('Error updating driver:', error)
    return { success: false, message: 'Failed to update driver' }
  }

  revalidatePath('/drivers')
  return { success: true, message: 'Driver updated successfully' }
}

export async function deleteDriver(driverId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Master_Drivers')
    .delete()
    .eq('Driver_ID', driverId)

  if (error) {
    console.error('Error deleting driver:', error)
    return { success: false, message: 'Failed to delete driver' }
  }

  revalidatePath('/drivers')
  return { success: true, message: 'Driver deleted successfully' }
}
