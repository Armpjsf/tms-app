"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { getChatSchema } from "@/lib/supabase/chat"
import { notifyAdminNewChat, notifyDriverNewChat } from "@/lib/actions/push-actions"

export interface ChatMessage {
    id: number
    sender_id: string
    receiver_id: string
    message: string
    created_at: string
    is_read: boolean
    driver_name?: string
}

export async function getChatHistory(driverId: string) {
    const supabase = await createClient()
    
    // 0. Detect correct schema
    let { tableName, columns } = await getChatSchema(supabase)

    const result = await supabase
        .from(tableName)
        .select('*')
        .or(`${columns.sender_id}.eq.${driverId},${columns.receiver_id}.eq.${driverId}`)
        .order(columns.created_at, { ascending: true })

    if (result.error) {
        // Fallback to admin client (bypass RLS)
        const adminSupabase = createAdminClient()
        const adminSchema = await getChatSchema(adminSupabase)
        tableName = adminSchema.tableName
        columns = adminSchema.columns

        const { data: adminData, error: adminError } = await adminSupabase
            .from(tableName)
            .select('*')
            .or(`${columns.sender_id}.eq.${driverId},${columns.receiver_id}.eq.${driverId}`)
            .order(columns.created_at, { ascending: true })
        
        if (adminError) {
            return []
        }

        // Return normalized data from admin fallback
        return ((adminData ?? []) as Record<string, unknown>[]).map(msg => ({
            id: msg[columns.id] as number,
            sender_id: msg[columns.sender_id] as string,
            receiver_id: msg[columns.receiver_id] as string,
            message: msg[columns.message] as string,
            is_read: msg[columns.is_read] as boolean,
            created_at: msg[columns.created_at] as string
        })) as ChatMessage[]
    }

    // Normalize
    return ((result.data ?? []) as Record<string, unknown>[]).map(msg => ({
        id: msg[columns.id] as number,
        sender_id: msg[columns.sender_id] as string,
        receiver_id: msg[columns.receiver_id] as string,
        message: msg[columns.message] as string,
        is_read: msg[columns.is_read] as boolean,
        created_at: msg[columns.created_at] as string
    })) as ChatMessage[]
}

export async function sendChatMessage(senderId: string, message: string, receiverId: string = 'admin') {
    const supabase = await createClient()

    // 0. Detect correct schema
    const { tableName, columns } = await getChatSchema(supabase)

    // Using Admin Client to bypass RLS when drivers insert messages
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
        .from(tableName)
        .insert({
            [columns.sender_id]: senderId,
            [columns.receiver_id]: receiverId,
            [columns.message]: message,
            [columns.is_read]: false,
            [columns.created_at]: new Date().toISOString()
        })

    if (error) {
        return { success: false, error: error.message }
    }
    
    // ── Push Notifications ──
    // Admin sends to driver → push to driver
    if (senderId === 'admin' && receiverId !== 'admin') {
        notifyDriverNewChat(receiverId, message).catch(() => {})
    }
    // Driver sends to admin → push to all admins
    else if (senderId !== 'admin' && receiverId === 'admin') {
        // Fetch driver name for notification title
        const { createAdminClient: _ac } = await import('@/utils/supabase/server')
        const _supabase = _ac()
        const { data: driver } = await _supabase
            .from('Master_Drivers')
            .select('Driver_Name')
            .eq('Driver_ID', senderId)
            .single()
        notifyAdminNewChat(senderId, driver?.Driver_Name || 'คนขับ', message).catch(() => {})
    }
    
    return { success: true }
}
export async function markAsReadAction(driverId: string) {
    const { markAsRead } = await import("@/lib/supabase/chat")
    return markAsRead(driverId)
}

export async function markChatReadByDriver(driverId: string) {
    const adminSupabase = createAdminClient()
    const { tableName, columns } = await getChatSchema(adminSupabase)
    const { error } = await adminSupabase
        .from(tableName)
        .update({ [columns.is_read]: true })
        .eq(columns.receiver_id, driverId)
        .eq(columns.is_read, false)
    return { success: !error }
}
