"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

// กันเหนียว: ถ้า TrackingHubClient render งานบางเคสแล้ว throw (เช่นงานเก่า/เสร็จแล้ว
// ที่บาง field ต่าง shape) ให้โชว์ fallback แทนที่จะขึ้น "Application error" ทั้งจอ
export default function TrackingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-6">
      <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl">
        <AlertTriangle size={32} />
      </div>
      <div>
        <p className="text-lg font-black text-foreground">แสดงรายละเอียดงานนี้ไม่ได้</p>
        <p className="text-sm text-muted-foreground mt-1">ข้อมูลบางส่วนของงานนี้ไม่สมบูรณ์ ลองใหม่อีกครั้ง หรือเปิดดูที่หน้าติดตามงาน</p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all"
      >
        <RefreshCw size={16} /> ลองใหม่
      </button>
    </div>
  )
}
