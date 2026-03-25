"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

type Props = { driverId: string | null }

export function PermissionRequester({ driverId }: Props) {
  const [showPrompt, setShowPrompt] = useState(false)

  // Register FCM token with backend silently
  const registerNativeFCM = useCallback(async () => {
    if (!driverId) return

    let tokenReceived = false
    await PushNotifications.addListener('registration', async (token) => {
      if (tokenReceived) return
      tokenReceived = true
      
      const baseUrl = '' // Use relative path for all environments
      const apiUrl = `${baseUrl}/api/push/subscribe`
      
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId, subscription: { endpoint: token.value, isFCM: true } })
        })
        if (!res.ok) {
            // Error handling ignored for silent registration
        }
      } catch {
        // Error handling ignored for silent registration
      }
    })
    
    await PushNotifications.addListener('registrationError', () => {
      // Error handling ignored for silent registration
    })
    
    try {
        await PushNotifications.register()
    } catch {
        // Error handling ignored for silent registration
    }
  }, [driverId])

  useEffect(() => {
    if (!driverId) return  // Not logged in yet — skip all registration

    // 1. Native Push (FCM)
    if (Capacitor.isNativePlatform()) {
      PushNotifications.checkPermissions().then(async (status) => {
        if (status.receive === 'granted') {
          // Already granted → silently register FCM token immediately
          await registerNativeFCM()
        } else if (status.receive === 'prompt') {
          setTimeout(() => setShowPrompt(true), 2000)
        }
      })
    }
    // 2. Web Push
    else {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
          .then(() => { /* SW Registered */ })
          .catch(() => {})
      }
      if ("Notification" in window && Notification.permission === "default") {
        setTimeout(() => setShowPrompt(true), 2000)
      }
    }
  }, [driverId, registerNativeFCM])

  const subscribeToPush = async () => {
    try {
      if (!driverId) { setShowPrompt(false); return }

      if (Capacitor.isNativePlatform()) {
        // --- NATIVE PUSH LOGIC (FCM via Capacitor) ---
        const permStatus = await PushNotifications.requestPermissions()
        if (permStatus.receive === 'granted') {
          // Register for native push
          let tokenReceived = false;
          
          await PushNotifications.addListener('registration', async (token) => {
             if (tokenReceived) return; // Prevent multiple calls
             tokenReceived = true;
             
             const baseUrl = '' // Use relative path for all environments
             const apiUrl = `${baseUrl}/api/push/subscribe`
             
             try {
               const res = await fetch(apiUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   driverId: driverId,
                   subscription: {
                     endpoint: token.value,
                     isFCM: true
                   }
                 })
               })
               
               if (!res.ok) {
                   // Error handling ignored
               }
             } catch {
               // Error handling ignored
             }
             
             setShowPrompt(false)
          })

          await PushNotifications.addListener('registrationError', () => {
            setShowPrompt(false)
          })

          try {
              await PushNotifications.register()
          } catch {
              // Error handling ignored
          }
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
            driverId: driverId,
            subscription: subscription.toJSON()
          })
        })

        if (res.ok) { /* Success */ }
        else { /* Failed */ }

        setShowPrompt(false)
      }
    } catch {
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
                <p className="text-xl text-gray-600 mb-4 leading-relaxed font-bold">
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

