"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function MobileRefreshButton() {
    const router = useRouter()
    const [refreshing, setRefreshing] = useState(false)

    const handleRefresh = () => {
        setRefreshing(true)
        router.refresh()
        // Artificial delay for visual feedback
        setTimeout(() => setRefreshing(false), 1000)
    }

    return (
        <button 
            onClick={handleRefresh}
            className={cn(
                "p-3 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/10 text-muted-foreground active:scale-95 transition-all shadow-sm hover:text-primary hover:border-primary/20",
                refreshing && "text-primary border-primary/20"
            )}
            aria-label="Refresh Jobs"
        >
            <RefreshCw size={20} className={cn(refreshing && "animate-spin")} />
        </button>
    )
}
