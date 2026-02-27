import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"
import { sendPushToDriver } from '@/lib/actions/push-actions'

export type ChatMessage = {
  id: number
  sender_id: string
  receiver_id: string
  message: string
  created_at: string
  is_read: boolean
  // Extended for UI helpers
  driver_name?: string 
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

    const query = supabase.from('Chat_Messages').select('*')

    const { data: messages, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching chat messages:', error)
      return []
    }

    // 1. Get Drivers in my branch to filter messages
    let allowedDriverIds: Set<string> | null = null
    const { data: allDrivers } = await supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Branch_ID')
    
    if (branchId && branchId !== 'All') {
        allowedDriverIds = new Set(allDrivers?.filter(d => d.Branch_ID === branchId).map(d => d.Driver_ID) || [])
    } else if (!isAdmin && !branchId) {
        return []
    }

    // Map to lookup driver names easily
    const driverNameMap = new Map(allDrivers?.map(d => [d.Driver_ID, d.Driver_Name]) || [])

    // 2. Group by driver and find last message
    const contactMap = new Map<string, ChatContact>()

    messages?.forEach((msg) => {
      const driverId = msg.sender_id === 'admin' ? msg.receiver_id : msg.sender_id
      
      if (allowedDriverIds && !allowedDriverIds.has(driverId)) return
      
      if (!contactMap.has(driverId)) {
        contactMap.set(driverId, {
          driver_id: driverId,
          driver_name: driverNameMap.get(driverId) || 'Unknown Driver',
          last_message: msg.sender_id === 'admin' ? `You: ${msg.message}` : msg.message,
          unread: 0,
          updated_at: msg.created_at
        })
      }

      // Count unread messages from driver
      if (msg.sender_id !== 'admin' && !msg.is_read) {
        const contact = contactMap.get(driverId)
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
      .from('Chat_Messages')
      .select('*')
      .or(`sender_id.eq.${driverId},receiver_id.eq.${driverId}`)
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
      .from('Chat_Messages')
      .insert({
        sender_id: 'admin',
        receiver_id: driverId,
        message: message,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Notify Driver via Push
    await sendPushToDriver(driverId, {
        title: '💬 ข้อความใหม่จากเจ้าหน้าที่',
        body: message,
        url: '/mobile/chat'
    }).catch(err => console.error('[Chat] Push error:', err))

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
      .from('Chat_Messages')
      .update({ is_read: true })
      .eq('receiver_id', 'admin')
      .eq('sender_id', driverId)
      .eq('is_read', false)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return { success: false, error }
  }
}

// Get unread count for a driver
export async function getUnreadChatCountForDriver(driverId: string): Promise<number> {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('Chat_Messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', driverId)
      .eq('is_read', false)
    
    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}
