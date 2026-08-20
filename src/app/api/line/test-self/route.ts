import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { isAdmin } from '@/lib/permissions'
import { getLineClient, isBot2Configured, getActiveCustomerBot, type BotIndex } from '@/lib/integrations/line'

/**
 * LINE self-test — admin-only diagnostic. Sends a test push to every bound
 * admin id through each configured bot and reports the RAW LINE result, so we
 * can tell apart: bad/missing token, exhausted quota (429), or an id that
 * belongs to the other Official Account (400 "invalid user id").
 *
 * Open /api/line/test-self while logged in as an admin. It sends real messages
 * (uses quota) — that's the point of a live probe.
 */
async function trySend(to: string, bot: BotIndex) {
    try {
        const client = getLineClient(bot)
        await client.pushMessage({ to, messages: [{ type: 'text', text: `🔧 ทดสอบ LINE (bot ${bot}) — ${new Date().toLocaleTimeString('th-TH')}` }] })
        return { bot, to, ok: true }
    } catch (e: unknown) {
        const err = e as { statusCode?: number; status?: number; body?: unknown; message?: string }
        return {
            bot, to, ok: false,
            status: err?.statusCode ?? err?.status ?? null,
            message: err?.message || String(e),
            body: err?.body ?? null,
        }
    }
}

// Temporary unguessable key so we can run the probe even if the session isn't
// visible in this route handler. Remove this route after diagnosing.
const DIAG_KEY = 'ddst-line-diag-7f3a'

export async function GET(request: Request) {
    const key = new URL(request.url).searchParams.get('key')
    const allowed = key === DIAG_KEY || (await isAdmin())
    if (!allowed) {
        return NextResponse.json({ success: false, error: 'admin only' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const bot2 = isBot2Configured()

    const config = {
        bot1_token_set: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
        bot2_configured: bot2,
        active_bot_now: getActiveCustomerBot(),
    }

    // Try with the new second-bot column; fall back if the migration isn't run yet.
    let admins: unknown[] | null = null
    {
        const res = await supabase
            .from('Master_Users')
            .select('Username, Name, Role_ID, Line_User_ID, Line_User_ID_2')
            .in('Role_ID', [1, 2])
        if (res.error) {
            const res2 = await supabase
                .from('Master_Users')
                .select('Username, Name, Role_ID, Line_User_ID')
                .in('Role_ID', [1, 2])
            admins = res2.data
        } else {
            admins = res.data
        }
    }

    const results: unknown[] = []
    for (const a of admins || []) {
        const row = a as { Username: string; Name: string; Line_User_ID?: string | null; Line_User_ID_2?: string | null }
        const attempts: unknown[] = []
        // Probe the primary id on BOTH bots (reveals which OA it belongs to).
        if (row.Line_User_ID) {
            attempts.push(await trySend(row.Line_User_ID, 1))
            if (bot2) attempts.push(await trySend(row.Line_User_ID, 2))
        }
        // Probe the second id on bot 2 (where it should belong).
        if (row.Line_User_ID_2 && bot2) {
            attempts.push(await trySend(row.Line_User_ID_2, 2))
        }
        results.push({
            user: row.Username,
            name: row.Name,
            line_user_id: row.Line_User_ID || null,
            line_user_id_2: row.Line_User_ID_2 || null,
            attempts,
        })
    }

    return NextResponse.json({ success: true, config, results })
}
