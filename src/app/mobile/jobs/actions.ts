'use server'

import { createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyAdminJobStatus } from '@/lib/actions/push-actions'

import { SupabaseClient } from '@supabase/supabase-js'

import { CO2_COEFFICIENTS } from '@/lib/utils/esg-utils'

/**
 * Helper to calculate CO2 based on distance and vehicle type
 */
export async function calculateJobCO2(supabase: SupabaseClient, jobId: string) {
    try {
        const { data: job } = await supabase
            .from('Jobs_Main')
            .select('Est_Distance_KM, Actual_Distance_KM, Vehicle_Type')
            .eq('Job_ID', jobId)
            .single()

        if (!job) return null

        const distance = Number(job.Est_Distance_KM) || 12.5
        const vType = job.Vehicle_Type || '4-Wheel'
        
        const factor = CO2_COEFFICIENTS[vType as keyof typeof CO2_COEFFICIENTS] || CO2_COEFFICIENTS['default']
        const co2Amount = Number((distance * factor).toFixed(2))
        
        return {
            amount: co2Amount,
            note: `[ESG] ปล่อย CO2: ${co2Amount} kg`
        }
    } catch (e) {
        console.error('[ESG] CO2 Calculation failed:', e)
        return null
    }
}

export async function updateJobStatus(jobId: string, status: string, driverId?: string) {
  try {
    const supabase = createAdminClient()

    // 1. Update Job Status
    const updatePayload: Record<string, string | number | boolean | null> = { 
        Job_Status: status,
    }

    // 1.1 Automatic CO2 Calculation on Completion
    if (status === 'Completed') {
        const co2Data = await calculateJobCO2(supabase, jobId)
        if (co2Data) {
            const { data: currentJob } = await supabase.from('Jobs_Main').select('Notes').eq('Job_ID', jobId).single()
            updatePayload.Notes = currentJob?.Notes ? `${currentJob.Notes}\n${co2Data.note}` : co2Data.note
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

export async function updateBatchJobStatus(jobIds: string[], status: string, driverId?: string) {
    try {
        const supabase = createAdminClient()
        
        // 1. Update all jobs in the list
        const { error } = await supabase
            .from('Jobs_Main')
            .update({ Job_Status: status })
            .in('Job_ID', jobIds)
        
        if (error) throw error

        // 2. Notify admin once for the batch
        if (driverId && jobIds.length > 0) {
            const { data: driver } = await supabase.from('Master_Drivers').select('Driver_Name').eq('Driver_ID', driverId).single()
            notifyAdminJobStatus(
                driverId,
                driver?.Driver_Name || 'คนขับ',
                `${jobIds[0]} (+${jobIds.length - 1} รายการ)`,
                status
            ).catch(() => {})
        }

        revalidatePath('/mobile/jobs')
        revalidatePath('/monitoring')
        return { success: true }
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "Batch update failed" }
    }
}

import { getJobById } from "@/lib/supabase/jobs"

export async function getJobDetails(jobId: string) {
    const job = await getJobById(jobId)
    return job
}

export async function createSOSAlert(params: { type: string, lat: number, lng: number, message: string }) {
    try {
        const supabase = createAdminClient()
        // Simple insert for now
        const { error } = await supabase
            .from('SOS_Alerts')
            .insert({
                Alert_Type: params.type,
                Latitude: params.lat,
                Longitude: params.lng,
                Message: params.message,
                Is_Active: true
            })

        if (error) throw error

        revalidatePath('/mobile/jobs')
        return { success: true }
    } catch (err) {
        console.error('SOS failed:', err)
        return { success: false, message: "SOS Failed" }
    }
}
