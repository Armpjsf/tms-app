'use server'

import crypto from 'crypto'

import { createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { uploadFileToDrive } from '@/lib/google-drive'
import { createNotification } from '@/lib/actions/notification-actions'

export async function submitVehicleCheck(formData: FormData) {
  try {
    const supabase = createAdminClient()
    const timestamp = Date.now()
    const logId = crypto.randomUUID()

    const driverId = formData.get("driverId") as string
    const driverName = formData.get("driverName") as string
    const vehiclePlate = formData.get("vehiclePlate") as string
    const itemsRaw = formData.get("items") as string
    
    // DEBUG LOGS
    console.log(`[${logId}] [FormData] Keys:`, Array.from(formData.keys()))
    const reportVal = formData.get("check_report")
    const sigVal = formData.get("signature")
    console.log(`[${logId}] [FormData] check_report type:`, reportVal instanceof File ? `File (size: ${reportVal.size})` : typeof reportVal)
    console.log(`[${logId}] [FormData] signature type:`, sigVal instanceof File ? `File (size: ${sigVal.size})` : typeof sigVal)
    console.log(`[${logId}] [FormData] photo_count:`, formData.get("photo_count"))
    
    let items = {}
    if (itemsRaw) {
        try {
            items = JSON.parse(itemsRaw)
        } catch (e) {
            console.error("Failed to parse vehicle check items:", e)
        }
    }

    // Helper for Upload
    const uploadWithRename = async (file: File, name: string, folder: string) => {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const res = await uploadFileToDrive(buffer, name, file.type, folder)
        return res.directLink
      } catch (err: any) {
        const msg = err.message || String(err)
        console.error(`[UploadHelper] Failed: ${name}`, msg)
        throw err 
      }
    }

    // 1. Process media
    const photoUrls: string[] = []
    const failures: string[] = []
    
    // 0. Check Report (Smart Document)
    const checkReportFile = formData.get("check_report") as File
    let checkReportUrl = null
    if (checkReportFile && checkReportFile.size > 0) {
      try {
        const name = `${driverId}_check_REPORT_${timestamp}.jpg`
        console.log(`[${logId}] [Drive] Uploading Check Report: ${name}`)
        
        const buffer = Buffer.from(await checkReportFile.arrayBuffer())
        const res = await uploadFileToDrive(buffer, name, checkReportFile.type, 'Vehicle_Check_Documents')
        
        checkReportUrl = res.directLink
        console.log(`[${logId}] [Drive] Report Uploaded. ID: ${res.fileId}`)
      } catch (e: any) {
        console.error(`[${logId}] [Drive] Failed to upload Check Report:`, e)
        failures.push(`รายงาน (${e.message || 'Error'})`)
      }
    }

    const photoCount = parseInt(formData.get("photo_count") as string || "0")
    
    for (let i = 0; i < photoCount; i++) {
      const file = formData.get(`photo_${i}`) as File
      if (file && file.size > 0) {
        try {
          const name = `${driverId}_check_${timestamp}_${i}.jpg`
          console.log(`[${logId}] [Drive] Uploading photo ${i}: ${name}`)
          
          const buffer = Buffer.from(await file.arrayBuffer())
          const res = await uploadFileToDrive(buffer, name, file.type, 'Vehicle_Checks')
          
          if (res.directLink) {
            photoUrls.push(res.directLink)
            console.log(`[${logId}] [Drive] Photo ${i} Uploaded. ID: ${res.fileId}`)
          }
        } catch (e: any) {
          console.error(`[${logId}] [Drive] Failed to upload photo ${i}:`, e)
          failures.push(`รูปถ่าย ${i + 1} (${e.message || 'Error'})`)
        }
      }
    }

    if (checkReportUrl) {
      photoUrls.unshift(checkReportUrl)
    }


    const signatureFile = formData.get("signature") as File
    let signatureUrl = null
    if (signatureFile && signatureFile.size > 0) {
      try {
        const name = `${driverId}_check_sig_${timestamp}.png`
        console.log(`[${logId}] [Drive] Uploading signature: ${name}`)
        
        const buffer = Buffer.from(await signatureFile.arrayBuffer())
        const res = await uploadFileToDrive(buffer, name, signatureFile.type, 'Vehicle_Check_Signatures')
        
        signatureUrl = res.directLink
        console.log(`[${logId}] [Drive] Signature Uploaded. ID: ${res.fileId}`)
      } catch (e: any) {
        console.error(`[${logId}] [Drive] Failed to upload signature:`, e)
        failures.push(`ลายเซ็น (${e.message || 'Error'})`)
      }
    }

    // Diagnostics: Warn if no photos/signatures but expected
    if (photoCount > 0 && photoUrls.length === 0) {
        console.warn(`[${logId}] [Drive] WARNING: Expected ${photoCount} photos but 0 were uploaded.`)
    }

    // 2. Insert to DB
    console.log(`[${logId}] [DB] Saving Vehicle_Check entry...`)
    const { error } = await supabase
      .from('Vehicle_Checks')
      .insert({
        Driver_ID: driverId,
        Driver_Name: driverName,
        Vehicle_Plate: vehiclePlate,
        Check_Date: new Date().toISOString(),
        Passed_Items: items,
        Photo_Urls: photoUrls.join(','),
        Signature_Url: signatureUrl
      })

    if (error) {
      console.error(`[${logId}] [DB] Error saving vehicle check:`, error)
      return { success: false, message: `บันทึกไม่สำเร็จ (DB Error): ${error.message}` }
    }

    const failureMsg = failures.length > 0 ? `\n(แต่บางไฟล์อัปโหลดไม่สำเร็จ: ${failures.join(", ")})` : ""
    const finalMsg = `บันทึกการตรวจสอบเรียบร้อยแล้ว${failureMsg}`

    console.log(`[${logId}] [Final] Success. Records and files saved.`)
    revalidatePath('/mobile/vehicle-check')
    revalidatePath('/admin/vehicle-checks')

    // Create Admin Notification
    try {
        await createNotification({
          Driver_ID: 'admin', // Targeting admin
          Title: 'มีการแจ้งตรวจเช็ครถใหม่',
          Message: `คนขับ ${driverName} ได้ทำการตรวจเช็ครถทะเบียน ${vehiclePlate}`,
          Type: 'info'
        })
    } catch (notiError) {
        console.error(`[${logId}] Silent failure creating notification:`, notiError)
    }

    return { success: true, message: finalMsg }

  } catch (err: unknown) {
    console.error("submitVehicleCheck Exception:", err)
    const errMsg = err instanceof Error ? err.message : "Unknown error"
    return { success: false, message: `เกิดข้อผิดพลาดในการบันทึก: ${errMsg}` }
  }
}

