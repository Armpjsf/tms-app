import { NextResponse } from 'next/server'
import { getNotifications } from '@/lib/supabase/notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const notifications = await getNotifications()
    return NextResponse.json({ notifications })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
