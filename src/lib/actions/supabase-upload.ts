"use server"

import { createAdminClient } from "@/utils/supabase/server"

const ASSETS_BUCKET = "company-assets"

/**
 * Uploads a file buffer directly to Supabase Storage
 */
export async function uploadFileToSupabase(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderName: string = 'General'
) {
    try {
        const supabase = createAdminClient()

        // Clean up the file name to avoid path issues
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const filePath = `${folderName}/${cleanFileName}`

        const { data, error } = await supabase.storage
            .from(ASSETS_BUCKET)
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                upsert: true // Overwrite if same name exists
            })

        if (error) {
            throw error
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(ASSETS_BUCKET)
            .getPublicUrl(filePath)

        // Upload success case (no log)

        return {
            fileId: data.path,
            directLink: publicUrl,
            webViewLink: publicUrl,
            webContentLink: publicUrl
        }

    } catch (error) {
        throw error
    }
}

/**
 * Helper to upload a File from FormData to Supabase Storage
 */
export async function uploadImageToSupabase(formData: FormData) {
    try {
        const file = formData.get('file') as File
        const folder = formData.get('folder') as string || 'General'

        if (!file) {
            return { success: false, error: 'No file provided' }
        }

        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        const result = await uploadFileToSupabase(
            buffer,
            file.name,
            file.type,
            folder
        )

        return { 
            success: true, 
            url: result.directLink, 
            directLink: result.directLink 
        }

    } catch (error) {
        return { success: false, error: 'Upload failed' }
    }
}
