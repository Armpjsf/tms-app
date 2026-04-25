'use server'

import crypto from 'crypto'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId } from '@/lib/permissions'
import { logActivity } from '@/lib/supabase/logs'
import { analyzeFuelLog } from '@/lib/actions/fleet-intelligence-actions'

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

    // Support for both crypto.randomUUID and a simple fallback if needed
    let logId: string;
    try {
        logId = crypto.randomUUID();
    } catch {
        logId = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }

    const insertData = {
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
    };


    const { error } = await supabase
      .from('Fuel_Logs')
      .insert(insertData)

    if (error) {
      return { success: false, message: `Failed to create log: ${error.message}` }
    }

    // Trigger Intelligence Analysis
    analyzeFuelLog(logId).catch(err => console.error("Fuel analysis failed:", err))

    // Trigger Admin Alert (Push & Toast)
    try {
        const { sendPushToAdmins } = await import('@/lib/actions/push-actions')
        await sendPushToAdmins({
            title: '⛽ แจ้งเติมน้ำมันใหม่',
            body: `ทะเบียน: ${data.Vehicle_Plate} • จำนวน: ${data.Liter} ลิตร`,
            url: '/fuel',
            type: 'standard'
        }, branchId)
    } catch (e) {
        console.error("Notification broadcast failed:", e)
    }

    // Log the activity (This also populates the Admin Bell Icon via getNotifications)
    await logActivity({
      module: 'Fuel',
      action_type: 'CREATE',
      target_id: logId,
      branch_id: branchId === 'All' ? undefined : branchId,
      details: {
        alert_type: 'FUEL',
        vehicle: data.Vehicle_Plate,
        amount: data.Liter,
        message: `ทะเบียน: ${data.Vehicle_Plate} • จำนวน: ${data.Liter} ลิตร`
      }
    })

    revalidatePath('/fuel')
    return { success: true, message: 'Fuel Log created successfully' }
  } catch (err: unknown) {
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
    return { success: false, message: 'Failed to update log' }
  }

  // Trigger Intelligence Analysis
  analyzeFuelLog(logId).catch(err => console.error("Fuel analysis failed:", err))

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

  const { error, data } = await supabase
    .from('Fuel_Logs')
    .update({ Status: status })
    .eq('Log_ID', logId)
    .select()

  if (error) {
    return { success: false, message: 'Failed to update status' }
  }

  if (data && data.length > 0) {
      const log = data[0]
      if (log.Driver_ID) {
          const { notifyFuelApproval } = await import('@/lib/actions/push-actions')
          try {
              await notifyFuelApproval(log.Driver_ID, log.Status, log.Liters || 0)
          } catch (e) {
              console.error("Failed to push fuel notification:", e)
          }
      }
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
    return { success: false, message: 'Failed to delete log' }
  }

  revalidatePath('/fuel')
  return { success: true, message: 'Fuel Log deleted successfully' }
}
