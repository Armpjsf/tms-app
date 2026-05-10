"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

type Props = { driverId: string | null }

export function PermissionRequester({ driverId }: Props) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [showDeniedPrompt, setShowDeniedPrompt] = useState(false)

  const registerNativeFCM = useCallback(async () => {
    if (!driverId) return

    let tokenReceived = false
    
    // Foreground handling: Show toast when app is open
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log("[APK] Push Received in Foreground:", notification);
      toast.success(notification.title || "แจ้งเตือนใหม่", {
        description: notification.body,
        duration: 8000,
      });
      // Play local sound as fallback
      try { 
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {
        console.error("Sound play failed", e);
      }
    });

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
      // Create channel for Android 8.0+
      try {
          PushNotifications.createChannel({
              id: 'tms-notifications',
              name: 'TMS Notifications',
              description: 'General system notifications',
              importance: 5, // Importance.HIGH
              visibility: 1, // Visibility.PUBLIC
              sound: 'default',
              vibration: true,
          }).catch(() => {})
      } catch {
          // ignore
      }

      PushNotifications.checkPermissions().then(async (status) => {
        if (status.receive === 'granted') {
          // Already granted → silently register FCM token immediately
          await registerNativeFCM()
        } else if (status.receive === 'prompt') {
          setTimeout(() => setShowPrompt(true), 2000)
        } else if (status.receive === 'denied') {
          const hasReminded = localStorage.getItem('tms_reminded_denied_push')
          if (!hasReminded) {
             setTimeout(() => setShowDeniedPrompt(true), 2000)
          }
        }
      })
    }
    // 2. Web Push
    else {
      if ('serviceWorker' in navigator) {
        if (process.env.NODE_ENV === 'development') {
          // In development, we don't use PWA/SW, so unregister any leftover workers
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister()
            }
          })
        } else {
          // Register the MAIN sw.js which now contains our push logic
          navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then((reg) => {
                // Check if we need to update
                reg.update();
            })
            .catch((err) => console.error("SW Register Error:", err))
        }
      }
      
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          setTimeout(() => setShowPrompt(true), 2000)
        } else if (Notification.permission === "denied") {
          const hasReminded = localStorage.getItem('tms_reminded_denied_push')
          if (!hasReminded) {
             setTimeout(() => setShowDeniedPrompt(true), 2000)
          }
        }
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

        if (res.ok) { 
            toast.success("ลงทะเบียนรับแจ้งเตือนเรียบร้อยแล้ว")
        } else { 
            const errData = await res.json().catch(() => ({}));
            toast.error(`ลงทะเบียนไม่สำเร็จ: ${errData.error || 'Unknown error'}`)
        }

        setShowPrompt(false)
      }
    } catch (err: any) {
      console.error("Push subscription error:", err)
      toast.error(`ข้อผิดพลาด: ${err.message || 'ไม่สามารถเปิดแจ้งเตือนได้'}`)
      setShowPrompt(false)
    }
  }

  if (showDeniedPrompt) {
    return (
      <div className="fixed inset-x-4 bottom-32 z-[200] animate-in slide-in-from-bottom-20 duration-700 ease-out">
        <div className="glass-panel rounded-[2.5rem] p-8 space-y-8 shadow-2xl shadow-rose-500/20 border-rose-500/20 bg-gradient-to-br from-card to-rose-500/5">
          <div className="absolute top-0 right-0 p-8 text-rose-500/10 pointer-events-none">
              <Bell size={120} strokeWidth={1} className="rotate-12" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/30">
                  <X size={40} className="text-white" strokeWidth={2.5} />
              </div>
              
              <div className="space-y-2">
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic">การแจ้งเตือนถูกปิดกั้น</h3>
                  <p className="text-muted-foreground text-base font-bold leading-relaxed max-w-[240px]">
                      คุณได้ปฏิเสธการรับแจ้งเตือนไปก่อนหน้านี้ กรุณาไปที่ <span className="text-rose-500">การตั้งค่าของเครื่อง</span> เพื่อเปิดรับแจ้งเตือนงานใหม่
                  </p>
              </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-4">
              <Button 
                  className="h-16 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-[0.1em] shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
                  onClick={() => {
                      localStorage.setItem('tms_reminded_denied_push', 'true')
                      setShowDeniedPrompt(false)
                  }}
              >
                  รับทราบ
              </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!showPrompt) return null

  return (
    <div className="fixed inset-x-4 bottom-32 z-[200] animate-in slide-in-from-bottom-20 duration-700 ease-out">
      <div className="glass-panel rounded-[2.5rem] p-8 space-y-8 shadow-2xl shadow-primary/20 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <div className="absolute top-0 right-0 p-8 text-primary/10 pointer-events-none">
            <Bell size={120} strokeWidth={1} className="rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 relative">
                <Bell size={40} className="text-white animate-pulse" strokeWidth={2.5} />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full border-4 border-background flex items-center justify-center">
                    <span className="text-[10px] font-black text-white">!</span>
                </div>
            </div>
            
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic">แจ้งเตือนงานใหม่</h3>
                <p className="text-muted-foreground text-base font-bold leading-relaxed max-w-[240px]">
                    เปิดแจ้งเตือนเพื่อให้คุณรับรู้งานใหม่ และสถานะงานได้ทันทีผ่านมือถือ
                </p>
            </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
            <Button 
                variant="ghost" 
                className="h-16 rounded-2xl text-muted-foreground font-black uppercase tracking-widest hover:bg-muted/50 transition-all"
                onClick={() => setShowPrompt(false)}
            >
                ไว้ก่อน
            </Button>
            <Button 
                className="h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.15em] shadow-xl shadow-primary/20 active:scale-95 transition-all"
                onClick={subscribeToPush}
            >
                เปิดเลย
            </Button>
        </div>
      </div>
    </div>
  )
}


