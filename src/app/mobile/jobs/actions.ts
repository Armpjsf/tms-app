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

/**
 * คำนวณความสูง (เมตร) จากค่าความกดอากาศ (hPa) ตามสูตร Barometric Formula
 */
function estimateAltitude(pressureHpa: number): number {
  return 44330.0 * (1.0 - Math.pow(pressureHpa / 1013.25, 0.190294957));
}

/**
 * วิเคราะห์และตรวจสอบความถูกต้องของการเดินขึ้นชั้น 2-3 ด้วยเซนเซอร์ย้อนหลัง
 */
export function verifyStairClimbing(sensorLogs: Array<{ pressure: number; steps_upward?: number }>) {
  if (!sensorLogs || sensorLogs.length < 2) {
    return {
      status: 'Suspect',
      reason: 'ไม่มีประวัติเซนเซอร์บันทึกไว้ หรือจำนวนข้อมูลน้อยเกินไป',
      elevationDiff: 0,
      totalStepsUp: 0
    };
  }

  const altitudes = sensorLogs.map(log => estimateAltitude(log.pressure));
  const steps = sensorLogs.map(log => log.steps_upward || 0);

  const baseAltitude = altitudes[0];
  const maxAltitude = Math.max(...altitudes);

  const elevationDiff = maxAltitude - baseAltitude;
  const totalStepsUp = Math.max(...steps) - Math.min(...steps);

  const MIN_ELEVATION_METERS = 2.8; // ความต่างความสูงขั้นต่ำสำหรับชั้น 2-3
  const MIN_STEPS = 15;             // ก้าวเดินขั้นต่ำ

  const isElevationPassed = elevationDiff >= MIN_ELEVATION_METERS;
  const isStepsPassed = totalStepsUp >= MIN_STEPS;

  if (isElevationPassed || isStepsPassed) {
    return {
      status: 'Verified',
      reason: `ผ่านการตรวจสอบ: พบความสูงต่างสูงสุด ${elevationDiff.toFixed(2)} เมตร และก้าวขึ้น ${totalStepsUp} ก้าว`,
      elevationDiff: Number(elevationDiff.toFixed(2)),
      totalStepsUp
    };
  } else {
    return {
      status: 'Suspect',
      reason: `ต้องสงสัยทุจริต: ความสูงต่างเพียง ${elevationDiff.toFixed(2)} เมตร (เกณฑ์ ${MIN_ELEVATION_METERS}ม.) และเดินขึ้นสะสม ${totalStepsUp} ก้าว (เกณฑ์ ${MIN_STEPS}ก้าว)`,
      elevationDiff: Number(elevationDiff.toFixed(2)),
      totalStepsUp
    };
  }
}

export async function updateJobStatus(
  jobId: string, 
  status: string, 
  driverId?: string,
  options?: {
    incentiveClaimed?: boolean;
    sensorLogs?: Array<{ pressure: number; steps_upward?: number; timestamp: number }>;
  }
) {
  try {
    const supabase = createAdminClient()

    // 1. Update Job Status & Sensor Analytics
    const updatePayload: Record<string, any> = { 
        Job_Status: status,
    }

    // ประมวลผลเซนเซอร์กรณีคนขับกดปิดงานเป็น 'Completed' หรือ 'Delivered'
    if (status === 'Completed' || status === 'Delivered') {
        // 1.1 ตรวจสอบสิทธิ์การจ่ายเงินพิเศษ (ถ้ามีระบุเข้ามา)
        if (options?.incentiveClaimed) {
            updatePayload.Incentive_Claimed = true;
            
            // อ่านค่าข้อมูลออเดอร์นี้จาก DB เพื่อดูว่าลูกค้าเปิดระบบตรวจเซนเซอร์ไว้ไหม
            const { data: jobInfo } = await supabase
                .from('Jobs_Main')
                .select('Requires_Incentive_Check')
                .eq('Job_ID', jobId)
                .single();

            if (jobInfo?.Requires_Incentive_Check && options.sensorLogs) {
                // ทำการวิเคราะห์ตรวจจับความทุจริตจากข้อมูลที่ส่งมา
                const sensorResult = verifyStairClimbing(options.sensorLogs);
                
                updatePayload.Sensor_Verified = sensorResult.status;
                updatePayload.Sensor_Max_Elevation_Diff = sensorResult.elevationDiff;
                updatePayload.Sensor_Total_Steps_Upward = sensorResult.totalStepsUp;
                updatePayload.Sensor_Logs_Json = options.sensorLogs;
                
                // แนบบันทึกผลเซนเซอร์ลงในบันทึกเพิ่มเติม
                const sensorNote = `[ระบบเซนเซอร์: ${sensorResult.status}] ${sensorResult.reason}`;
                const { data: currentJob } = await supabase.from('Jobs_Main').select('Notes').eq('Job_ID', jobId).single();
                updatePayload.Notes = currentJob?.Notes ? `${currentJob.Notes}\n${sensorNote}` : sensorNote;
            } else {
                // ถ้าออเดอร์นี้ไม่ได้สั่งเปิดตรวจสอบเซนเซอร์ ให้ผ่านการเคลมไปก่อน
                updatePayload.Sensor_Verified = 'Verified';
            }
        }

        // 1.2 คำนวณ CO2 อัตโนมัติ
        const co2Data = await calculateJobCO2(supabase, jobId)
        if (co2Data) {
            updatePayload.Notes = updatePayload.Notes 
              ? `${updatePayload.Notes}\n${co2Data.note}` 
              : co2Data.note;
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
