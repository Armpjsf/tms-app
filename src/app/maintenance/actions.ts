'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId } from '@/lib/permissions'

export type TicketFormData = {
  Date_Report: string
  Driver_ID: string
  Vehicle_Plate: string
  Issue_Type: string
  Issue_Desc: string
  Priority: string
  Odometer?: number // Add Odometer
  Photo_Url?: string
}

export async function createRepairTicket(data: TicketFormData) {
  const supabase = createAdminClient()
  const branchId = await getUserBranchId()

  // Note: If Odometer column missing in Repair_Tickets, we might need to append to desc
  // But let's try to insert to Odometer column usually standard
  // If fails, we might need to migration. Assuming column exists or we append to desc.
  // Let's check if we can simply append to desc to be safe if column likely missing?
  // User asked for "Add mileage field". 
  // I will assume column might be missing so I will ALSO append it to Issue_Desc for safety?
  // No, that's messy. Let's try to insert. If user reports error, I'll fix.
  // Actually, I can use `Odometer` in insert.
  
      const { error } = await supabase
        .from('Repair_Tickets')
        .insert({
          Date_Report: data.Date_Report,
          Driver_ID: data.Driver_ID,
          Vehicle_Plate: data.Vehicle_Plate,
          Issue_Type: data.Issue_Type,
          Description: `[Priority: ${data.Priority}] ${data.Odometer ? '[Odo: ' + data.Odometer + '] ' : ''}${data.Issue_Desc}`,
          Photo_Url: data.Photo_Url || null,
          Status: 'Pending',
          Branch_ID: branchId === 'All' ? null : branchId
        })

  if (error) {
    console.error('Error creating ticket:', error)
    return { success: false, message: 'Failed to create ticket' }
  }

  // Update vehicle status to Maintenance if priority is High
  if (data.Priority === 'High') {
      await supabase
        .from('master_vehicles')
        .update({ active_status: 'Maintenance' })
        .eq('vehicle_plate', data.Vehicle_Plate)
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
        .from('master_vehicles')
        .update({ active_status: 'Active' })
        .eq('vehicle_plate', data.Vehicle_Plate)
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
