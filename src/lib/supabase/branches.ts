"use server"

import { createClient } from '@/utils/supabase/server'

export type Branch = {
  Branch_ID: string
  Branch_Name: string
  Email?: string
  Sender_Name?: string
}

export async function getAllBranches() {
  console.log("[DEBUG] getAllBranches: Starting")
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Branches')
      .select('Branch_ID, Branch_Name, Email, Sender_Name')
      .order('Branch_Name')

    if (error) {
      console.error('[DEBUG] Error fetching branches:', error)
      return []
    }

    console.log(`[DEBUG] getAllBranches: Found ${data?.length} branches`)
    return data as Branch[]
  } catch (error) {
    console.error('[DEBUG] Error fetching branches (Catch):', error)
    return []
  }
}

export async function updateBranchSettings(branchId: string, settings: Partial<Pick<Branch, 'Email' | 'Sender_Name'>>) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('Master_Branches')
            .update(settings)
            .eq('Branch_ID', branchId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Error updating branch settings:', error)
        return { success: false, error: error.message }
    }
}
