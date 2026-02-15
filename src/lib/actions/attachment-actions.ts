"use server"

import { createClient } from "@/utils/supabase/server"
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
