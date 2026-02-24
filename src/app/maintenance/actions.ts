'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId } from '@/lib/permissions'

export type TicketFormData = {
  Date_Report: string | null
  Driver_ID: string | null
  Vehicle_Plate: string | null
  Issue_Type: string | null
  Description: string | null
  Priority: string | null
  Odometer?: number | null
  Photo_Url?: string | null
}

export async function createRepairTicket(data: TicketFormData) {
  try {
    const supabase = createAdminClient()
    const branchId = await getUserBranchId()

    const { error } = await supabase
      .from('Repair_Tickets')
      .insert({
        Ticket_ID: `TCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        Date_Report: data.Date_Report,
        Driver_ID: data.Driver_ID,
        Vehicle_Plate: data.Vehicle_Plate,
        Issue_Type: data.Issue_Type,
        Description: `[Priority: ${data.Priority}] ${data.Odometer ? '[Odo: ' + data.Odometer + '] ' : ''}${data.Description}`,
        Photo_Url: data.Photo_Url || null,
        Status: 'Pending',
        Branch_ID: branchId === 'All' ? null : branchId
      })

    if (error) {
      console.error('Error creating ticket:', error, {
          driver_id: data.Driver_ID,
          vehicle_plate: data.Vehicle_Plate,
          issue_type: data.Issue_Type,
          priority: data.Priority
      })
      return { success: false, message: `Failed to create ticket: ${error.message}` }
    }

    // Update vehicle status to Maintenance if priority is High
    if (data.Priority === 'High') {
        await supabase
          .from('Master_Vehicles')
          .update({ Active_Status: 'Maintenance' })
          .eq('Vehicle_Plate', data.Vehicle_Plate)
    }

    revalidatePath('/maintenance')
    revalidatePath('/vehicles')
    return { success: true, message: 'Ticket created successfully' }
  } catch (err: unknown) {
    console.error("createRepairTicket Exception:", err)
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return { success: false, message: errMsg }
  }
}

export type TicketUpdateData = TicketFormData & {
  Status?: string | null
  Cost_Total?: number | null
  Remark?: string | null
  Date_Finish?: string | null
}

export async function updateRepairTicket(ticketId: string, data: TicketUpdateData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Repair_Tickets')
    .update({
      Status: data.Status,
      Cost_Total: data.Cost_Total || 0,
      Remark: data.Remark || null,
      Date_Finish: data.Date_Finish || null,
      // Allow updating basic info too if needed
      Issue_Type: data.Issue_Type,
      Description: data.Description,
      Priority: data.Priority,
      Driver_ID: data.Driver_ID,
      Vehicle_Plate: data.Vehicle_Plate,
      Date_Report: data.Date_Report
    })
    .eq('Ticket_ID', ticketId)

  if (error) {
    console.error('Error updating ticket:', error)
    return { success: false, message: `Failed to update ticket: ${error.message}` }
  }

  // If status is Completed, check if we need to release vehicle? 
  // For now, let's just update the ticket. 
  // Ideally, if finished, Vehicle Status might need to go back to 'Active'.
  if (data.Status === 'Completed' && data.Vehicle_Plate) {
     await supabase
        .from('Master_Vehicles')
        .update({ Active_Status: 'Active' })
        .eq('Vehicle_Plate', data.Vehicle_Plate)
  }

  revalidatePath('/maintenance')
  return { success: true, message: 'Ticket updated successfully' }
}

export async function deleteRepairTicket(ticketId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Repair_Tickets')
    .delete()
    .eq('Ticket_ID', ticketId)

  if (error) {
    console.error('Error deleting ticket:', error)
    return { success: false, message: 'Failed to delete ticket' }
  }

  revalidatePath('/maintenance')
  return { success: true, message: 'Ticket deleted successfully' }
}
