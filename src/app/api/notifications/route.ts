import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getNotifications, markAllNotificationsAsRead } from '@/lib/supabase/notifications'
import { getUserBranchId, isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [notifications, branchId, isAdminUser, session] = await Promise.all([
      getNotifications(),
      getUserBranchId(),
      isAdmin(),
      getSession()
    ])

    // Get current user ID (Username) for admin push subscription
    // Using session.userId (Username) instead of supabase UUID to match Master_Users
    const userId = session?.userId || null

    return NextResponse.json({ 
      notifications, 
      userId,
      branchId: branchId || null,
      isAdmin: isAdminUser
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await markAllNotificationsAsRead()
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
