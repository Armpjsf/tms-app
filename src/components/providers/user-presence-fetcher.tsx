"use client"

import { useEffect, useState } from "react"
import { getUserProfile } from "@/lib/supabase/users"
import { PresenceProvider } from "./presence-provider"
import { UserData } from "@/lib/actions/user-actions"

export function UserPresenceFetcher({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadUser() {
            try {
                const profile = await getUserProfile()
                if (profile) {
                    setUser(profile as unknown as UserData)
                }
            } catch (error) {
                console.error("Failed to load user for presence:", error)
            } finally {
                setLoading(false)
            }
        }
        loadUser()
    }, [])

    if (loading) return <>{children}</>

    return (
        <PresenceProvider user={user}>
            {children}
        </PresenceProvider>
    )
}
