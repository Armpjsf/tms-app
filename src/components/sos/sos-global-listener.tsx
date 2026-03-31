"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { ShieldAlert, Phone, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/providers/language-provider"

/**
 * SOSGlobalListener
 * Subscribes to Jobs_Main to detect new SOS events globally and show a high-priority toast.
 */
export function SOSGlobalListener() {
  const { t } = useLanguage()
  const router = useRouter()
  // Track notified IDs to avoid double-toasting for the same event updates
  const notifiedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    
    // 1. SOS Listener (Jobs_Main Updates)
    const sosChannel = supabase
      .channel('global-sos-listener')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Jobs_Main',
        filter: "Job_Status=eq.SOS"
      }, (payload) => {
        const data = payload.new as any
        if (!data || notifiedIds.current.has(`sos-${data.Job_ID}`)) return

        // Recency check (last 2 mins)
        const updatedTime = new Date(data.Failed_Time || data.Updated_At || Date.now()).getTime()
        if (Date.now() - updatedTime > 120000) return

        notifiedIds.current.add(`sos-${data.Job_ID}`)
        
        try {
          const audio = new Audio('/sounds/emergency.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {})
        } catch {}

        toast.error(
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-3 text-rose-600">
               <ShieldAlert className="animate-pulse" size={24} />
               <span className="font-black text-lg uppercase tracking-tight">SOS EMERGENCY ALERT!</span>
            </div>
            <div className="space-y-1">
               <p className="font-bold text-base text-foreground">
                 {data.Driver_Name || 'คนขับ'} แจ้งเหตุฉุกเฉิน!
               </p>
               <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-bold">
                 {data.Vehicle_Plate || 'N/A'} • {data.Job_ID}
               </div>
            </div>
            <div className="flex gap-2 mt-2">
               <button 
                 onClick={() => {
                   router.push('/sos')
                   toast.dismiss(`sos-${data.Job_ID}`)
                 }}
                 className="flex-1 bg-rose-600 text-white font-black py-2 rounded-xl text-xs uppercase tracking-widest hover:bg-rose-700 transition-colors"
               >
                 ดูสถานการณ์
               </button>
            </div>
          </div>,
          {
            duration: 10000,
            id: `sos-${data.Job_ID}`,
            position: 'top-right'
          }
        )
      })
      .subscribe()

    // 2. Premium Chat Listener (Chat_Messages Inserts)
    const chatChannel = supabase
      .channel('global-chat-listener')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'Chat_Messages'
      }, (payload) => {
        const data = payload.new as any
        if (!data || data.receiver_id !== 'admin' || notifiedIds.current.has(`chat-${data.id}`)) return

        notifiedIds.current.add(`chat-${data.id}`)
        
        try {
          const audio = new Audio('/sounds/notification.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {})
        } catch {}

        toast.info(
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-3 text-blue-500">
               <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Phone size={20} />
               </div>
               <span className="font-black text-lg uppercase tracking-tight">ข้อความใหม่</span>
            </div>
            <div className="space-y-1">
               <p className="font-bold text-base text-foreground line-clamp-2">
                 {data.message}
               </p>
               <p className="text-xs text-muted-foreground font-bold">
                 จาก: {data.sender_id}
               </p>
            </div>
            <div className="flex gap-2 mt-2">
               <button 
                 onClick={() => {
                   router.push(`/monitoring?driver=${data.sender_id}&openChat=true`)
                   toast.dismiss(`chat-${data.id}`)
                 }}
                 className="flex-1 bg-blue-500 text-white font-black py-2 rounded-xl text-xs uppercase tracking-widest hover:bg-blue-600 transition-colors"
               >
                 ตอบกลับทันที
               </button>
            </div>
          </div>,
          {
            duration: 6000,
            id: `chat-${data.id}`,
            position: 'top-right'
          }
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sosChannel)
      supabase.removeChannel(chatChannel)
    }
  }, [router, t])

  return null
}
