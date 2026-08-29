import { NextResponse } from 'next/server'
import { runAllSentinelChecks } from '@/lib/ai/sentinel'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await runAllSentinelChecks()
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      alertsTriggered: result.count,
      alerts: result.alerts
    })
  } catch (error: unknown) {
    console.error('[CRON AI-Sentinel Error]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
