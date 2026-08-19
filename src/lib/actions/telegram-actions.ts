'use server'

import { telegramLinkFor, hasTelegramBot } from '@/lib/integrations/telegram'

/**
 * สร้างลิงก์ผูกบัญชี Telegram สำหรับลูกค้า/ผู้ใช้
 * (อ่าน env TELEGRAM_BOT_USERNAME ฝั่ง server) — คืน null ถ้ายังไม่ได้ตั้งค่า
 */
export async function getTelegramLink(
    kind: 'customer' | 'user',
    id: string
): Promise<{ link: string | null; configured: boolean }> {
    return {
        link: telegramLinkFor(kind, id),
        configured: hasTelegramBot() && !!process.env.TELEGRAM_BOT_USERNAME,
    }
}
