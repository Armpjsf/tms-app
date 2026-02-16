"use server"

import { createClient } from '@/utils/supabase/server'
import { Subcontractor } from '@/types/subcontractor'

export async function getAllSubcontractors(): Promise<Subcontractor[]> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('Master_Subcontractors')
            .select('*')
            .order('Sub_Name')
        
        if (error) {
            console.error('Error fetching subcontractors:', error)
            return []
        }
        return data || []
    } catch {
        return []
    }
}

export async function getSubcontractorById(id: string): Promise<Subcontractor | null> {
    try {
        const supabase = await createClient()
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
