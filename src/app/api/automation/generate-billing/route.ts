import { NextResponse } from 'next/server'
import { generateMonthlyBillingNotes } from '@/lib/supabase/billing-automation'

/**
 * Triggered at 23:00 on the last day of the month
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    // Basic Security: Check for a CRON_SECRET in environment variables
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await generateMonthlyBillingNotes()
    
    if (result.success) {
        return NextResponse.json(result)
    } else {
        return NextResponse.json(result, { status: 500 })
    }
}
