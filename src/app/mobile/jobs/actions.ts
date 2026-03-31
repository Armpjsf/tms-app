'use server'

import { createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyAdminJobStatus } from '@/lib/actions/push-actions'

export async function updateJobStatus(jobId: string, status: string, driverId?: string) {
  try {
    const supabase = createAdminClient()

    // 1. Update Job Status
    const updatePayload: any = { 
        Job_Status: status,
    }

    // 1.1 Automatic CO2 Calculation on Completion
    if (status === 'Completed') {
        try {
            // Get current job data to get distance and vehicle info
            const { data: job } = await supabase
                .from('Jobs_Main')
                .select('Est_Distance_KM, Vehicle_Type, Notes')
                .eq('Job_ID', jobId)
                .single()

            if (job) {
                const distance = Number(job.Est_Distance_KM) || 0
                const vType = job.Vehicle_Type || '4-Wheel'
                
                // Average CO2 factors (kg CO2 per km)
                // Source: Typical industry averages
                const factors: Record<string, number> = {
                    '4-Wheel': 0.22,
                    '6-Wheel': 0.55,
                    '10-Wheel': 0.95,
                    'Trailer': 1.15
                }

                const factor = factors[vType as keyof typeof factors] || 0.22
                const co2Amount = Number((distance * factor).toFixed(2))

                // Append CO2 info to Notes if no dedicated column exists
                const co2Note = `[ESG] ปล่อย CO2: ${co2Amount} kg`
                updatePayload.Notes = job.Notes ? `${job.Notes}\n${co2Note}` : co2Note
                
                console.log(`[ESG] Calculated CO2 for ${jobId}: ${co2Amount}kg (Dist: ${distance}km, Type: ${vType})`)
            }
        } catch (e) {
            console.error('[ESG] CO2 Calculation failed:', e)
        }
    }

    const { error } = await supabase
      .from('Jobs_Main')
      .update(updatePayload)
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
