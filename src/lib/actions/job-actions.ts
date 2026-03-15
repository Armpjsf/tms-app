"use server"

import { createClient } from '@/utils/supabase/server'
import { logActivity } from '@/lib/supabase/logs'
import { revalidatePath } from 'next/cache'

export async function verifyJob(
  jobId: string, 
  status: 'Verified' | 'Rejected', 
  note?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { error } = await supabase
      .from('Jobs_Main')
      .update({
        Verification_Status: status,
        Verification_Note: note,
        Verified_By: user.email,
        Verified_At: new Date().toISOString()
      })
      .eq('Job_ID', jobId)

    if (error) throw error

    await logActivity({
      module: 'Jobs',
      action_type: 'APPROVE',
      target_id: jobId,
      details: { status, note }
    })

    revalidatePath('/jobs/history')
    return { success: true }
  } catch (err) {
    const error = err as Error
    console.error('Error verifying job:', error)
    return { success: false, error: error.message }
  }
}
