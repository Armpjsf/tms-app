"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

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

    // Use Admin Client to bypass RLS for Storage and DB
    const supabase = createAdminClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${billingNoteId}/${Date.now()}.${fileExt}`
    const filePath = fileName

    try {
        // 1. Upload to Storage
        // Convert File to Buffer for reliable server-side upload if needed, 
        // but Supabase JS client handles File objects nicely in Node environments usually.
        // However, standard File object in Next.js server actions might be web-standard File.
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
            .from('billing-documents')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (uploadError) {
             console.error("Storage Error:", uploadError)
             return { success: false, error: "อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message }
        }

        // 2. Save to DB
        const { error: dbError } = await supabase
            .from('Billing_Attachments')
            .insert([{
                Billing_Note_ID: billingNoteId,
                File_Name: file.name,
                File_Path: filePath,
                File_Type: file.type || 'application/octet-stream',
            }])

        if (dbError) {
            console.error("DB Error:", dbError)
            // Cleanup storage if DB fails? Maybe.
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
// ... (rest of old function)
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
    
    // 1. Delete from Storage
    const { error: storageError } = await supabase
        .storage
        .from('billing-documents')
        .remove([filePath])

    if (storageError) {
        console.error("Error removing file from storage:", storageError)
        // Continue to delete DB record anyway? Maybe warn user.
    }

    // 2. Delete from DB
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
