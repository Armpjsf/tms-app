"use client"

import { useEffect, useState, useCallback } from "react"
import { syncOfflineJobs, getOfflineJobs } from "@/lib/utils/offline-storage"
import { usePathname } from "next/navigation"
import { CloudOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

export function SyncManager() {
    const pathname = usePathname()
    const [pendingCount, setPendingCount] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const updateCount = useCallback(() => {
        setPendingCount(getOfflineJobs().length)
    }, [])

    const handleSync = useCallback(async () => {
        if (getOfflineJobs().length === 0) return
        if (isSyncing || !navigator.onLine) return

        setIsSyncing(true)
        try {
            await syncOfflineJobs()
            updateCount()
            if (getOfflineJobs().length === 0) {
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 3000)
            }
        } finally {
            setIsSyncing(false)
        }
    }, [isSyncing, updateCount])

    useEffect(() => {
        updateCount()
        
        const handleQueueChange = () => updateCount()
        window.addEventListener('tms_offline_queue_change', handleQueueChange)
        
        // Initial sync check
        handleSync()

        // Sync when coming back online
        const handleOnline = () => {
            console.log("Connection restored. Syncing...")
            handleSync()
        }

        window.addEventListener('online', handleOnline)
        return () => {
            window.removeEventListener('tms_offline_queue_change', handleQueueChange)
            window.removeEventListener('online', handleOnline)
        }
    }, [handleSync, updateCount])

    useEffect(() => {
        handleSync()
    }, [pathname, handleSync])

    if (pendingCount === 0 && !showSuccess) return null

    return (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm">
            <div className={`p-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center justify-between gap-4 transition-all duration-500 ${
                showSuccess ? 'bg-emerald-500/90 border-emerald-400/50 text-white' : 'bg-slate-900/90 border-slate-700 text-white'
            }`}>
                <div className="flex items-center gap-3">
                    {showSuccess ? (
                        <CheckCircle2 className="text-white animate-in zoom-in" size={20} />
                    ) : isSyncing ? (
                        <RefreshCw className="text-blue-400 animate-spin" size={20} />
                    ) : (
                        <CloudOff className="text-amber-500" size={20} />
                    )}
                    
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                            {showSuccess ? 'Synced' : 'Offline Sync'}
                        </span>
                        <span className="text-sm font-medium">
                            {showSuccess ? 'ข้อมูลถูกส่งแล้ว' : 
                             isSyncing ? `กำลังส่งข้อมูล (${pendingCount})...` : 
                             `ค้างส่ง ${pendingCount} รายการ`}
                        </span>
                    </div>
                </div>

                {!showSuccess && !isSyncing && navigator.onLine && (
                    <button 
                        onClick={handleSync}
                        className="bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                        ส่งตอนนี้
                    </button>
                )}

                {!showSuccess && !navigator.onLine && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <AlertCircle size={10} />
                        รอสัญญาณ
                    </div>
                )}
            </div>
        </div>
    )
}
