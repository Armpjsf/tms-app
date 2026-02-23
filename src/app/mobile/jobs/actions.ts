'use server'

import { createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateJobStatus(jobId: string, status: string) {
  try {
    const supabase = createAdminClient()

    // 1. Update Job Status
    const { error } = await supabase
      .from('Jobs_Main')
      .update({ 
          Job_Status: status,
      })
      .eq('Job_ID', jobId)

    if (error) {
      console.error(`[JobStatusUpdate] Error for jobId ${jobId}:`, error)
      return { success: false, message: `Failed to update status: ${error.message}` }
    }

    revalidatePath(`/mobile/jobs/${jobId}`)
    revalidatePath('/mobile/jobs')
    revalidatePath('/monitoring') 
    
    return { success: true, message: 'Status updated successfully' }
  } catch (err) {
    console.error(`[JobStatusUpdate] Exception for jobId ${jobId}:`, err)
    return { success: false, message: err instanceof Error ? err.message : "Internal Server Error" }
  }
}

import { getJobById } from "@/lib/supabase/jobs"

export async function getJobDetails(jobId: string) {
    const job = await getJobById(jobId)
    return job
}
