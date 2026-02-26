import { NextRequest, NextResponse } from 'next/server'
import { savePushSubscription } from '@/lib/actions/push-actions'

export async function POST(req: NextRequest) {
    try {
        const { driverId, subscription } = await req.json()

        if (!driverId || !subscription) {
            return NextResponse.json(
                { error: 'driverId and subscription are required' },
                { status: 400 }
            )
        }

        const result = await savePushSubscription(driverId, subscription)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[API Push Subscribe] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
