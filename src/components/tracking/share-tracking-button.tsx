"use client"

import { Share2, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function ShareTrackingButton({ jobId }: { jobId: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ติดตามการขนส่ง - ${jobId}`,
          text: `คุณสามารถติดตามสถานะการขนส่งงาน ${jobId} ได้ที่นี่:`,
          url: url,
        })
      } catch (err) {
        console.error("Share failed:", err)
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error("Copy failed:", err)
      }
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button 
            onClick={handleShare}
            className={`rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 font-bold px-8 py-6 transition-all duration-300 ${
                copied ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-slate-200'
            }`}
        >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
            <span>{copied ? 'คัดลอกลิงก์แล้ว!' : 'แชร์ลิงก์ติดตามนี้'}</span>
        </Button>
    </div>
  )
}
