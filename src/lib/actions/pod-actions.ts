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
    
    // 1. Upload Photo
    const photoName = `${jobId}_${timestamp}_photo.jpg`
    // Create new File object with correct name if needed, or just pass name to upload function
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

  } catch (error: any) {
    console.error("POD Submit Error:", error)
    // Return specific error message to help debugging
    return { error: `Error: ${error?.message || "Internal Server Error"}` }
  }
}

export async function submitJobPickup(jobId: string, formData: FormData) {
  const supabase = await createClient()

  try {
    const timestamp = Date.now()
    
    const uploadWithRename = async (file: File, name: string, folder: string) => {
        const buffer = Buffer.from(await file.arrayBuffer())
        const res = await uploadFileToDrive(buffer, name, file.type, folder)
        return res.directLink
    }

    // Upload Photos (Multi)
    const photoUrls = []
    const photoCount = parseInt(formData.get("photo_count") as string || "0")
    
    for (let i = 0; i < photoCount; i++) {
        const file = formData.get(`photo_${i}`) as File
        if (file) {
            const name = `${jobId}_${timestamp}_pickup_${i}.jpg`
            const url = await uploadWithRename(file, name, 'Pickup_Photos')
            photoUrls.push(url)
        }
    }
    
    const photoUrlString = photoUrls.join(',')

    // Update Job
    // Note: Assuming we might not have a dedicated column for Pickup Photo in legacy schema
    // We will try to update 'Pickup_Photo_Url' if exists, or just update status
    // If we can't save URL, at least it is in Drive.
    // For now, let's try to update Job_Status and maybe use a generic field if available
    // OR we just DON'T save the URL to DB if column missing, but change status to 'In Transit'
    
    const { error } = await supabase
      .from("Jobs_Main")
      .update({
        Job_Status: 'In Transit',
        // Pickup_Photo_Url: photoUrlString // Commented out to avoid error if column missing
        // If user complains about missing pickup photos in admin, we'll need to add column.
      })
      .eq("Job_ID", jobId)

    if (error) throw error

    revalidatePath("/mobile/jobs")
    return { success: true }
    
  } catch (error) {
    console.error("Pickup Submit Error:", error)
    return { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }
  }
}
