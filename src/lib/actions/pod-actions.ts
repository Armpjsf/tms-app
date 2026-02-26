"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { uploadFileToSupabase } from "@/lib/actions/supabase-upload"

export async function submitJobPOD(jobId: string, formData: FormData) {
  const supabase = createAdminClient()

  const photoFile = formData.get("photo") as File
  const signatureFile = formData.get("signature") as File
  
  console.log("--- submitJobPOD Debug ---")
  console.log("Job ID:", jobId)
  
  const hasLegacyPhoto = !!photoFile && photoFile.size > 0
  const hasNewPhoto = !!formData.get("photo_0")
  const hasPhotos = hasLegacyPhoto || hasNewPhoto
  
  const hasSignature = !!signatureFile && signatureFile.size > 0

  if (!hasPhotos) {
      return { error: "ไม่พบรูปถ่ายสินค้า (กรุณาลองถ่ายใหม่)" }
  }
  if (!hasSignature) {
      return { error: "ไม่พบลายเซ็น (กรุณาเซ็นใหม่)" }
  }

  try {
    const timestamp = Date.now()
    
    const uploadWithRename = async (file: File, name: string, folder: string) => {
        try {
            const buffer = Buffer.from(await file.arrayBuffer())
            const res = await uploadFileToSupabase(buffer, name, file.type, folder)
            return res.directLink
        } catch (e) {
            console.error(`Failed to upload ${name}:`, e)
            throw e
        }
    }

    const uploadPromises: Promise<string | null>[] = []
    
    const podReportFile = formData.get("pod_report") as File
    let podReportUrl = null
    
    if (podReportFile && podReportFile.size > 0) {
        try {
            const reportName = `${jobId}_${timestamp}_REPORT.jpg`
            podReportUrl = await uploadWithRename(podReportFile, reportName, 'POD_Documents')
        } catch (err) {
            console.error("Failed to upload POD Report", err)
        }
    }

    const photoCount = parseInt(formData.get("photo_count") as string || "0")
    
    if (photoCount === 0 && formData.get("photo")) {
        const legacyPhoto = formData.get("photo") as File
        const name = `${jobId}_${timestamp}_photo.jpg`
        uploadPromises.push(uploadWithRename(legacyPhoto, name, 'POD_Photos'))
    } else {
        for (let i = 0; i < photoCount; i++) {
            const file = formData.get(`photo_${i}`) as File
            if (file) {
                const name = `${jobId}_${timestamp}_photo_${i}.jpg`
                uploadPromises.push(uploadWithRename(file, name, 'POD_Photos'))
            }
        }
    }

    const sigName = `${jobId}_${timestamp}_sig.png`
    const sigPromise = uploadWithRename(signatureFile, sigName, 'POD_Signatures')

    const [signatureUrl, ...photoResults] = await Promise.all([
        sigPromise,
        ...uploadPromises
    ])

    let photoUrls = photoResults.filter(url => url !== null) as string[]
    
    if (podReportUrl) {
        photoUrls = [podReportUrl, ...photoUrls]
    }

    const photoUrlString = photoUrls.join(',')

    if (!signatureUrl) throw new Error("Signature upload failed")

    const now = new Date()
    const nowIso = now.toISOString()
    const timeString = now.toTimeString().split(' ')[0] 
    
    const { error: updateError } = await supabase
      .from("Jobs_Main")
      .update({
        Job_Status: "Completed", 
        Photo_Proof_Url: photoUrlString,
        Signature_Url: signatureUrl,
        Actual_Delivery_Time: timeString,
        Delivery_Date: nowIso.split('T')[0]
      })
      .eq("Job_ID", jobId)

    if (updateError) throw updateError

    try {
        const { generateJobPDF } = await import("@/lib/actions/report-actions")
        generateJobPDF(jobId).then(res => {
            if (res.success) console.log("Automated Report Generated:", res.url)
        })
    } catch (reportErr) {
        console.error("Automated Report Trigger Failed:", reportErr)
    }

    revalidatePath("/mobile/jobs")
    return { success: true }

  } catch (error: any) {
    console.error(`[submitJobPOD] Catch Error for jobId ${jobId}:`, error)
    
    let errorMessage = "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
    if (typeof error === 'string') errorMessage = error
    else if (error instanceof Error) errorMessage = error.message
    else if (error && typeof error === 'object') {
        try {
            errorMessage = error.message || JSON.stringify(error)
        } catch (err) {
            console.error("Error stringifying error:", err)
            errorMessage = String(error)
        }
    }

    return { error: `บันทึกไม่สำเร็จ (POD): ${errorMessage}` }
  }
}

