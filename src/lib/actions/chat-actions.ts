"use server"

import { createClient } from "@/utils/supabase/server"

export interface ChatMessage {
    id: number
    sender_id: string
    receiver_id: string
    message: string
    created_at: string
    is_read: boolean
}

export async function getChatHistory(driverId: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('Chat_Messages')
        .select('*')
        .or(`sender_id.eq.${driverId},receiver_id.eq.${driverId}`)
        .order('created_at', { ascending: true })

    if (error) {
        console.error("Error fetching chat:", error)
        return []
    }

    return data as ChatMessage[]
}

export async function sendChatMessage(senderId: string, message: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('Chat_Messages')
        .insert({
            sender_id: senderId,
            receiver_id: 'admin', // Defaulting to admin
            message: message,
            is_read: false,
            created_at: new Date().toISOString()
        })

    if (error) {
        console.error("Error sending message:", error)
        return { success: false, error: error.message }
    }
    
    return { success: true }
}
