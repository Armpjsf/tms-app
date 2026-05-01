"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { isSuperAdmin, isAdmin, getCustomerId, getUserBranchId } from '@/lib/permissions'

export type Branch = {
  Branch_ID: string
  Branch_Name: string
  Address?: string
  Phone?: string
  Email?: string
  Sender_Name?: string
}

export async function getAllBranches() {
  try {
    const isSuper = await isSuperAdmin()
    const isRegularAdmin = await isAdmin()
    const customerId = await getCustomerId()
    const supabase = (isSuper || isRegularAdmin || customerId) ? await createAdminClient() : await createClient()
    
    const userBranchId = await getUserBranchId()
    
    let query = supabase

      .from('Master_Branches')
      .select('Branch_ID, Branch_Name, Email, Sender_Name, Address, Phone')
    
    // STRICT ISOLATION: Non-SuperAdmin users (Admin, Staff, etc.) 
    // are restricted to their assigned branch.
    if (!isSuper && userBranchId && userBranchId !== 'All') {
        query = query.eq('Branch_ID', userBranchId)
    }



    const { data, error } = await query.order('Branch_Name')

    if (error) {
      return null
    }

    return data as Branch[]
  } catch {
    return []
  }
}

export async function updateBranchSettings(branchId: string, settings: Partial<Pick<Branch, 'Email' | 'Sender_Name' | 'Address' | 'Phone' | 'Branch_Name'>>) {
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

export async function createBranch(branch: Branch & { Address?: string, Phone?: string }) {
    try {
        const isAdmin = await isSuperAdmin()
        const supabase = isAdmin ? await createAdminClient() : await createClient()
        
        const { data, error } = await supabase
            .from('Master_Branches')
            .insert({
                Branch_ID: branch.Branch_ID,
                Branch_Name: branch.Branch_Name,
                Address: branch.Address || null,
                Phone: branch.Phone || null,
                Email: branch.Email || null,
                Sender_Name: branch.Sender_Name || null,
                Created_At: new Date().toISOString(),
                Updated_At: new Date().toISOString()
            })
            .select()

        if (error) {
            console.error('Create Branch Error:', error)
            throw error
        }
        
        return { success: true, data: data?.[0] }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: message }
    }
}

export async function deleteBranch(branchId: string) {
    try {
        const isAdmin = await isSuperAdmin()
        const supabase = isAdmin ? await createAdminClient() : await createClient()
        
        const { error } = await supabase
            .from('Master_Branches')
            .delete()
            .eq('Branch_ID', branchId)

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: message }
    }
}
