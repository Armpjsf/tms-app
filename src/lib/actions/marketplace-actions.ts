'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/supabase/logs'
import { sendPushToDriver } from '@/lib/actions/push-actions'

export type JobBid = {
  bid_id: string
  job_id: string
  driver_id: string
  driver_name: string
  bid_amount: number
  status: string
  created_at: string
}

// ฝั่งคนขับ: ดึงงานที่ยังไม่มีคนรับ
export async function getUnassignedJobs() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('Jobs_Main')
    .select('*')
    .in('Job_Status', ['New', 'Requested'])
    .is('Driver_ID', null)
    .order('Created_At', { ascending: false })

  if (error) {
    console.error('Error fetching unassigned jobs:', error)
    return []
  }

  return data
}

// ฝั่งคนขับ: ดึงข้อมูลการประมูลของตัวเองสำหรับงานนี้ (ถ้าเคยเสนอไปแล้ว)
export async function getMyBidForJob(jobId: string, driverId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('Job_Bids')
        .select('*')
        .eq('job_id', jobId)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    return data as JobBid | null
}

// ฝั่งคนขับ: เสนอราคา
export async function submitBid(jobId: string, driverId: string, driverName: string, amount: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Job_Bids')
    .insert({
      job_id: jobId,
      driver_id: driverId,
      driver_name: driverName,
      bid_amount: amount,
      status: 'Pending'
    })

  if (error) {
    console.error('Error submitting bid:', error)
    return { success: false, message: 'เกิดข้อผิดพลาดในการเสนอราคา' }
  }

  revalidatePath('/mobile/marketplace')
  revalidatePath('/dashboard') // Update admin dashboard
  
  await logActivity({
      module: 'Jobs',
      action_type: 'CREATE',
      target_id: jobId,
      details: { description: `Driver ${driverName} bid ฿${amount} for job ${jobId}` }
  })

  return { success: true, message: 'เสนอราคาสำเร็จ! แอดมินกำลังตรวจสอบข้อเสนอของคุณ' }
}

// ฝั่งแอดมิน: ดึงรายการประมูลทั้งหมดของแต่ละงาน
export async function getBidsForJob(jobId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('Job_Bids')
        .select('*')
        .eq('job_id', jobId)
        .order('bid_amount', { ascending: true }) // เรียงจากราคาถูกสุดขึ้นก่อน
        
    if (error) {
        console.error('Error fetching bids:', error)
        return []
    }
    return data as JobBid[]
}

// ฝั่งแอดมิน: ดึงรายการประมูลทั้งหมดสำหรับงาน Unassigned ที่รออยู่
export async function getAllActiveBids() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('Job_Bids')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
        
    if (error) {
        console.error('Error fetching all bids:', error)
        return []
    }
    return data as JobBid[]
}

// ฝั่งแอดมิน: ยืนยันเลือกคนขับ (Accept Bid)
export async function acceptBid(jobId: string, bidId: string, driverId: string, driverName: string, amount: number) {
    const supabase = await createClient()

    // 1. อัปเดตตาราง Jobs_Main (จ่ายงานให้คนขับ และลงราคาจ้าง)
    const { error: updateJobError } = await supabase
        .from('Jobs_Main')
        .update({
            Driver_ID: driverId,
            Driver_Name: driverName,
            Cost_Driver_Total: amount,
            Job_Status: 'Assigned' // เปลี่ยนสถานะเพื่อไม่ให้อยู่ใน Marketplace อีก
        })
        .eq('Job_ID', jobId)

    if (updateJobError) {
        console.error('Error updating job with winner:', updateJobError)
        return { success: false, message: 'ไม่สามารถอัปเดตงานได้' }
    }

    // 2. อัปเดตให้ Bid นี้เป็น Accepted
    await supabase
        .from('Job_Bids')
        .update({ status: 'Accepted' })
        .eq('bid_id', bidId)

    // 3. ปฏิเสธการประมูลอื่นๆ ของงานนี้ (Rejected)
    await supabase
        .from('Job_Bids')
        .update({ status: 'Rejected' })
        .eq('job_id', jobId)
        .neq('bid_id', bidId)

    // แจ้งเตือน Push Notification หาคนขับ
    await sendPushToDriver(driverId, {
      title: '🎉 ยินดีด้วย! คุณได้รับงานจากการประมูล',
      body: `แอดมินยืนยันให้คุณรับงาน ${jobId} แล้วในราคา ฿${amount}`,
      url: `/mobile/jobs/${jobId}`
    })

    revalidatePath('/dashboard')
    revalidatePath('/planning')
    revalidatePath('/jobs')

    await logActivity({
        module: 'Jobs',
        action_type: 'UPDATE',
        target_id: jobId,
        details: { description: `Admin accepted bid from ${driverName} at ฿${amount}` }
    })

    return { success: true, message: 'ยืนยันเลือกคนขับรถสำเร็จ งานถูกส่งให้คนขับแล้ว!' }
}
