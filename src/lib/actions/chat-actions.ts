"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { getChatSchema } from "@/lib/supabase/chat"
import { sendPushToDriver } from "@/lib/actions/push-actions"

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
        console.warn("[Chat] getChatHistory - normal client failed, using admin client:", result.error.message)
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
            console.error("[Chat] getChatHistory admin also failed:", adminError.message)
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

    console.log(`[Chat] Sending message from ${senderId} to ${receiverId}: ${message}`)

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
        console.error("[Chat] Error sending message:", error)
        return { success: false, error: error.message }
    }
    
    // Trigger push notification if Admin is sending to a Driver
    if (senderId === 'admin' && receiverId !== 'admin') {
        const isImage = message.startsWith('[IMAGE] ')
        await sendPushToDriver(receiverId, {
            title: '💬 ข้อความใหม่จากแอดมิน',
            body: isImage ? '📷 ส่งรูปภาพ' : message,
            url: '/mobile/chat'
        })
    }
    
    return { success: true }
}
export async function markAsReadAction(driverId: string) {
    const { markAsRead } = await import("@/lib/supabase/chat")
    return markAsRead(driverId)
}
