"use client"

import { useState } from "react"
import { Send, Loader2, ShieldCheck, AlertCircle } from "lucide-react"
import { PremiumButton } from "@/components/ui/premium-button"
import { toast } from "sonner"
import { testPushNotification } from "@/lib/actions/push-actions"
import { cn } from "@/lib/utils"

interface Props {
  driverId?: string | null
  userId?: string | null
}

export function PushTestButton({ driverId, userId }: Props) {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; reason?: string } | null>(null)

  const handleTest = async () => {
    if (!driverId && !userId) {
      toast.error("ไม่พบบัญชีผู้ใช้งานสำหรับการทดสอบ")
      return
    }

    setLoading(true)
    setLastResult(null)
    
    try {
      // 1. Check browser support / permission first
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          toast.error("กรุณาเปิดสิทธิ์การแจ้งเตือนในเบราว์เซอร์ก่อนทดสอบ")
          setLoading(false)
          return
        }
      }

      const result = await testPushNotification({ 
        driverId: driverId || undefined, 
        userId: userId || undefined 
      })

      setLastResult(result)
      
      if (result.success) {
        toast.success("ส่งสัญญาณทดสอบเรียบร้อยแล้ว! กรุณารอรับการแจ้งเตือนบนเครื่องของคุณ")
      } else {
        const errorMsg = result.reason === 'no_subscription' 
          ? "ไม่พบรหัสเครื่องในระบบ กรุณากด 'เปิดรับการแจ้งเตือน' ก่อน" 
          : "ส่งไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"
        toast.error(errorMsg)
      }
    } catch (err) {
      console.error("Test push error:", err)
      toast.error("ระบบขัดข้องในการส่งสัญญาณทดสอบ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PremiumButton
        onClick={handleTest}
        disabled={loading}
        variant="outline"
        className="w-full h-16 rounded-2xl border-primary/20 hover:border-primary/40 bg-primary/5 text-primary font-black uppercase tracking-widest italic group/test"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5 group-hover/test:translate-x-1 group-hover/test:-translate-y-1 transition-transform" />
        )}
        <span className="ml-3">ส่งสัญญาณทดสอบ (Push Test)</span>
      </PremiumButton>

      {lastResult && (
        <div className={cn(
          "p-6 rounded-2xl border-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500",
          lastResult.success 
            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
            : "bg-rose-500/5 border-rose-500/20 text-rose-500"
        )}>
          {lastResult.success ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
          <div className="text-sm font-bold uppercase tracking-tight">
            <p className="font-black italic">{lastResult.success ? 'SIGNAL_SENT: OK' : 'SIGNAL_FAILED'}</p>
            <p className="opacity-70 mt-1 leading-relaxed">
              {lastResult.success 
                ? "สัญญาณถูกส่งจาก Server แล้ว หากไม่มีการแจ้งเตือนเด้งขึ้นมา ให้ตรวจสอบการตั้งค่า Browser หรือ PWA" 
                : lastResult.reason === 'no_subscription' 
                  ? "เครื่องนี้ยังไม่ได้ลงทะเบียนรับแจ้งเตือน" 
                  : "เกิดข้อผิดพลาดในการนำส่งสัญญาณ"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
