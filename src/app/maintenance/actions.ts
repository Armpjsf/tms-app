'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type TicketFormData = {
  Date_Report: string
  Driver_ID: string
  Vehicle_Plate: string
  Issue_Type: string
  Issue_Desc: string
  Priority: string
  Photo_Url?: string
}

export async function createRepairTicket(data: TicketFormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Repair_Tickets')
    .insert({
      Date_Report: data.Date_Report,
      Driver_ID: data.Driver_ID,
      Vehicle_Plate: data.Vehicle_Plate,
      Issue_Type: data.Issue_Type,
      Issue_Desc: data.Issue_Desc,
      Priority: data.Priority,
      Photo_Url: data.Photo_Url || null,
      Status: 'Pending'
    })

  if (error) {
    console.error('Error creating ticket:', error)
    return { success: false, message: 'Failed to create ticket' }
  }

  // Update vehicle status to Maintenance if priority is High
  if (data.Priority === 'High') {
      await supabase
        .from('Master_Vehicles')
        .update({ Status: 'Maintenance' })
        .eq('Vehicle_Plate', data.Vehicle_Plate)
  }

  revalidatePath('/maintenance')
  revalidatePath('/vehicles')
  return { success: true, message: 'Ticket created successfully' }
}

export async function updateRepairTicket(ticketId: string, data: any) {
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
      Issue_Desc: data.Issue_Desc,
      Priority: data.Priority,
      Driver_ID: data.Driver_ID,
      Vehicle_Plate: data.Vehicle_Plate,
      Date_Report: data.Date_Report
    })
    .eq('Ticket_ID', ticketId)

  if (error) {
    console.error('Error updating ticket:', error)
    return { success: false, message: 'Failed to update ticket' }
  }

  // If status is Completed, check if we need to release vehicle? 
  // For now, let's just update the ticket. 
  // Ideally, if finished, Vehicle Status might need to go back to 'Active'.
  if (data.Status === 'Completed' && data.Vehicle_Plate) {
     await supabase
        .from('Master_Vehicles')
        .update({ Status: 'Active' })
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
