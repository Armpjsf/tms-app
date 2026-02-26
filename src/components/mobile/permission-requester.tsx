"use client"

import { useState, useEffect } from "react"
import { Bell, MapPin, X, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function PermissionRequester() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permissionType, setPermissionType] = useState<"notifications" | "geolocation" | null>(null)

  useEffect(() => {
    // 1. Register sw-push.js explicitly if available
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
            .then(reg => console.log('Push Service Worker Registered:', reg.scope))
            .catch(err => console.error('Push SW Registration Failed:', err));
    }

    // 2. Check Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      setPermissionType("notifications")
      // Show prompt after a short delay to be less intrusive
      const timer = setTimeout(() => setShowPrompt(true), 2000)
      return () => clearTimeout(timer)
    } 
  }, [])

  const requestPermission = async () => {
    if (permissionType === "notifications") {
      try {
        const result = await Notification.requestPermission()
        if (result === "granted") {
          console.log("Notification permission granted.")
          
          // Setup subscription
          if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              // In a real app, you would retrieve VAPID key from env and subscribe
              console.log("Ready to subscribe to push service with reg:", reg);
          }
        }
        setShowPrompt(false)
      } catch (error) {
        console.error("Error requesting notification permission:", error)
      }
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
      <Card className="bg-slate-900/95 backdrop-blur-md border-blue-500/50 shadow-2xl shadow-blue-500/20 rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <CardContent className="p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 border border-blue-500/20">
                <Bell size={24} className="animate-bounce" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-white text-base">เปิดการแจ้งเตือนงานใหม่</h3>
                    <button onClick={() => setShowPrompt(false)} className="text-slate-500 hover:text-white p-1">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    ระบบจะส่งเสียงและสั่นเตือนเมื่อแอดมินส่งงานใหม่ให้คุณโดยเฉพาะ เพื่อให้คุณไม่พลาดทุกโอกาสสร้างรายได้
                </p>
                <div className="flex gap-3">
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800 font-medium"
                        onClick={() => setShowPrompt(false)}
                    >
                        ยังไม่เปิด
                    </Button>
                    <Button 
                        size="sm" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20"
                        onClick={requestPermission}
                    >
                        ตกลง เปิดเลย
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
