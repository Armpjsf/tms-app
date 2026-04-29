'use server'

import { createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/supabase/logs"
import { getAdminSession } from "./auth-actions"
import { getSession } from "@/lib/session"

export async function getCurrentUserSession() {
    return await getSession()
}

export async function getPendingIPs() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('User_Approved_IPs')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
    
    if (error) return []
    return data
}

export async function approveIP(id: string, username: string, ip: string) {
    const adminSession = await getAdminSession()
    if (!adminSession) return { success: false, error: 'Unauthorized' }

    const supabase = createAdminClient()
    const { error } = await supabase
        .from('User_Approved_IPs')
        .update({ 
            status: 'Approved',
            approved_by: adminSession.username,
            approved_at: new Date().toISOString()
        })
        .eq('id', id)
    
    if (error) return { success: false, error: error.message }

    await logActivity({
        module: 'Settings',
        action_type: 'APPROVE',
        user_id: adminSession.userId,
        username: adminSession.username,
        details: { action: 'APPROVE_IP', target_user: username, target_ip: ip }
    })

    revalidatePath('/admin/security')
    return { success: true }
}

export async function blockIP(id: string, username: string, ip: string) {
    const adminSession = await getAdminSession()
    if (!adminSession) return { success: false, error: 'Unauthorized' }

    const supabase = createAdminClient()
    const { error } = await supabase
        .from('User_Approved_IPs')
        .update({ 
            status: 'Blocked',
            approved_by: adminSession.username,
            approved_at: new Date().toISOString()
        })
        .eq('id', id)
    
    if (error) return { success: false, error: error.message }

    await logActivity({
        module: 'Settings',
        action_type: 'UPDATE',
        user_id: adminSession.userId,
        username: adminSession.username,
        details: { action: 'BLOCK_IP', target_user: username, target_ip: ip }
    })

    revalidatePath('/admin/security')
    return { success: true }
}

export async function deleteIPRecord(id: string) {
    const adminSession = await getAdminSession()
    if (!adminSession) return { success: false, error: 'Unauthorized' }

    const supabase = createAdminClient()
    const { error } = await supabase
        .from('User_Approved_IPs')
        .delete()
        .eq('id', id)
    
    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/security')
    return { success: true }
}
