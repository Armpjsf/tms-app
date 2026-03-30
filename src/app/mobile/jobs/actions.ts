'use server'

import { createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyAdminJobStatus } from '@/lib/actions/push-actions'

export async function updateJobStatus(jobId: string, status: string, driverId?: string) {
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
      return { success: false, message: `Failed to update status: ${error.message}` }
    }

    // 2. Push notify admin (fire-and-forget)
    if (driverId) {
      const { data: driver } = await supabase
        .from('Master_Drivers')
        .select('Driver_Name')
        .eq('Driver_ID', driverId)
        .single()
      
      notifyAdminJobStatus(
        driverId,
        driver?.Driver_Name || 'คนขับ',
        jobId,
        status
      ).catch(() => {})
    }

    revalidatePath(`/mobile/jobs/${jobId}`)
    revalidatePath('/mobile/jobs')
    revalidatePath('/monitoring') 
    
    return { success: true, message: 'Status updated successfully' }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Internal Server Error" }
  }
}

import { getJobById } from "@/lib/supabase/jobs"

export async function getJobDetails(jobId: string) {
    const job = await getJobById(jobId)
    return job
}
