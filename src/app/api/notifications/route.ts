import { NextResponse } from 'next/server'
import { getNotifications } from '@/lib/supabase/notifications'
import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [notifications, supabase, branchId, isAdminUser] = await Promise.all([
      getNotifications(),
      createClient(),
      getUserBranchId(),
      isAdmin()
    ])

    // Get current user ID for admin push subscription
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

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
