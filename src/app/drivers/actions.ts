'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'

export type DriverFormData = {
  Driver_ID: string
  Driver_Name: string
  Mobile_No: string
  Password?: string
  Vehicle_Plate: string
  Active_Status: string
  Sub_ID?: string
  Branch_ID?: string
}

export async function createDriver(data: DriverFormData) {
  const supabase = await createClient()
  const userBranchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

  const finalBranchId = (isAdmin && data.Branch_ID) ? data.Branch_ID : userBranchId

  const { error } = await supabase
    .from('Master_Drivers')
    .insert({
      Driver_ID: data.Driver_ID,
      Driver_Name: data.Driver_Name,
      Mobile_No: data.Mobile_No,
      Password: data.Password || '123456', // Default password if missing
      Vehicle_Plate: data.Vehicle_Plate || null,
      Vehicle_Type: '4-Wheel', // Default
      Role: 'Driver',
      Active_Status: 'Active',
      Sub_ID: data.Sub_ID || null, // Fix: Convert empty string to null
      Branch_ID: finalBranchId
    })

  if (error) {
    console.error('Error creating driver:', error)
    return { success: false, message: `Failed to create driver: ${error.message} ${error.details || ''}` }
  }

  revalidatePath('/drivers')
  return { success: true, message: 'Driver created successfully' }
}

export async function createBulkDrivers(drivers: Partial<DriverFormData>[]) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  
  // Prepare data with defaults
  const cleanData = drivers.map(d => ({
    Driver_ID: d.Driver_ID || `DRV-${Math.floor(Math.random()*100000)}`, // Fallback ID
    Driver_Name: d.Driver_Name,
    Mobile_No: d.Mobile_No,
    Password: d.Password || '123456',
    Vehicle_Plate: d.Vehicle_Plate || null,
    Vehicle_Type: '4-Wheel',
    Role: 'Driver',
    Active_Status: 'Active',
    Sub_ID: d.Sub_ID || null, // Fix: Convert empty string to null
    Branch_ID: branchId
  })).filter(d => d.Driver_Name) // Ensure name exists

  if (cleanData.length === 0) {
     return { success: false, message: 'No valid data found' }
  }

  const { error } = await supabase
    .from('Master_Drivers')
    .insert(cleanData)

  if (error) {
    console.error('Error bulk creating drivers:', error)
    return { success: false, message: `Failed to import: ${error.message}` }
  }

  revalidatePath('/drivers')
  return { success: true, message: `Successfully imported ${cleanData.length} drivers` }
}

export async function updateDriver(driverId: string, data: Partial<DriverFormData>) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

  const updateData: Record<string, unknown> = {
    Driver_Name: data.Driver_Name,
    Mobile_No: data.Mobile_No,
    Vehicle_Plate: data.Vehicle_Plate,
    Active_Status: data.Active_Status,
    Sub_ID: data.Sub_ID || null, // Fix: Convert empty string to null
  }

  if (isAdmin && data.Branch_ID) {
    updateData.Branch_ID = data.Branch_ID
  }

  // Only update password if provided
  if (data.Password && data.Password.trim() !== '') {
    updateData.Password = data.Password
  }

  try {
    let query = supabase
      .from('Master_Drivers')
      .update(updateData)
      .eq('Driver_ID', driverId)

    if (branchId && !isAdmin) {
        query = query.eq('Branch_ID', branchId)
    }

    const { error } = await query

    if (error) {
      console.error('Error updating driver:', error)
      return { success: false, message: `Failed to update driver: ${error.message} ${error.details || ''}` }
    }
  } catch (error: unknown) {
    console.error('Error updating driver:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Database error' }
  }

  revalidatePath('/drivers')
  return { success: true, message: 'Driver updated successfully' }
}

export async function deleteDriver(driverId: string) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

  let query = supabase
    .from('Master_Drivers')
    .delete()
    .eq('Driver_ID', driverId)

  if (branchId && !isAdmin) {
      query = query.eq('Branch_ID', branchId)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting driver:', error)
    return { success: false, message: `Failed to delete driver: ${error.message} ${error.details || ''}` }
  }

  revalidatePath('/drivers')
  return { success: true, message: 'Driver deleted successfully' }
}
