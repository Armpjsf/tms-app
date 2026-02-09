"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitJobPOD(jobId: string, formData: FormData) {
  const supabase = await createClient()

  const photoFile = formData.get("photo") as File
  const signatureFile = formData.get("signature") as File // Might be blob sent as file

  if (!photoFile || !signatureFile) {
    return { error: "กรุณาถ่ายรูปและเซ็นชื่อให้ครบถ้วน" }
  }

  // Helper to upload file
  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('pod_images')
      .upload(path, file, { upsert: true })
    
    if (error) throw error
    
    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('pod_images')
      .getPublicUrl(path)
      
    return publicUrl.publicUrl
  }

  try {
    const timestamp = Date.now()
    
    // 1. Upload Photo
    const photoPath = `photos/${jobId}_${timestamp}.jpg`
    const photoUrl = await uploadFile(photoFile, photoPath)

    // 2. Upload Signature
    const sigPath = `signatures/${jobId}_${timestamp}.png`
    const sigUrl = await uploadFile(signatureFile, sigPath)

    // 3. Update Job
    const { error } = await supabase
      .from("Jobs_Main")
      .update({
        Job_Status: "Completed", // Or 'Delivered'
        Photo_Proof_Url: photoUrl,
        Signature_Url: sigUrl,
        // Actually Delivered_Date needs to be set too if exists
      })
      .eq("Job_ID", jobId)

    if (error) throw error

    revalidatePath("/mobile/jobs")
    return { success: true }

  } catch (error) {
    console.error("POD Submit Error:", error)
    return { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }
  }
}
