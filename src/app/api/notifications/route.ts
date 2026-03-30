import { NextResponse } from 'next/server'
import { getNotifications } from '@/lib/supabase/notifications'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [notifications, supabase] = await Promise.all([
      getNotifications(),
      createClient()
    ])

    // Get current user ID for admin push subscription
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    return NextResponse.json({ notifications, userId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
