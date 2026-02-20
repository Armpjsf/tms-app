'use server'

import { createClient } from '@/utils/supabase/server'

export interface DriverNotification {
  id: number
  driver_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
  link?: string
}

export async function getDriverNotifications(driverId: string): Promise<DriverNotification[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('Notifications')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data as DriverNotification[]
}

export async function markNotificationRead(notificationId: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification read:', error)
    return { success: false }
  }

  return { success: true }
}

export async function markAllNotificationsRead(driverId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Notifications')
    .update({ is_read: true })
    .eq('driver_id', driverId)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all notifications read:', error)
    return { success: false }
  }

  return { success: true }
}

// Helper to create notification (used by admin or system)
export async function createNotification(data: {
  driver_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  link?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Notifications')
    .insert(data)

  if (error) {
    console.error('Error creating notification:', error)
    return { success: false }
  }

  return { success: true }
}