export async function submitJobPickup(jobId: string, formData: FormData) {
  const supabase = createAdminClient()

  try {
    const timestamp = Date.now()
    const photoUrls: string[] = []
    let signatureUrl: string | null = null
    let uploadWarning = ""
    
    try {
      const uploadWithRename = async (file: File, name: string, folder: string) => {
          const buffer = Buffer.from(await file.arrayBuffer())
          const res = await uploadFileToSupabase(buffer, name, file.type, folder)
          return res.directLink
      }

      const pickupReportFile = formData.get("pickup_report") as File
      let pickupReportUrl = null
      
      if (pickupReportFile && pickupReportFile.size > 0) {
          try {
              const reportName = `${jobId}_${timestamp}_PICKUP_REPORT.jpg`
              pickupReportUrl = await uploadWithRename(pickupReportFile, reportName, 'Pickup_Documents')
          } catch (err) {
              console.error("Failed to upload Pickup Report", err)
          }
      }

      const photoCount = parseInt(formData.get("photo_count") as string || "0")
      for (let i = 0; i < photoCount; i++) {
          const file = formData.get(`photo_${i}`) as File
          if (file) {
              const name = `${jobId}_${timestamp}_pickup_${i}.jpg`
              const url = await uploadWithRename(file, name, 'Pickup_Photos')
              if (url) photoUrls.push(url)
          }
      }

      if (pickupReportUrl) {
          photoUrls.unshift(pickupReportUrl)
      }

      const signatureFile = formData.get("signature") as File
      if (signatureFile && signatureFile.size > 0) {
          const sigName = `${jobId}_${timestamp}_pickup_sig.png`
          signatureUrl = await uploadWithRename(signatureFile, sigName, 'Pickup_Signatures')
      }
    } catch (e: any) {
      const errMsg = e instanceof Error ? e.message : String(e)
      console.error("Supabase Storage upload failed:", errMsg)
      uploadWarning = `อัปโหลดหลักฐานไม่สำเร็จ: ${errMsg}`
    }

    const now = new Date()
    const timeString = now.toTimeString().split(' ')[0] 
    
    const updatePayload: any = {
      Job_Status: 'In Transit',
      Pickup_Photo_Url: photoUrls.join(','),
      Pickup_Signature_Url: signatureUrl,
      Actual_Pickup_Time: timeString
    }

    const { error } = await supabase
      .from("Jobs_Main")
      .update(updatePayload)
      .eq("Job_ID", jobId)

    if (error) {
      console.error("Critical: Pickup update failed:", error)
      throw error
    }

    revalidatePath("/mobile/jobs")
    return uploadWarning ? { success: true, warning: uploadWarning } : { success: true }
    
  } catch (error: any) {
    console.error(`[submitJobPickup] Catch Error for jobId ${jobId}:`, error)
    
    let errorMessage = "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
    if (typeof error === 'string') errorMessage = error
    else if (error instanceof Error) errorMessage = error.message
    else if (error && typeof error === 'object') {
        try {
            errorMessage = error.message || JSON.stringify(error)
        } catch (err) {
            console.error("Error stringifying error:", err)
            errorMessage = String(error)
        }
    }

    return { error: `บันทึกไม่สำเร็จ (Pickup): ${errorMessage}` }
  }
}
