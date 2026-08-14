import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { sendPushToAdmins } from '@/lib/actions/push-actions'

// Proactive compliance reminders for company fleet.
//
// The system already STORES document expiry dates (vehicle tax / insurance /
// compulsory ACT, and driver licence) and shows them on dashboards, but nothing
// warned admins *before* a document lapsed — you had to open the dashboard to
// notice. This cron runs once a day and pushes a single digest to admins listing
// everything expiring within the warning window (default 30 days) or already
// expired, so renewals don't get missed.
//
// Schedule it on cron-job.org (same place as the cleanup cron) with header
//   Authorization: Bearer <CRON_SECRET>
// e.g. daily at 08:00 Asia/Bangkok.

export const dynamic = 'force-dynamic'

type DocItem = { label: string; who: string; days: number }

function daysUntil(dateStr: string | null | undefined, today: Date): number | null {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Warning window in days (document expiring within this many days is flagged).
        const WARN_DAYS = parseInt(process.env.EXPIRY_WARN_DAYS || '30', 10) || 30

        const supabase = await createAdminClient()
        // Reset "today" to local midnight so day counts are stable through the day.
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const items: DocItem[] = []

        // ── Vehicles: tax / insurance / compulsory ACT ──────────────────────
        const { data: vehicles } = await supabase
            .from('Master_Vehicles')
            .select('Vehicle_Plate, Tax_Expiry, Insurance_Expiry, Act_Expiry, Active_Status')

        for (const v of vehicles || []) {
            if (v.Active_Status && v.Active_Status !== 'Active') continue
            const plate = v.Vehicle_Plate || 'ไม่ทราบทะเบียน'
            const checks: Array<[string, string | null]> = [
                ['ภาษีรถ', v.Tax_Expiry],
                ['ประกันภัย', v.Insurance_Expiry],
                ['พ.ร.บ.', v.Act_Expiry],
            ]
            for (const [label, date] of checks) {
                const d = daysUntil(date, today)
                if (d !== null && d <= WARN_DAYS) items.push({ label, who: plate, days: d })
            }
        }

        // ── Drivers: driving licence ────────────────────────────────────────
        const { data: drivers } = await supabase
            .from('Master_Drivers')
            .select('Driver_Name, Expire_Date, Active_Status')

        for (const dr of drivers || []) {
            if (dr.Active_Status && dr.Active_Status !== 'Active') continue
            const d = daysUntil(dr.Expire_Date, today)
            if (d !== null && d <= WARN_DAYS) {
                items.push({ label: 'ใบขับขี่', who: dr.Driver_Name || 'ไม่ทราบชื่อ', days: d })
            }
        }

        if (items.length === 0) {
            return NextResponse.json({ status: 'ok', flagged: 0, message: 'No documents nearing expiry.' })
        }

        // Sort most-urgent first (already expired = most negative).
        items.sort((a, b) => a.days - b.days)

        const expiredCount = items.filter(i => i.days < 0).length
        const soonCount = items.length - expiredCount

        // Count by document type for the summary line.
        const byType: Record<string, number> = {}
        for (const i of items) byType[i.label] = (byType[i.label] || 0) + 1
        const typeSummary = Object.entries(byType).map(([k, n]) => `${k} ${n}`).join(' • ')

        // Up to 3 most-urgent items spelled out.
        const topLines = items.slice(0, 3).map(i => {
            const when = i.days < 0 ? `เกินกำหนด ${Math.abs(i.days)} วัน` : i.days === 0 ? 'หมดอายุวันนี้' : `เหลือ ${i.days} วัน`
            return `• ${i.label} ${i.who} — ${when}`
        })

        const title = expiredCount > 0
            ? `🚨 เอกสารหมดอายุ/ใกล้หมด ${items.length} รายการ`
            : `⚠️ เอกสารใกล้หมดอายุ ${items.length} รายการ`

        const body = [typeSummary, ...topLines].join('\n')

        await sendPushToAdmins({
            title,
            body,
            url: '/maintenance',
            type: 'compliance_expiry',
            tag: 'expiry_digest',
        })

        return NextResponse.json({
            status: 'ok',
            flagged: items.length,
            expired: expiredCount,
            expiringSoon: soonCount,
            warnDays: WARN_DAYS,
            items,
        })
    } catch (err) {
        console.error('[CRON Expiry] Critical Exception:', err)
        return NextResponse.json({ error: 'Internal Server Error', details: (err as Error).message }, { status: 500 })
    }
}
