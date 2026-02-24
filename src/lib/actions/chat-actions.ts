"use server"

import { createClient } from "@/utils/supabase/server"

export interface ChatMessage {
    id: number
    Sender_ID: string
    Receiver_ID: string
    Message: string
    Created_At: string
    Is_Read: boolean
}

export async function getChatHistory(driverId: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('Chat_Messages')
        .select('*')
        .or(`Sender_ID.eq.${driverId},Receiver_ID.eq.${driverId}`)
        .order('Created_At', { ascending: true })

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
            Sender_ID: senderId,
            Receiver_ID: 'admin', // Defaulting to admin
            Message: message,
            Is_Read: false,
            Created_At: new Date().toISOString()
        })

    if (error) {
        console.error("Error sending message:", error)
        return { success: false, error: error.message }
    }
    
    return { success: true }
}
