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
  
  useEffect(() => {
    if (!driverId) return

    if (!("geolocation" in navigator)) {
      setTimeout(() => setStatus("error"), 0)
      return
    }

    if (status === "idle") {
        setTimeout(() => setStatus("tracking"), 0)
    }

    const watchId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude, speed } = position.coords
            
            const now = Date.now()
            const timeDiff = now - lastUpdateRef.current
            const isTime = timeDiff > UPDATE_INTERVAL
            const isDistance = lastPosRef.current 
                ? Math.abs(latitude - lastPosRef.current.lat) + Math.abs(longitude - lastPosRef.current.lng) > MIN_DISTANCE
                : true

            if (isTime || isDistance) {
                lastUpdateRef.current = now
                lastPosRef.current = { lat: latitude, lng: longitude }

                try {
                    // Send both to log and master update
                    await saveGPSLog({
                        driverId: driverId,
                        lat: latitude,
                        lng: longitude,
                        speed: speed || 0,
                    })

                    const res = await updateDriverLocation(driverId, latitude, longitude)
                    if (res.success) {
                        setStatus("tracking")
                    } else {
                        setStatus("error")
                        console.error('[DEBUG] updateDriverLocation fail')
                    }
                } catch (e) {
                    setStatus("error")
                    console.error('[DEBUG] updateDriverLocation exception:', e)
                }
            }
        },
        (err) => {
            console.error('[DEBUG] Geolocation error:', err)
            setStatus("error")
        },
        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 10000
        }
    )

    return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId)
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
