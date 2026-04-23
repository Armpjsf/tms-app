"use client"

import { useEffect, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"

export function PresenceManager({ driverId }: { driverId: string }) {
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        if (!driverId) return

        const channel = supabase.channel('online_drivers', {
            config: {
                presence: {
                    key: driverId,
                },
            },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                console.log('Presence sync')
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        driver_id: driverId,
                        online_at: new Date().toISOString(),
                    })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [driverId, supabase])

    return null
}
