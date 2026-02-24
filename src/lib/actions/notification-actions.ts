'use server'

import { createClient } from '@/utils/supabase/server'

export interface DriverNotification {
  id: number
  Driver_ID: string
  Title: string
  Message: string
  Type: 'info' | 'success' | 'warning' | 'error'
  Is_Read: boolean
  Created_At: string
  Link?: string
}

export async function getDriverNotifications(driverId: string): Promise<DriverNotification[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('Notifications')
    .select('*')
    .eq('Driver_ID', driverId)
    .order('Created_At', { ascending: false })
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
    .update({ Is_Read: true })
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
    .update({ Is_Read: true })
    .eq('Driver_ID', driverId)
    .eq('Is_Read', false)

  if (error) {
    console.error('Error marking all notifications read:', error)
    return { success: false }
  }

  return { success: true }
}

// Helper to create notification (used by admin or system)
export async function createNotification(data: {
  Driver_ID: string
  Title: string
  Message: string
  Type: 'info' | 'success' | 'warning' | 'error'
  Link?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Notifications')
    .insert({
      Driver_ID: data.Driver_ID,
      Title: data.Title,
      Message: data.Message,
      Type: data.Type,
      Link: data.Link,
      Created_At: new Date().toISOString()
    })

  if (error) {
    console.error('Error creating notification:', error)
    return { success: false }
  }

  return { success: true }
}
