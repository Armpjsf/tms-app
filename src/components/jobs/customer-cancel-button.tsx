"use client"

import { useState } from "react"
import { Ban } from "lucide-react"
import { cancelJobRequest } from "@/app/planning/actions"
import { toast } from "sonner"
import { PremiumButton } from "@/components/ui/premium-button"

export function CustomerCancelButton({ jobId, jobStatus }: { jobId: string, jobStatus: string }) {
  const [loading, setLoading] = useState(false)

  if (jobStatus !== 'Requested' && jobStatus !== 'New') {
    return null
  }

  const handleCancel = async () => {
    if (!window.confirm("คุณต้องการยกเลิกคำขอส่งสินค้านี้ใช่หรือไม่?")) return
    
    setLoading(true)
    try {
      const res = await cancelJobRequest(jobId)
      if (res.success) {
        toast.success("ยกเลิกคำขอเรียบร้อยแล้ว")
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการยกเลิกคำขอ")
      }
    } catch {
      toast.error("System error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
      <PremiumButton 
        variant="outline" 
        onClick={handleCancel}
        disabled={loading}
        className="h-9 px-4 text-lg font-bold font-bold text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl"
      >
        <Ban size={14} className="mr-1.5" />
        {loading ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}
      </PremiumButton>
    </div>
  )
}

