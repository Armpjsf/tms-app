import { NextRequest, NextResponse } from 'next/server'
import { savePushSubscription } from '@/lib/actions/push-actions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET() {
    return NextResponse.json({ message: "Subscribe route is reachable!" }, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
    try {
        const { driverId, subscription } = await req.json()

        if (!driverId || !subscription) {
            return NextResponse.json(
                { error: 'driverId and subscription are required' },
                { status: 400, headers: corsHeaders }
            )
        }

        const result = await savePushSubscription(driverId, subscription)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500, headers: corsHeaders })
        }

        return NextResponse.json({ success: true }, { headers: corsHeaders })
    } catch (error) {
        console.error('[API Push Subscribe] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
    }
}
