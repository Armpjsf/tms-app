"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

export function PermissionRequester() {
  const [showPrompt, setShowPrompt] = useState(false)

  const getDriverId = () => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      return match ? decodeURIComponent(match[2]) : null
    }
    const raw = getCookie('driver_session')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return parsed.driverId || parsed.Driver_ID || parsed.driver_id || raw
    } catch { return raw }
  }

  // Register FCM token with backend (silent, no prompt needed)
  const registerNativeFCM = async () => {
    const driverId = getDriverId()
    if (!driverId) return

    let tokenReceived = false
    await PushNotifications.addListener('registration', async (token) => {
      if (tokenReceived) return
      tokenReceived = true
      console.log('[Native Push] Token:', token.value)
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, subscription: { endpoint: token.value, isFCM: true } })
      })
    })
    await PushNotifications.addListener('registrationError', (err) =>
      console.error('[Native Push] Registration error:', JSON.stringify(err))
    )
    await PushNotifications.register()
  }

  useEffect(() => {
    // 1. Native Push
    if (Capacitor.isNativePlatform()) {
      PushNotifications.checkPermissions().then(async (status) => {
        if (status.receive === 'granted') {
          // Already granted → auto-register silently (most important fix)
          await registerNativeFCM()
        } else if (status.receive === 'prompt') {
          const timer = setTimeout(() => setShowPrompt(true), 2000)
          return () => clearTimeout(timer)
        }
      })
    }
    // 2. Web Push
    else {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
          .then(reg => console.log('Push SW Registered:', reg.scope))
          .catch(err => console.error('Push SW Failed:', err))
      }
      if ("Notification" in window && Notification.permission === "default") {
        const timer = setTimeout(() => setShowPrompt(true), 2000)
        return () => clearTimeout(timer)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subscribeToPush = async () => {
    try {
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
        return match ? decodeURIComponent(match[2]) : null
      }
      
      const driverSession = getCookie('driver_session')
      if (!driverSession) {
        console.error('[Push] No driver session found')
        setShowPrompt(false)
        return
      }

      let parsedDriverId = driverSession
      try {
        const parsed = JSON.parse(driverSession)
        parsedDriverId = parsed.driverId || parsed.Driver_ID || parsed.driver_id || driverSession
      } catch { /* use as-is */ }

      if (Capacitor.isNativePlatform()) {
        // --- NATIVE PUSH LOGIC (FCM via Capacitor) ---
        const permStatus = await PushNotifications.requestPermissions()
        if (permStatus.receive === 'granted') {
          // Register for native push
          let tokenReceived = false;
          
          await PushNotifications.addListener('registration', async (token) => {
             if (tokenReceived) return; // Prevent multiple calls
             tokenReceived = true;
             console.log('[Native Push] Registration token: ', token.value);
             
             // Send FCM token to server
             const res = await fetch('/api/push/subscribe', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 driverId: parsedDriverId,
                 subscription: {
                   endpoint: token.value,
                   isFCM: true
                 }
               })
             })
             
             if (res.ok) console.log('[Native Push] FCM Token saved to server!')
             else console.error('[Native Push] Failed to save FCM token')
             
             setShowPrompt(false)
          })

          await PushNotifications.addListener('registrationError', (error: any) => {
            console.error('[Native Push] Error on registration: ' + JSON.stringify(error));
            setShowPrompt(false)
          })

          await PushNotifications.register()
          return; // Exit here properly mapped to native sequence
        } else {
           setShowPrompt(false)
           return;
        }
      } else {
        // --- WEB PUSH LOGIC ---
        const result = await Notification.requestPermission()
        if (result !== "granted") {
          setShowPrompt(false)
          return
        }

        const reg = await navigator.serviceWorker.ready
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) {
          console.error('[Push] VAPID public key not configured')
          setShowPrompt(false)
          return
        }

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

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        })

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: parsedDriverId,
            subscription: subscription.toJSON()
          })
        })

        if (res.ok) console.log('[Web Push] Subscription saved to server!')
        else console.error('[Web Push] Failed to save subscription')

        setShowPrompt(false)
      }
    } catch (error) {
      console.error("[Push] Error:", error)
      setShowPrompt(false)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
      <Card className="bg-white border-blue-200 shadow-2xl shadow-blue-900/10 rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <CardContent className="p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 border border-blue-100">
                <Bell size={24} className="animate-bounce" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-gray-900 text-base">เปิดรับการแจ้งเตือนงาน</h3>
                    <button onClick={() => setShowPrompt(false)} className="text-gray-400 hover:text-gray-600 p-1">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed font-bold">
                    เพื่อให้คุณไม่พลาดงานใหม่ ระบบจะแจ้งเตือนทันทีที่มีงานเข้า
                </p>
                <div className="flex gap-3">
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="flex-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 font-bold"
                        onClick={() => setShowPrompt(false)}
                    >
                        ภายหลัง
                    </Button>
                    <Button 
                        size="sm" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-600/20"
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
