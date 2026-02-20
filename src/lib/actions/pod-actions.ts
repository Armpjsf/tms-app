"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { uploadFileToDrive } from "@/lib/google-drive"

export async function submitJobPOD(jobId: string, formData: FormData) {
  const supabase = await createClient()

  const photoFile = formData.get("photo") as File
  const signatureFile = formData.get("signature") as File // Might be blob sent as file
  
  // DEBUG LOGS
  console.log("--- submitJobPOD Debug ---")
  console.log("Job ID:", jobId)
  const keys = Array.from(formData.keys())
  console.log("FormData Keys:", keys)
  
  const hasLegacyPhoto = !!photoFile && photoFile.size > 0
  const hasNewPhoto = !!formData.get("photo_0")
  const hasPhotos = hasLegacyPhoto || hasNewPhoto
  
  const hasSignature = !!signatureFile && signatureFile.size > 0

  console.log("Check:", { hasLegacyPhoto, hasNewPhoto, hasPhotos, hasSignature })

  if (!hasPhotos) {
      console.log("Error: Missing Photos")
      return { error: "ไม่พบรูปถ่ายสินค้า (กรุณาลองถ่ายใหม่)" }
  }
  if (!hasSignature) {
      console.log("Error: Missing Signature")
      return { error: "ไม่พบลายเซ็น (กรุณาเซ็นใหม่)" }
  }



  try {
    const timestamp = Date.now()
    
    // 1. Upload Photos
    // For simplicity, we pass buffer to uploadFileToDrive, so name is just metadata there
    // But here we need to modify our helper to accept name override if we want specific names
    // Let's just pass the file and let it use original name or rename it?
    // Better to rename for consistency.
    
    // Helper to upload with rename
    const uploadWithRename = async (file: File, name: string, folder: string) => {
        try {
            const buffer = Buffer.from(await file.arrayBuffer())
            const res = await uploadFileToDrive(buffer, name, file.type, folder)
            return res.directLink
        } catch (e) {
            console.error(`Failed to upload ${name}:`, e)
            return null // Return null on failure to allow others to proceed? Or throw?
            // Throwing is safer for data integrity.
            throw e
        }
    }

    // Prepare Upload Promises
    const uploadPromises: Promise<string | null>[] = []
    
    // 0. POD Report (Smart Document)
    const podReportFile = formData.get("pod_report") as File
    let podReportUrl = null
    
    if (podReportFile && podReportFile.size > 0) {
        try {
            const reportName = `${jobId}_${timestamp}_REPORT.jpg`
            podReportUrl = await uploadWithRename(podReportFile, reportName, 'POD_Documents')
        } catch (e) {
            console.error("Failed to upload POD Report", e)
        }
    }

    // 1. Photos
    const photoCount = parseInt(formData.get("photo_count") as string || "0")
    
    // Legacy check
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

    // 2. Signature
    const sigName = `${jobId}_${timestamp}_sig.png`
    const sigPromise = uploadWithRename(signatureFile, sigName, 'POD_Signatures')

    // EXECUTE ALL UPLOADS IN PARALLEL
    const [signatureUrl, ...photoResults] = await Promise.all([
        sigPromise,
        ...uploadPromises
    ])

    // Filter successful photo uploads
    let photoUrls = photoResults.filter(url => url !== null) as string[]
    
    // Prepend Report URL to photos if available, so it appears first in viewer
    if (podReportUrl) {
        photoUrls = [podReportUrl, ...photoUrls]
    }

    const photoUrlString = photoUrls.join(',')

    if (!signatureUrl) throw new Error("Signature upload failed")

    // 3. Update Job
    const { error } = await supabase
      .from("Jobs_Main")
      .update({
        Job_Status: "Completed", 
        Photo_Proof_Url: photoUrlString, // Now includes Report URL
        Signature_Url: signatureUrl,
        // Delivered_Date: new Date().toISOString() // Column missing in DB
      })
      .eq("Job_ID", jobId)

    if (error) throw error

    revalidatePath("/mobile/jobs")
    return { success: true }

  } catch (error: unknown) {
    console.error("POD Submit Error:", error)
    const errMsg = error instanceof Error ? error.message : "Internal Server Error"
    return { error: `Error: ${errMsg}` }
  }
}

