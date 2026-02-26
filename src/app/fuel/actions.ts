'use server'

import crypto from 'crypto'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId } from '@/lib/permissions'
import { logActivity } from '@/lib/supabase/logs'

export type FuelFormData = {
  Date_Time: string | null
  Driver_ID: string | null
  Vehicle_Plate: string | null
  Liter: number
  Price: number
  Total_Amount: number
  Mileage: number | null
  Station_Name: string | null
  Photo_Url?: string | null
}

export async function createFuelLog(data: FuelFormData) {
  try {
    const supabase = createAdminClient()
    const branchId = await getUserBranchId()

    const logId = crypto.randomUUID()

    const { error } = await supabase
      .from('Fuel_Logs')
      .insert({
        Log_ID: logId,
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
      console.error('Error creating fuel log:', error, {
          driver_id: data.Driver_ID,
          vehicle_plate: data.Vehicle_Plate,
          amount: data.Total_Amount
      })
      return { success: false, message: `Failed to create log: ${error.message}` }
    }

    // Log the activity
    await logActivity({
      module: 'Fuel',
      action_type: 'CREATE',
      target_id: logId,
      details: {
        driver: data.Driver_ID,
        vehicle: data.Vehicle_Plate,
        amount: data.Total_Amount
      }
    })

    revalidatePath('/fuel')
    return { success: true, message: 'Fuel Log created successfully' }
  } catch (err: unknown) {
    console.error("createFuelLog Exception:", err)
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return { success: false, message: errMsg }
  }
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

  // Log the activity
  await logActivity({
    module: 'Fuel',
    action_type: 'UPDATE',
    target_id: logId,
    details: {
      updated_fields: Object.keys(data),
      amount: data.Total_Amount
    }
  })

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

  // Log the activity
  await logActivity({
    module: 'Fuel',
    action_type: 'APPROVE', // Using APPROVE for status changes as requested
    target_id: logId,
    details: {
      new_status: status
    }
  })

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
