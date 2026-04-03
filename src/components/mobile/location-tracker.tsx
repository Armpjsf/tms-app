"use client"

import { useEffect, useRef, useState } from "react"
import { saveGPSLog } from "@/lib/supabase/gps"
import { updateDriverLocation } from "@/lib/actions/location-actions"

const UPDATE_INTERVAL = 60000 // Update every 1 minute
const MIN_DISTANCE = 0.0002 // Approx 20-30 meters

export function LocationTracker({ driverId }: { driverId?: string, branchId?: string }) {
  const [status, setStatus] = useState<"idle" | "tracking" | "error">("idle")
  
  const lastUpdateRef = useRef<number>(0)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const wakeLockRef = useRef<any>(null) // Using any here because WakeLockSentinel might not be in all lib types
  
  useEffect(() => {
    // 1. Setup WatchPosition
    const watchId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude, speed } = position.coords
            processLocationUpdate(latitude, longitude, speed || 0)
        },
        (err) => {
            console.warn('[PWA] Geolocation watch error:', err.code, err.message)
            setStatus("error")
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 5000
        }
    )

    // 2. Setup Visibility Catch-up
    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            console.log("[PWA] Resumed: Catching up GPS...")
            navigator.geolocation.getCurrentPosition(
                (pos) => processLocationUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0),
                null,
                { enableHighAccuracy: true }
            )
            // Re-acquire wake lock if needed
            requestWakeLock()
        }
    }

    // 3. Screen Wake Lock
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
                console.log("[PWA] Screen Wake Lock acquired")
            } catch (err) {
                console.warn("[PWA] Wake Lock failed:", err)
            }
        }
    }

    const processLocationUpdate = async (lat: number, lng: number, speed: number) => {
        const now = Date.now()
        const timeDiff = now - lastUpdateRef.current
        const isTime = timeDiff > UPDATE_INTERVAL
        const isDistance = lastPosRef.current 
            ? Math.abs(lat - lastPosRef.current.lat) + Math.abs(lng - lastPosRef.current.lng) > MIN_DISTANCE
            : true

        if (isTime || isDistance) {
            lastUpdateRef.current = now
            lastPosRef.current = { lat, lng }

            try {
                await saveGPSLog({
                    driverId: driverId!,
                    lat: lat,
                    lng: lng,
                    speed: speed,
                })

                const res = await updateDriverLocation(driverId!, lat, lng)
                if (res.success) setStatus("tracking")
                else setStatus("error")
            } catch {
                setStatus("error")
            }
        }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    requestWakeLock()

    return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
        if (wakeLockRef.current) {
            wakeLockRef.current.release()
            wakeLockRef.current = null
        }
    }
  }, [driverId])

  if (!driverId) return null

  return (
    <div className="fixed top-2 right-2 z-50 pointer-events-none flex flex-col items-end gap-1">
       {status === "tracking" && (
           <span className="flex h-2 w-2 relative">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
           </span>
       )}

       {status === "error" && (
           <span className="h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
       )}
    </div>
  )
}
