"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, BellOff, X } from "lucide-react"
import { toast } from "sonner"

type Props = {
  userId: string | null
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function AdminPushRequester({ userId }: Props) {
  const [shown, setShown] = useState(false)
  const [registered, setRegistered] = useState(false)

  const registerAdminPush = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return false

      // Reuse existing subscription or create new one
      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, subscription: sub.toJSON() })
      })

      return res.ok
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return

    // Already granted → register silently without showing prompt
    if (Notification.permission === 'granted') {
      registerAdminPush(userId).then(ok => {
        if (ok) setRegistered(true)
      })
      return
    }

    // Show prompt after 3s
    if (Notification.permission === 'default') {
      const timer = setTimeout(() => setShown(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [userId, registerAdminPush])

  const handleAllow = async () => {
    if (!userId) return
    setShown(false)

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      toast.error('ไม่ได้รับสิทธิ์แจ้งเตือน กรุณาเปิดจากการตั้งค่าเบราว์เซอร์')
      return
    }

    // Ensure SW is registered
    await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})

    const ok = await registerAdminPush(userId)
    if (ok) {
      setRegistered(true)
      toast.success('✅ เปิดรับการแจ้งเตือนเรียบร้อยแล้ว')
    } else {
      toast.error('ไม่สามารถลงทะเบียนแจ้งเตือนได้ กรุณาลองใหม่')
    }
  }

  if (!shown) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm animate-in slide-in-from-bottom-5 duration-400">
      <div className="bg-background border border-border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
        {/* Accent top bar */}
        <div className="h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400">
              <Bell size={22} className="animate-bounce" />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-black text-foreground text-sm">เปิดรับการแจ้งเตือน</p>
                <button
                  onClick={() => setShown(false)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                รับแจ้งเตือนทันที เมื่อคนขับส่งแชท กด SOS หรืออัปเดตสถานะงาน
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShown(false)}
                  className="flex-1 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/50 transition-all"
                >
                  ภายหลัง
                </button>
                <button
                  onClick={handleAllow}
                  className="flex-1 px-3 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition-all active:scale-95"
                >
                  เปิดเลย
                </button>
              </div>
            </div>
          </div>
          {registered && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-500 font-bold">
              <Bell size={12} />
              ลงทะเบียนแจ้งเตือนเรียบร้อย
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminPushStatus() {
  const [status, setStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported' | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setStatus('unsupported')
    } else {
      setStatus(Notification.permission as 'granted' | 'denied' | 'default')
    }
  }, [])

  if (!status || status === 'granted') return null
  if (status === 'denied') return (
    <span className="flex items-center gap-1 text-xs text-red-400 font-bold">
      <BellOff size={12} /> แจ้งเตือนถูกปิด
    </span>
  )
  return null
}
