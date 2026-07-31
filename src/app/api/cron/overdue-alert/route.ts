import { NextResponse } from 'next/server'
import { getOverdueJobs } from '@/lib/actions/overdue-actions'
import { sendPushToAdmins } from '@/lib/actions/push-actions'

// Daily push alert: notify admins about jobs past their delivery date that
// are still not delivered/closed. Grouped per branch so branch admins only
// hear about their own; super admins receive every branch's alert.
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { count, jobs } = await getOverdueJobs()
        if (!count) return NextResponse.json({ status: 'no_overdue_jobs' })

        // Group overdue jobs by branch
        const byBranch = new Map<string, number>()
        for (const j of jobs) {
            const key = j.Branch_ID || '__none__'
            byBranch.set(key, (byBranch.get(key) || 0) + 1)
        }

        let pushed = 0
        for (const [branch, n] of byBranch) {
            const branchId = branch === '__none__' ? undefined : branch
            await sendPushToAdmins({
                title: '⚠️ งานเลยกำหนดส่ง',
                body: `มีงานเลยกำหนดส่งแต่ยังไม่เสร็จ ${n} รายการ${branchId ? ` (สาขา ${branchId})` : ''}`,
                url: '/dashboard',
            }, branchId)
            pushed++
        }

        return NextResponse.json({ status: 'ok', overdue: count, branches: pushed })
    } catch (error: unknown) {
        console.error('[CRON overdue-alert] Error:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
}
