import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { sendTelegramText } from '@/lib/integrations/telegram'

/**
 * Telegram webhook — รับ update จากบอท เพื่อ "ผูกบัญชี" ลูกค้า/แอดมิน
 *
 * ผู้ใช้กดลิงก์ deep link (t.me/<bot>?start=c_<CustomerID> หรือ u_<Username>)
 * แล้วกด Start → Telegram ยิง /start <payload> มาที่ webhook นี้ → เราบันทึก
 * chat_id ลง DB เพื่อให้ส่งแจ้งเตือนส่วนตัวได้ภายหลัง
 *
 * ตั้ง webhook (ครั้งเดียว) ด้วย:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/telegram/webhook&secret_token=<SECRET>
 *
 * ความปลอดภัย: ตรวจ header X-Telegram-Bot-Api-Secret-Token = TELEGRAM_WEBHOOK_SECRET
 */

export async function POST(req: NextRequest) {
    // 1. ตรวจ secret (ถ้าตั้งไว้) — กันคนยิง endpoint ปลอม
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (expectedSecret) {
        const got = req.headers.get('x-telegram-bot-api-secret-token')
        if (got !== expectedSecret) {
            return NextResponse.json({ ok: false }, { status: 401 })
        }
    }

    let update: any
    try {
        update = await req.json()
    } catch {
        return NextResponse.json({ ok: true }) // ไม่ใช่ JSON → เมิน แต่ตอบ 200 กัน Telegram retry
    }

    const message = update?.message || update?.edited_message
    const text: string = message?.text || ''
    const chatId = message?.chat?.id

    if (!chatId || !text) {
        return NextResponse.json({ ok: true })
    }

    // จับเฉพาะคำสั่ง /start <payload>
    const match = text.trim().match(/^\/start(?:@\w+)?\s+(\S+)/)
    if (!match) {
        // /start เปล่า หรือข้อความอื่น → ตอบข้อความต้อนรับสั้นๆ
        if (/^\/start\b/.test(text.trim())) {
            await sendTelegramText(String(chatId),
                'สวัสดีครับ 👋 กรุณาผูกบัญชีผ่านลิงก์ที่ได้รับจากระบบ TMS เพื่อรับแจ้งเตือนงานของคุณ')
        }
        return NextResponse.json({ ok: true })
    }

    const payload = match[1]
    const kind = payload.startsWith('c_') ? 'customer' : payload.startsWith('u_') ? 'user' : null
    const refId = kind ? payload.slice(2) : null

    if (!kind || !refId) {
        await sendTelegramText(String(chatId), 'ลิงก์ผูกบัญชีไม่ถูกต้องครับ กรุณาขอลิงก์ใหม่จากระบบ TMS')
        return NextResponse.json({ ok: true })
    }

    const supabase = await createAdminClient()

    try {
        if (kind === 'customer') {
            const { data, error } = await supabase
                .from('Master_Customers')
                .update({ Telegram_Chat_ID: String(chatId) })
                .eq('Customer_ID', refId)
                .select('Customer_Name')
                .maybeSingle()

            if (error || !data) {
                await sendTelegramText(String(chatId), '❌ ไม่พบรหัสลูกค้าในระบบ กรุณาติดต่อผู้ดูแล')
            } else {
                await sendTelegramText(String(chatId),
                    `✅ ผูกบัญชีสำเร็จ\nลูกค้า: ${data.Customer_Name || refId}\nคุณจะได้รับแจ้งเตือนสถานะงานของคุณผ่าน Telegram นี้ครับ`)
            }
        } else {
            const { data, error } = await supabase
                .from('Master_Users')
                .update({ Telegram_Chat_ID: String(chatId) })
                .eq('Username', refId)
                .select('Username, Role_ID')
                .maybeSingle()

            if (error || !data) {
                await sendTelegramText(String(chatId), '❌ ไม่พบบัญชีผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแล')
            } else {
                const scope = Number(data.Role_ID) === 1 ? 'ลูกค้าทั้งหมดในระบบ' : 'ลูกค้าในสาขาที่คุณรับผิดชอบ'
                await sendTelegramText(String(chatId),
                    `✅ ผูกบัญชีสำเร็จ\nผู้ใช้: ${data.Username}\nคุณจะได้รับแจ้งเตือนงานของ${scope}ผ่าน Telegram นี้ครับ`)
            }
        }
    } catch (e) {
        console.warn('[TELEGRAM_WEBHOOK] link error:', e instanceof Error ? e.message : e)
    }

    return NextResponse.json({ ok: true })
}

// Telegram อาจ ping ด้วย GET ตอนตั้งค่า
export async function GET() {
    return NextResponse.json({ ok: true, service: 'telegram-webhook' })
}
