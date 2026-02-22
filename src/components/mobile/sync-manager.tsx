"use client"

import { useEffect } from "react"
import { syncOfflineJobs } from "@/lib/utils/offline-storage"
import { usePathname } from "next/navigation"

export function SyncManager() {
    const pathname = usePathname()

    useEffect(() => {
        // Initial sync check
        syncOfflineJobs()

        // Sync when coming back online
        const handleOnline = () => {
            console.log("Connection restored. Syncing...")
            syncOfflineJobs()
        }

        window.addEventListener('online', handleOnline)
        return () => window.removeEventListener('online', handleOnline)
    }, [])

    // Also try to sync when navigating (good opportunity)
    useEffect(() => {
        syncOfflineJobs()
    }, [pathname])

    return null // Invisible component
}
