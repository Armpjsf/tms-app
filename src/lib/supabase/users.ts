"use server"

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'

export type UserProfile = {
  Username: string
  First_Name: string | null
  Last_Name: string | null
  Email: string | null
  Role: string | null
  Branch_ID: string | null
  Name?: string | null
  Avatar_Url?: string | null
}

// Get current user profile
export async function getUserProfile() {
  try {
    const session = await getSession()
    console.log('[getUserProfile] Session:', session)
    
    if (!session || !session.userId) {
        console.warn('[getUserProfile] No valid session found')
        return null
    }

    const supabase = await createClient()

    const { data: rawData, error } = await supabase
      .from('Master_Users')
      .select('*')
      .eq('Username', session.userId)
      .single()
    
    if (error) {
      console.error('[getUserProfile] DB Error:', error)
      return null
    }

    console.log('[getUserProfile] Raw Data from DB:', rawData)
    const data = rawData as UserProfile
    
    // Auto-fill First_Name/Last_Name from Name if they are empty
    if ((!data.First_Name || !data.Last_Name) && data.Name) {
        console.log('[getUserProfile] Auto-filling names from Name:', data.Name)
        const parts = data.Name.trim().split(/\s+/)
        if (!data.First_Name) data.First_Name = parts[0] || ""
        if (!data.Last_Name) data.Last_Name = parts.slice(1).join(" ") || ""
    }

    return data
  } catch (e) {
    console.error('[getUserProfile] Exception:', e)
    return null
  }
}

// Update user profile
export async function updateUserProfile(data: Partial<UserProfile>) {
  try {
    const session = await getSession()
    console.log('[updateUserProfile] Session:', session)
    if (!session || !session.userId) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    const updatePayload: any = {
        First_Name: data.First_Name,
        Last_Name: data.Last_Name,
        Email: data.Email,
    }

    // Sync Name column if First_Name and Last_Name are provided
    if (data.First_Name || data.Last_Name) {
        updatePayload.Name = `${data.First_Name || ''} ${data.Last_Name || ''}`.trim()
    }

    console.log('[updateUserProfile] Updating with payload:', updatePayload)

    const { error, count } = await supabase
      .from('Master_Users')
      .update(updatePayload, { count: 'exact' })
      .eq('Username', session.userId)

    if (error) {
      console.error('[updateUserProfile] DB Error:', error)
      return { success: false, error: error.message }
    }

    console.log('[updateUserProfile] Rows updated:', count)

    revalidatePath('/settings/profile')
    return { success: true }
  } catch (e: any) {
    console.error('[updateUserProfile] Exception:', e)
    return { success: false, error: e.message || 'Failed to update profile' }
  }
}
