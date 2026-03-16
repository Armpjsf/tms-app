"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { Subcontractor } from '@/types/subcontractor'
import { isAdmin } from '@/lib/permissions'

export async function getAllSubcontractors(branchId?: string): Promise<Subcontractor[]> {
    try {
        const adminStatus = await isAdmin()
        const supabase = adminStatus ? createAdminClient() : await createClient()
        let query = supabase.from('Master_Subcontractors').select('*')
        
        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        }

        const { data, error } = await query.order('Sub_Name')
        
        if (error) {
            return []
        }
        return data || []
    } catch {
        return []
    }
}

export async function getSubcontractorById(id: string): Promise<Subcontractor | null> {
    try {
        const adminStatus = await isAdmin()
        const supabase = adminStatus ? createAdminClient() : await createClient()
        const { data, error } = await supabase
            .from('Master_Subcontractors')
            .select('*')
            .eq('Sub_ID', id)
            .single()
        
        if (error) return null
        return data
    } catch {
        return null
    }
}
