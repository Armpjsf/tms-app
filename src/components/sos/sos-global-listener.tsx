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
    const channel = supabase
      .channel('global-sos-listener')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Jobs_Main',
        filter: "Job_Status=eq.SOS"
      }, (payload) => {
        const data = payload.new as any
        if (!data || notifiedIds.current.has(data.Job_ID)) return

        // New SOS detected!
        notifiedIds.current.add(data.Job_ID)
        
        // Play sound if possible (optional enhancement)
        try {
          const audio = new Audio('/sounds/emergency-alert.mp3')
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
                 {data.Driver_Name || 'Unknown Driver'} is requesting help!
               </p>
               <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-bold">
                 <Phone size={12} /> {data.Vehicle_Plate || 'N/A'}
               </div>
            </div>
            <div className="flex gap-2 mt-2">
               <button 
                 onClick={() => {
                   router.push('/sos')
                   toast.dismiss()
                 }}
                 className="flex-1 bg-rose-600 text-white font-black py-2 rounded-xl text-xs uppercase tracking-widest hover:bg-rose-700 transition-colors"
               >
                 View Context
               </button>
               <button 
                 onClick={() => toast.dismiss()}
                 className="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-colors"
               >
                 Dismiss
               </button>
            </div>
          </div>,
          {
            duration: 10000, // 10 seconds visibility
            id: `sos-${data.Job_ID}`,
            position: 'top-right'
          }
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, t])

  return null
}
