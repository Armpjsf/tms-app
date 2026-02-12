"use client"

import { useState, useEffect } from "react"
import { Bell, MapPin, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function PermissionRequester() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permissionType, setPermissionType] = useState<"notifications" | "geolocation" | null>(null)

  useEffect(() => {
    // Check Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      setPermissionType("notifications")
      setShowPrompt(true)
    } 
    // Check Geolocation Permission (Optional, usually handled by browser on usage)
    else if ("geolocation" in navigator) {
        navigator.permissions.query({ name: "geolocation" }).then((result) => {
            if (result.state === "prompt") {
                // We don't force prompt for geo immediately, let LocationTracker handle it,
                // but we could if we wanted to be aggressive.
                // For now, focus on Notifications as requested.
            }
        })
    }
  }, [])

  const requestPermission = async () => {
    if (permissionType === "notifications") {
      try {
        const result = await Notification.requestPermission()
        if (result === "granted") {
          console.log("Notification permission granted.")
          // Here you would normally subscribe the user to push service
        }
        setShowPrompt(false)
      } catch (error) {
        console.error("Error requesting notification permission:", error)
      }
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <Card className="bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/20">
        <CardContent className="p-4 flex items-start gap-4 relaltive">
            <button 
                onClick={() => setShowPrompt(false)}
                className="absolute top-2 right-2 text-slate-500 hover:text-white"
            >
                {/* <X size={16} /> */}
            </button>
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400">
                <Bell size={20} />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">เปิดการแจ้งเตือน</h3>
                <p className="text-xs text-slate-400 mb-3">
                    เพื่อไม่ให้พลาดงานใหม่และการอัปเดตสถานะงาน
                </p>
                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700"
                        onClick={() => setShowPrompt(false)}
                    >
                        ไว้ทีหลัง
                    </Button>
                    <Button 
                        size="sm" 
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={requestPermission}
                    >
                        อนุญาต
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
