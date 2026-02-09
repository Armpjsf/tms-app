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

export async function updateTicketStatus(ticketId: string, status: string) {
    const supabase = await createClient()
  
    const { error } = await supabase
      .from('Repair_Tickets')
      .update({ Status: status })
      .eq('Ticket_ID', ticketId)
  
    if (error) {
      console.error('Error updating ticket:', error)
      return { success: false, message: 'Failed to update ticket' }
    }
  
    revalidatePath('/maintenance')
    return { success: true, message: 'Ticket updated successfully' }
  }
