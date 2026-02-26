"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function PermissionRequester() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // 1. Register sw-push.js explicitly if available
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
            .then(reg => console.log('Push Service Worker Registered:', reg.scope))
            .catch(err => console.error('Push SW Registration Failed:', err));
    }

    // 2. Check Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      // Show prompt after a short delay to be less intrusive
      const timer = setTimeout(() => setShowPrompt(true), 2000)
      return () => clearTimeout(timer)
    } 
  }, [])

  const subscribeToPush = async () => {
    try {
      const result = await Notification.requestPermission()
      if (result !== "granted") {
        setShowPrompt(false)
        return
      }

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready

      // Get VAPID public key from env
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[Push] VAPID public key not configured')
        setShowPrompt(false)
        return
      }

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
      }

      // Subscribe to push service
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      console.log('[Push] Subscription obtained:', subscription.endpoint)

      // Get driver ID from cookie/session
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
        return match ? decodeURIComponent(match[2]) : null
      }
      
      const driverId = getCookie('driverSession')
      if (!driverId) {
        console.error('[Push] No driver session found')
        setShowPrompt(false)
        return
      }

      // Parse driver session to get Driver_ID
      let parsedDriverId = driverId
      try {
        const parsed = JSON.parse(driverId)
        parsedDriverId = parsed.Driver_ID || parsed.driver_id || driverId
      } catch { /* use as-is */ }

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: parsedDriverId,
          subscription: subscription.toJSON()
        })
      })

      if (res.ok) {
        console.log('[Push] Subscription saved to server!')
      } else {
        console.error('[Push] Failed to save subscription')
      }

      setShowPrompt(false)
    } catch (error) {
      console.error("[Push] Error:", error)
      setShowPrompt(false)
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
                        onClick={subscribeToPush}
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
