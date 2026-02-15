'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateJobStatus(jobId: string, status: string, location?: string) {
  const supabase = await createClient()

  // 1. Update Job Status
  const { error } = await supabase
    .from('Jobs_Main')
    .update({ 
        Job_Status: status,
        // Optional: Update actual timestamps based on status if needed
        // e.g. Actual_Pickup_Time when Arrived Pickup, etc.
    })
    .eq('Job_ID', jobId)

  if (error) {
    console.error('Error updating job status:', error)
    return { success: false, message: 'Failed to update status' }
  }

  // 2. Log History/Tracking (Optional but recommended)
  // For now, we assume simple status update is enough

  revalidatePath(`/mobile/jobs/${jobId}`)
  revalidatePath('/mobile/jobs')
  revalidatePath('/monitoring') // Update live ops
  
  return { success: true, message: 'Status updated successfully' }
}

import { getJobById } from "@/lib/supabase/jobs"

export async function getJobDetails(jobId: string) {
    const job = await getJobById(jobId)
    return job
}
