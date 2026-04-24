"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export function RealtimeJobsTrigger({ driverId }: { driverId: string }) {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        if (!driverId) return

        // Listen for ANY change in Jobs_Main that might affect this driver
        // Specifically INSERT or UPDATE where Driver_ID is the current driver
        const channel = supabase
            .channel(`driver_jobs_${driverId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Jobs_Main',
                    filter: `Driver_ID=eq.${driverId}`
                },
                (payload) => {
                    console.log('Real-time job change detected:', payload)
                    
                    // Show a toast if it's a new job (INSERT) or a job status update
                    const isNewJob = payload.eventType === 'INSERT'
                    const isAssignment = payload.eventType === 'UPDATE' && payload.new.Driver_ID === driverId && !payload.old.Driver_ID

                    if (isNewJob || isAssignment) {
                        import("sonner").then(({ toast }) => {
                            toast.success("มีงานใหม่เข้า! รายการอัปเดตแล้ว", {
                                description: `เลขงาน: ${payload.new.Job_ID}`,
                                duration: 5000,
                            })
                        })
                    }

                    // Trigger a server component refresh
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [driverId, router, supabase])

    return null
}
