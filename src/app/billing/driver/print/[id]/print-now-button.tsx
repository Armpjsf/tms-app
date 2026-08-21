"use client"

import { Printer } from "lucide-react"

/** ปุ่มสั่งพิมพ์เอง — ใช้ในหน้าใบสำคัญจ่ายคนขับ (เผื่อ auto-print ถูกเบราว์เซอร์บล็อก หรืออยู่ในโหมดดู) */
export function PrintNowButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold inline-flex items-center gap-2"
        >
            <Printer className="w-4 h-4" /> พิมพ์เอกสาร
        </button>
    )
}
