"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { uploadFileToDrive } from "@/lib/google-drive"

export async function submitJobPOD(jobId: string, formData: FormData) {
  const supabase = await createClient()

  const photoFile = formData.get("photo") as File
  const signatureFile = formData.get("signature") as File // Might be blob sent as file

  if (!photoFile || !signatureFile) {
    return { error: "กรุณาถ่ายรูปและเซ็นชื่อให้ครบถ้วน" }
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
    
    // Refactored helper to take name
    const uploadWithRename = async (file: File, name: string, folder: string) => {
        const buffer = Buffer.from(await file.arrayBuffer())
        const res = await uploadFileToDrive(buffer, name, file.type, folder)
        return res.directLink
    }

    const photoUrl = await uploadWithRename(photoFile, photoName, 'POD_Photos')

    // 2. Upload Signature
    const sigName = `${jobId}_${timestamp}_sig.png`
    const sigUrl = await uploadWithRename(signatureFile, sigName, 'POD_Signatures')

    // 3. Update Job
    const { error } = await supabase
      .from("Jobs_Main")
      .update({
        Job_Status: "Completed", 
        Photo_Proof_Url: photoUrl,
        Signature_Url: sigUrl,
        Delivered_Date: new Date().toISOString()
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
