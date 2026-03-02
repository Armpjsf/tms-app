"use server"

import { createClient } from "@/utils/supabase/server"
import { getChatSchema } from "@/lib/supabase/chat"

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
    const { tableName, columns } = await getChatSchema(supabase)

    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .or(`${columns.sender_id}.eq.${driverId},${columns.receiver_id}.eq.${driverId}`)
        .order(columns.created_at, { ascending: true })

    if (error) {
        console.error("Error fetching chat:", error)
        return []
    }

    // Normalize
    return (data as any[]).map(msg => ({
        id: msg[columns.id],
        sender_id: msg[columns.sender_id],
        receiver_id: msg[columns.receiver_id],
        message: msg[columns.message],
        is_read: msg[columns.is_read],
        created_at: msg[columns.created_at]
    })) as ChatMessage[]
}

export async function sendChatMessage(senderId: string, message: string) {
    const supabase = await createClient()

    console.log(`[Chat] Sending message from ${senderId}: ${message}`)

    // 0. Detect correct schema
    const { tableName, columns } = await getChatSchema(supabase)

    const { error } = await supabase
        .from(tableName)
        .insert({
            [columns.sender_id]: senderId,
            [columns.receiver_id]: 'admin', // Defaulting to admin
            [columns.message]: message,
            [columns.is_read]: false,
            [columns.created_at]: new Date().toISOString()
        })

    if (error) {
        console.error("[Chat] Error sending message:", error)
        return { success: false, error: error.message }
    }
    
    return { success: true }
}
export async function markAsReadAction(driverId: string) {
    const { markAsRead } = await import("@/lib/supabase/chat")
    return markAsRead(driverId)
}
