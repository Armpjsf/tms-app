/**
 * Telegram alert channel — ช่องแจ้งเตือนแอดมิน/dev เสริมจาก Web Push + LINE
 *
 * ฟรี ไม่มีลิมิตโหดเหมือน LINE (300 pushes/เดือน) เหมาะเป็นช่องแจ้งเตือนภายในทีม
 * (SOS, สถานะงาน, IP ค้างอนุมัติ ฯลฯ). ทำงานแบบ opt-in: ถ้าไม่ตั้ง env ก็เงียบ (no-op)
 *
 * ตั้งค่า:
 *   TELEGRAM_BOT_TOKEN  — token จาก @BotFather
 *   TELEGRAM_CHAT_ID    — chat/group id ที่จะให้บอทส่งเข้าไป
 *
 * วิธีหา chat id: เพิ่มบอทเข้ากลุ่ม แล้วเปิด
 *   https://api.telegram.org/bot<token>/getUpdates  → ดู chat.id
 */

export function isTelegramConfigured(): boolean {
    return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

// escape อักขระที่ MarkdownV2 ของ Telegram สงวนไว้ กันข้อความพัง
function escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&")
}

type TelegramAlert = {
    title: string
    body?: string
    /** ลิงก์ให้กดจากในแชท (เช่นลิงก์หน้า job) */
    url?: string
}

/**
 * ส่งข้อความแจ้งเตือนเข้า Telegram — non-throwing เสมอ (คืน false ถ้าล้มเหลว/ไม่ได้ตั้งค่า)
 * ตั้งใจให้เรียกแบบ fire-and-forget โดยไม่บล็อก flow หลัก
 */
export async function sendTelegramAlert(alert: TelegramAlert): Promise<boolean> {
    if (!isTelegramConfigured()) return false

    const token = process.env.TELEGRAM_BOT_TOKEN!
    const chatId = process.env.TELEGRAM_CHAT_ID!

    const lines = [`*${escapeMarkdown(alert.title)}*`]
    if (alert.body) lines.push(escapeMarkdown(alert.body))
    if (alert.url) {
        const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || ""
        const fullUrl = alert.url.startsWith("http") ? alert.url : `${base}${alert.url}`
        if (fullUrl) lines.push(escapeMarkdown(fullUrl))
    }

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: lines.join("\n"),
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true,
            }),
            // อย่าให้ค้างนาน — timeout 5s
            signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) {
            console.warn("[TELEGRAM] sendMessage failed:", res.status, await res.text().catch(() => ""))
            return false
        }
        return true
    } catch (e) {
        console.warn("[TELEGRAM] sendMessage error:", e instanceof Error ? e.message : e)
        return false
    }
}