export async function submitJobPickup(jobId: string, formData: FormData) {
  console.log("=== submitJobPickup START ===", { jobId })
  
  let supabase;
  try {
    supabase = await createClient()
  } catch (e) {
    console.error("Supabase client creation failed:", e)
    return { error: "ไม่สามารถเชื่อมต่อฐานข้อมูล" }
  }

  try {
    const timestamp = Date.now()
    
    // Step 1: Try to upload photos & signature (non-blocking)
    const photoUrls: string[] = []
    let signatureUrl: string | null = null
    let uploadWarning = ""
    
    try {
      const uploadWithRename = async (file: File, name: string, folder: string) => {
          const buffer = Buffer.from(await file.arrayBuffer())
          const res = await uploadFileToDrive(buffer, name, file.type, folder)
          return res.directLink
      }

      // 0. Pickup Report (Smart Document)
      const pickupReportFile = formData.get("pickup_report") as File
      let pickupReportUrl = null
      
      if (pickupReportFile && pickupReportFile.size > 0) {
          try {
              const reportName = `${jobId}_${timestamp}_PICKUP_REPORT.jpg`
              pickupReportUrl = await uploadWithRename(pickupReportFile, reportName, 'Pickup_Documents')
          } catch (e) {
              console.error("Failed to upload Pickup Report", e)
          }
      }

      const photoCount = parseInt(formData.get("photo_count") as string || "0")
      console.log("Photo count:", photoCount)
      
      for (let i = 0; i < photoCount; i++) {
          const file = formData.get(`photo_${i}`) as File
          if (file) {
              console.log(`Uploading photo ${i}: ${file.name} (${file.size} bytes)`)
              const name = `${jobId}_${timestamp}_pickup_${i}.jpg`
              const url = await uploadWithRename(file, name, 'Pickup_Photos')
              if (url) photoUrls.push(url)
          }
      }

      // Prepend Report URL to photos if available
      if (pickupReportUrl) {
          photoUrls.unshift(pickupReportUrl)
      }

      // Handle Signature
      const signatureFile = formData.get("signature") as File
      if (signatureFile && signatureFile.size > 0) {
          console.log("Uploading signature...")
          const sigName = `${jobId}_${timestamp}_pickup_sig.png`
          signatureUrl = await uploadWithRename(signatureFile, sigName, 'Pickup_Signatures')
      }

      console.log("Upload results:", { photos: photoUrls.length, hasSignature: !!signatureUrl })
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      console.error("Google Drive upload failed:", errMsg)
      uploadWarning = `อัปโหลดหลักฐานไม่สำเร็จ: ${errMsg}`
    }

    // Step 2: Always update Job Status
    console.log("Updating job status to In Transit...")
    const updatePayload: Record<string, unknown> = {
      Job_Status: 'In Transit',
    }
    
    if (photoUrls.length > 0) {
      updatePayload.Pickup_Photo_Url = photoUrls.join(',')
    }

    if (signatureUrl) {
      updatePayload.Pickup_Signature_Url = signatureUrl
    }

    const { error } = await supabase
      .from("Jobs_Main")
      .update(updatePayload)
      .eq("Job_ID", jobId)

    if (error) {
      // If Pickup_Photo_Url column doesn't exist, retry without it
      if (error.message?.includes('Pickup_Photo_Url') || error.code === '42703') {
        console.warn("Pickup_Photo_Url column missing, retrying status only")
        const { error: error2 } = await supabase
          .from("Jobs_Main")
          .update({ Job_Status: 'In Transit' })
          .eq("Job_ID", jobId)
        if (error2) {
          console.error("DB update retry failed:", error2)
          throw error2
        }
      } else {
        console.error("DB update failed:", error)
        throw error
      }
    }

    console.log("=== submitJobPickup SUCCESS ===")
    revalidatePath("/mobile/jobs")
    
    if (uploadWarning) {
      return { success: true, warning: uploadWarning }
    }
    return { success: true }
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("=== submitJobPickup FAILED ===", errMsg)
    return { error: `บันทึกไม่สำเร็จ: ${errMsg}` }
  }
}

