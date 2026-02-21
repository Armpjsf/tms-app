import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

export type ChatMessage = {
  id: number
  driver_id: string
  driver_name: string
  sender: 'admin' | 'driver'
  message: string
  created_at: string
  read: boolean
}

export type ChatContact = {
  driver_id: string
  driver_name: string
  last_message: string
  unread: number
  updated_at: string
}

// Get list of drivers with their last message
export async function getChatContacts(): Promise<ChatContact[]> {
  try {
    const supabase = await createClient()

    // 0. Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    const query = supabase.from('chat_messages').select('*')

    // Since chat_messages doesn't have Branch_ID, we fetch messages then filter by driver's branch
    // Or we can join. Let's try to join if possible or fetch and filter in app logic if set size is small.
    // Given TMS usually has < 100 drivers per branch, app logic filtering is safe.

    const { data: messages, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching chat messages:', error)
      return []
    }

    // 1. Get Drivers in my branch to filter messages
    let allowedDriverIds: Set<string> | null = null
    if (branchId && branchId !== 'All') {
        const { data: drivers } = await supabase
            .from('Master_Drivers')
            .select('Driver_ID')
            .eq('Branch_ID', branchId)
        allowedDriverIds = new Set(drivers?.map(d => d.Driver_ID) || [])
    } else if (!isAdmin && !branchId) {
        return []
    }

    // 2. Group by driver and find last message
    const contactMap = new Map<string, ChatContact>()

    messages?.forEach((msg) => {
      if (allowedDriverIds && !allowedDriverIds.has(msg.driver_id)) return
      if (!contactMap.has(msg.driver_id)) {
        contactMap.set(msg.driver_id, {
          driver_id: msg.driver_id,
          driver_name: msg.driver_name || 'Unknown Driver',
          last_message: msg.sender === 'admin' ? `You: ${msg.message}` : msg.message,
          unread: 0,
          updated_at: msg.created_at
        })
      }

      // Count unread messages from driver
      if (msg.sender === 'driver' && !msg.read) {
        const contact = contactMap.get(msg.driver_id)
        if (contact) {
          contact.unread += 1
        }
      }
    })

    return Array.from(contactMap.values())
  } catch (error) {
    console.error('Error getting chat contacts:', error)
    return []
  }
}

// Get messages for a specific driver
export async function getMessages(driverId: string): Promise<ChatMessage[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

// Send a message (as admin)
export async function sendMessage(driverId: string, driverName: string, message: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        driver_id: driverId,
        driver_name: driverName,
        sender: 'admin',
        message: message,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error }
  }
}

// Mark messages as read
export async function markAsRead(driverId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('chat_messages')
      .update({ read: true })
      .eq('driver_id', driverId)
      .eq('sender', 'driver')
      .eq('read', false)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return { success: false, error }
  }
}
