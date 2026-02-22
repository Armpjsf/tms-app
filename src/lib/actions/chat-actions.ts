"use server"

import { createClient } from "@/utils/supabase/server"

export interface ChatMessage {
    id: number
    driver_id: string
    driver_name: string
    sender: 'admin' | 'driver'
    message: string
    created_at: string
    read: boolean
}

export async function getChatHistory(driverId: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error("Error fetching chat:", error)
        return []
    }

    return data as ChatMessage[]
}

export async function sendChatMessage(senderId: string, message: string, driverName?: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('chat_messages')
        .insert({
            driver_id: senderId,
            driver_name: driverName || 'Driver',
            sender: 'driver',
            message: message,
            read: false,
            created_at: new Date().toISOString()
        })

    if (error) {
        console.error("Error sending message:", error)
        return { success: false, error: error.message }
    }
    
    return { success: true }
}
