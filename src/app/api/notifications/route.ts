import { NextResponse } from 'next/server'
import { getNotifications } from '@/lib/supabase/notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const notifications = await getNotifications()
    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ notifications: [] })
  }
}
