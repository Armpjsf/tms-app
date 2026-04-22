"use client"

import { useEffect, createContext, useContext, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { UserData } from "@/lib/actions/user-actions"

interface PresenceState {
    user: UserData | null
    onlineUsers: any[]
}

const PresenceContext = createContext<PresenceState>({ user: null, onlineUsers: [] })

export function PresenceProvider({ children, user }: { children: React.ReactNode, user: UserData | null }) {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        if (!user) return

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.Username,
                },
            },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const users = Object.values(state).flat()
                setOnlineUsers(users)
            })
            .on('presence', { event: 'join', key: user.Username }, ({ newPresences }) => {
                // User joined
            })
            .on('presence', { event: 'leave', key: user.Username }, ({ leftPresences }) => {
                // User left
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        username: user.Username,
                        name: user.Name,
                        role: user.Role,
                        branch: user.Branch_ID,
                        online_at: new Date().toISOString(),
                    })
                }
            })

        return () => {
            channel.unsubscribe()
        }
    }, [user, supabase])

    return (
        <PresenceContext.Provider value={{ user, onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    )
}

export const usePresence = () => useContext(PresenceContext)
