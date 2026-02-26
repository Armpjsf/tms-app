"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { uploadFileToSupabase } from "@/lib/actions/supabase-upload"

export interface Attachment {
    Attachment_ID: string;
    Billing_Note_ID: string;
    File_Name: string;
    File_Path: string;
    File_Type: string;
    Uploaded_At: string;
}

export async function getAttachments(billingNoteId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('Billing_Attachments')
        .select('*')
        .eq('Billing_Note_ID', billingNoteId)
        .order('Uploaded_At', { ascending: false })

    if (error) {
        console.error("Error fetching attachments:", error)
        return []
    }

    return data as Attachment[]
}

export async function uploadAttachment(formData: FormData) {
    const billingNoteId = formData.get('billingNoteId') as string
    const file = formData.get('file') as File

    if (!billingNoteId || !file) {
        return { success: false, error: "ข้อมูลไม่ครบถ้วน" }
    }

    const supabase = createAdminClient()

    try {
        // 1. Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        const timestamp = Date.now()
        const fileName = `${billingNoteId}_${timestamp}_${file.name}`
        
        const uploadResult = await uploadFileToSupabase(
            buffer,
            fileName,
            file.type,
            'Billing_Attachments'
        )

        if (!uploadResult.directLink) {
            throw new Error("Failed to get direct link from Supabase Storage")
        }

        // 2. Save to DB (Store direct link in File_Path)
        const { error: dbError } = await supabase
            .from('Billing_Attachments')
            .insert([{
                Billing_Note_ID: billingNoteId,
                File_Name: file.name,
                File_Path: uploadResult.directLink,
                File_Type: file.type || 'application/octet-stream',
            }])

        if (dbError) {
            console.error("DB Error:", dbError)
            return { success: false, error: "บันทึกข้อมูลไม่สำเร็จ: " + dbError.message }
        }

        revalidatePath(`/billing/customer/history`)
        return { success: true }
    } catch (e: any) {
        console.error("Upload Exception:", e)
        return { success: false, error: e.message }
    }
}

export async function saveAttachment(attachment: Omit<Attachment, 'Attachment_ID' | 'Uploaded_At'>) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('Billing_Attachments')
        .insert([attachment])

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath(`/billing/customer/history`)
    return { success: true }
}

export async function deleteAttachment(id: string, filePath: string) {
    const supabase = await createClient()
    
    // Skip Storage deletion for Google Drive for now as we don't handle its delete yet
    // and the original logic was specific to Supabase buckets.

    // Delete from DB
    const { error: dbError } = await supabase
        .from('Billing_Attachments')
        .delete()
        .eq('Attachment_ID', id)

    if (dbError) {
        return { success: false, error: dbError.message }
    }

    revalidatePath(`/billing/customer/history`)
    return { success: true }
}
