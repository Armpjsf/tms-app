'use server'

import { uploadImageToSupabase } from "@/lib/actions/supabase-upload"

// Kept the function name `uploadImageToDrive` to avoid breaking existing imports 
// across all components (FuelForm, MaintenanceForm), but it now routes to Supabase.
export async function uploadImageToDrive(formData: FormData) {
  try {
    return await uploadImageToSupabase(formData)
  } catch (error) {
    console.error('Upload Action Error:', error)
    return { success: false, error: 'Upload failed' }
  }
}
