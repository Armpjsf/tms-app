'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'

export async function adminUpdateJobStatus(jobId: string, newStatus: string, note?: string) {
  const isAdmin = await isSuperAdmin()
  const supabase = isAdmin ? await createAdminClient() : await createClient()
  const branchId = await getUserBranchId()

  // 1. Verify Permission (Check if job belongs to admin's branch)
  if (!isAdmin && branchId) {
      const { data: job } = await supabase
          .from('Jobs_Main')
          .select('Branch_ID')
          .eq('Job_ID', jobId)
          .single()
      
      if (!job || job.Branch_ID !== branchId) {
          return { success: false, message: 'Unauthorized: Job belongs to another branch' }
      }
  }

  // 2. Prepare Update Data
  const updateData: Record<string, unknown> = {
      Job_Status: newStatus
  }

  // Add note if provided
  if (note) {
      updateData.Notes = note 
  }

  // Handle timestamps based on status
  const now = new Date()
  const timeString = now.toTimeString().split(' ')[0] // Provides "HH:mm:ss"
  const dateString = now.toISOString().split('T')[0]  // Provides "YYYY-MM-DD"
  
  if (newStatus === 'Picked Up') {
      updateData.Actual_Pickup_Time = timeString
      updateData.Pickup_Date = dateString
  }
  
  if (newStatus === 'Delivered' || newStatus === 'Completed') {
      updateData.Actual_Delivery_Time = timeString
      updateData.Delivery_Date = dateString
  }

  // 3. Perform Update
  const { data, error } = await supabase
    .from('Jobs_Main')
    .update(updateData)
    .eq('Job_ID', jobId)
    .select()

  if (error) {
    return { success: false, message: `Failed to update: ${error.message}` }
  }

  if (!data || data.length === 0) {
    return { success: false, message: 'No job found with the given ID' }
  }

  // 4. Log Admin Action (Optional, can be added to a logs table later)
  // No console.error or console.log statements

  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/planning')
  
  return { success: true, message: 'Job status updated successfully' }
}
