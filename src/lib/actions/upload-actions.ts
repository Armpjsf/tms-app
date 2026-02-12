'use server'

import { uploadFileToDrive } from "@/lib/google-drive"

export async function uploadImageToDrive(formData: FormData) {
  try {
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'General'

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Upload
    const result = await uploadFileToDrive(
        buffer, 
        file.name, 
        file.type, 
        folder
    )

    // Return the direct link (or webViewLink if preferred)
    // Using simple ID format might be better if we want to construct link on client, 
    // but returning full URL is easier for now.
    // Note: Google Drive direct links (uc?export=view) might have quota limits. 
    // For low volume internal apps it's usually fine.
    return { success: true, url: result.webViewLink, directLink: `https://lh3.googleusercontent.com/d/${result.fileId}` } 
    // lh3.googleusercontent.com/d/ID is often more reliable for images than uc?export=view

  } catch (error) {
    console.error('Upload Action Error:', error)
    return { success: false, error: 'Upload failed' }
  }
}
