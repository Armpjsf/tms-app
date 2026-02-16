'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'

export async function adminUpdateJobStatus(jobId: string, newStatus: string, note?: string) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

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
      Job_Status: newStatus,
      Updated_At: new Date().toISOString()
  }

  // Add note if provided
  if (note) {
      updateData.Note = note // Assuming 'Note' column exists, otherwise we might need to append to existing notes or ignore
  }

  // Complete the job timestamps if finishing
  if (newStatus === 'Delivered' || newStatus === 'Completed') {
      updateData.Actual_Finish_Time = new Date().toISOString()
  }

  // If cancelling
  if (newStatus === 'Cancelled') {
    // Maybe clear driver? No, keep history.
  }

  // 3. Perform Update
  const { error } = await supabase
    .from('Jobs_Main')
    .update(updateData)
    .eq('Job_ID', jobId)

  if (error) {
    console.error('Error admin updating job:', error)
    return { success: false, message: `Failed to update: ${error.message}` }
  }

  // 4. Log Admin Action (Optional, can be added to a logs table later)
  // console.log(`Admin updated job ${jobId} to ${newStatus}`)

  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/jobs')
  revalidatePath('/planning')
  
  return { success: true, message: 'Job status updated successfully' }
}
