'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId } from '@/lib/permissions'

export type FuelFormData = {
  Date_Time: string
  Driver_ID: string
  Vehicle_Plate: string
  Liter: number
  Price: number
  Total_Amount: number
  Mileage: number
  Station_Name: string
  Photo_Url?: string
}

export async function createFuelLog(data: FuelFormData) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()

      const { error } = await supabase
        .from('Fuel_Logs')
        .insert({
          Log_ID: crypto.randomUUID(),
          Date_Time: data.Date_Time,
          Driver_ID: data.Driver_ID,
          Vehicle_Plate: data.Vehicle_Plate,
          Liters: data.Liter,
          Price_Total: data.Total_Amount,
          Odometer: data.Mileage,
          Station_Name: data.Station_Name,
          Photo_Url: data.Photo_Url || null,
          Branch_ID: branchId === 'All' ? null : branchId
        })

  if (error) {
    console.error('Error creating fuel log:', error)
    return { success: false, message: 'Failed to create log' }
  }

  revalidatePath('/fuel')
  return { success: true, message: 'Fuel Log created successfully' }
}

export async function updateFuelLog(logId: string, data: FuelFormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Fuel_Logs')
    .update({
      Date_Time: data.Date_Time,
      Driver_ID: data.Driver_ID,
      Vehicle_Plate: data.Vehicle_Plate,
      Liters: data.Liter,
      Price_Total: data.Total_Amount,
      Odometer: data.Mileage,
      Station_Name: data.Station_Name,
      Photo_Url: data.Photo_Url || null
    })
    .eq('Log_ID', logId)

  if (error) {
    console.error('Error updating fuel log:', error)
    return { success: false, message: 'Failed to update log' }
  }

  revalidatePath('/fuel')
  return { success: true, message: 'Fuel Log updated successfully' }
}

export async function updateFuelLogStatus(logId: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Fuel_Logs')
    .update({ Status: status })
    .eq('Log_ID', logId)

  if (error) {
    console.error('Error updating fuel log status:', error)
    return { success: false, message: 'Failed to update status' }
  }

  revalidatePath('/fuel')
  return { success: true, message: 'Status updated successfully' }
}

export async function deleteFuelLog(logId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Fuel_Logs')
    .delete()
    .eq('Log_ID', logId)

  if (error) {
    console.error('Error deleting fuel log:', error)
    return { success: false, message: 'Failed to delete log' }
  }

  revalidatePath('/fuel')
  return { success: true, message: 'Fuel Log deleted successfully' }
}
