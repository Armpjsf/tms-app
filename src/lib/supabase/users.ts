"use server"

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'

export type UserProfile = {
  User_ID: string
  Username: string
  First_Name: string | null
  Last_Name: string | null
  Email: string | null
  Role_ID: number
  Branch_ID: string | null
}

// Get current user profile
export async function getUserProfile() {
  try {
    const session = await getSession()
    
    if (!session || !session.userId) {
        return null
    }

    const supabase = createAdminClient()

    // Get profile from Master_Users
    const { data, error } = await supabase
      .from('Master_Users')
      .select('*')
      .eq('User_ID', session.userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as UserProfile
  } catch (e) {
    console.error('Exception fetching user profile:', e)
    return null
  }
}

// Update user profile
export async function updateUserProfile(data: Partial<UserProfile>) {
  try {
    const session = await getSession()
    if (!session || !session.userId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('Master_Users')
      .update({
        First_Name: data.First_Name,
        Last_Name: data.Last_Name,
        Email: data.Email
      })
      .eq('User_ID', session.userId)

    if (error) {
      console.error('Error updating user profile:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/profile')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Internal Server Error' }
  }
}
