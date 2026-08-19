"use client"

import { useState } from "react"
import { Send, Copy, Check, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { getTelegramLink } from "@/lib/actions/telegram-actions"

/**
 * ปุ่มสร้างลิงก์ผูกบัญชี Telegram — ลูกค้า/แอดมินกดลิงก์ → กด Start ที่บอท
 * → webhook บันทึก chat_id ให้ส่งแจ้งเตือนส่วนตัวได้
 */
export function TelegramLinkButton({
    kind,
    id,
    label,
}: {
    kind: "customer" | "user"
    id: string
    label?: string
}) {
    const [link, setLink] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleGenerate = async () => {
        if (!id) {
            toast.error("ต้องบันทึกข้อมูลก่อนจึงจะผูก Telegram ได้")
            return
        }
        setLoading(true)
        try {
            const res = await getTelegramLink(kind, id)
            if (!res.configured) {
                toast.error("ยังไม่ได้ตั้งค่า Telegram Bot (TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_USERNAME)")
                return
            }
            if (!res.link) {
                toast.error("สร้างลิงก์ไม่สำเร็จ")
                return
            }
            setLink(res.link)
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async () => {
        if (!link) return
        await navigator.clipboard.writeText(link)
        setCopied(true)
        toast.success("คัดลอกลิงก์แล้ว — ส่งให้ผู้ใช้กดเพื่อผูกบัญชี")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-2">
            {!link ? (
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-600 text-xs font-black uppercase tracking-widest hover:bg-sky-500/20 transition-all disabled:opacity-50"
                >
                    <Send size={14} />
                    {loading ? "กำลังสร้าง…" : label || "ผูก Telegram"}
                </button>
            ) : (
                <div className="flex items-center gap-2 flex-wrap">
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-black uppercase tracking-widest hover:bg-sky-600 transition-all"
                    >
                        <ExternalLink size={14} /> เปิดลิงก์ผูกบัญชี
                    </a>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:text-foreground transition-all"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                </div>
            )}
            {link && (
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    ส่งลิงก์นี้ให้ผู้ใช้ → กด <b>Start</b> ที่บอท → ระบบจะผูกบัญชีและเริ่มส่งแจ้งเตือนอัตโนมัติ
                </p>
            )}
        </div>
    )
}
