"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { isSuperAdmin } from '@/lib/permissions'

export type Branch = {
  Branch_ID: string
  Branch_Name: string
  Email?: string
  Sender_Name?: string
}

export async function getAllBranches() {
  try {
    const isAdmin = await isSuperAdmin()
    const supabase = isAdmin ? await createAdminClient() : await createClient()
    
    const { data, error } = await supabase
      .from('Master_Branches')
      .select('Branch_ID, Branch_Name, Email, Sender_Name')
      .order('Branch_Name')

    if (error) {
      return null
    }

    return data as Branch[]
  } catch {
    return []
  }
}

export async function updateBranchSettings(branchId: string, settings: Partial<Pick<Branch, 'Email' | 'Sender_Name'>>) {
    try {
        const isAdmin = await isSuperAdmin()
        const supabase = isAdmin ? await createAdminClient() : await createClient()
        const { error } = await supabase
            .from('Master_Branches')
            .update(settings)
            .eq('Branch_ID', branchId)

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: message }
    }
}
