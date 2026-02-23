'use server'

import crypto from 'crypto'

import { createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { uploadFileToDrive } from '@/lib/google-drive'

export async function submitVehicleCheck(formData: FormData) {
  try {
    const supabase = createAdminClient()
    const timestamp = Date.now()
    const logId = crypto.randomUUID()

    const driverId = formData.get("driverId") as string
    const driverName = formData.get("driverName") as string
    const vehiclePlate = formData.get("vehiclePlate") as string
    const itemsRaw = formData.get("items") as string
    
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
      const buffer = Buffer.from(await file.arrayBuffer())
      const res = await uploadFileToDrive(buffer, name, file.type, folder)
      return res.directLink
    }

    // 1. Process media
    const photoUrls: string[] = []
    
    // 0. Check Report (Smart Document)
    const checkReportFile = formData.get("check_report") as File
    let checkReportUrl = null
    if (checkReportFile && checkReportFile.size > 0) {
      try {
        const name = `${driverId}_check_REPORT_${timestamp}.jpg`
        checkReportUrl = await uploadWithRename(checkReportFile, name, 'Vehicle_Check_Documents')
      } catch (e) {
        console.error(`[${logId}] Failed to upload Check Report:`, e)
      }
    }

    const photoCount = parseInt(formData.get("photo_count") as string || "0")
    
    for (let i = 0; i < photoCount; i++) {
      const file = formData.get(`photo_${i}`) as File
      if (file && file.size > 0) {
        try {
          const name = `${driverId}_check_${timestamp}_${i}.jpg`
          const url = await uploadWithRename(file, name, 'Vehicle_Checks')
          if (url) photoUrls.push(url)
        } catch (e) {
          console.error(`[${logId}] Failed to upload photo ${i}:`, e)
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
        signatureUrl = await uploadWithRename(signatureFile, name, 'Vehicle_Check_Signatures')
      } catch (e) {
        console.error(`[${logId}] Failed to upload signature:`, e)
      }
    }

    // 2. Insert to DB
    const { error } = await supabase
      .from('Vehicle_Checks')
      .insert({
        log_id: logId,
        driver_id: driverId,
        driver_name: driverName,
        vehicle_plate: vehiclePlate,
        checked_at: new Date().toISOString(),
        check_items: items,
        Photo_Urls: photoUrls.join(','),
        Signature_Url: signatureUrl
      })

    if (error) {
      console.error('Error saving vehicle check:', error)
      return { success: false, message: `บันทึกไม่สำเร็จ: ${error.message}` }
    }

    revalidatePath('/mobile/vehicle-check')
    return { success: true, message: 'บันทึกการตรวจสอบเรียบร้อยแล้ว' }

  } catch (err: unknown) {
    console.error("submitVehicleCheck Exception:", err)
    const errMsg = err instanceof Error ? err.message : "Unknown error"
    return { success: false, message: `เกิดข้อผิดพลาดในการบันทึก: ${errMsg}` }
  }
}

