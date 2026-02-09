"use client"

import { useEffect, useRef, useState } from "react"
import { saveGPSLog } from "@/lib/supabase/gps"
import { createClient } from "@/utils/supabase/client"
import { Truck } from "lucide-react"

const UPDATE_INTERVAL = 30000 // Update every 30 seconds
const MIN_DISTANCE = 0.0001 // Approx 10-15 meters difference to trigger update

export function LocationTracker() {
  const [status, setStatus] = useState<"idle" | "tracking" | "error">("idle")
  const lastUpdateRef = useRef<number>(0)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  
  useEffect(() => {
    // Check if geolocation is supported
    if (!("geolocation" in navigator)) {
      setStatus("error")
      return
    }

    setStatus("tracking")

    const supabase = createClient()

    async function getDriverId() {
        const { data: { user } } = await supabase.auth.getUser()
        return user?.id
    }

    let watchId: number

    getDriverId().then((driverId) => {
        if (!driverId) return

        watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const now = Date.now()
                const { latitude, longitude, speed } = position.coords
                
                // Throttle updates: Only send if enough time passed OR significant distance moved
                const timeDiff = now - lastUpdateRef.current
                const isTime = timeDiff > UPDATE_INTERVAL
                
                const isDistance = lastPosRef.current 
                    ? Math.abs(latitude - lastPosRef.current.lat) + Math.abs(longitude - lastPosRef.current.lng) > MIN_DISTANCE
                    : true

                if (isTime || isDistance) {
                    // Update refs
                    lastUpdateRef.current = now
                    lastPosRef.current = { lat: latitude, lng: longitude }

                    // Send to Server
                    await saveGPSLog({
                        driverId: driverId,
                        lat: latitude,
                        lng: longitude,
                        speed: speed || 0,
                        // battery: we can't easily get battery in web without experimental API
                    })
                    
                    console.log("📍 GPS Updated:", latitude, longitude)
                }
            },
            (error) => {
                console.error("GPS Error:", error)
                setStatus("error")
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 10000
            }
        )
    })

    return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  if (status === "error") return null // Don't show anything on error

  // Optional: Show a small indicator that tracking is active (Debug mode or always)
  return (
    <div className="fixed top-2 right-2 z-50 pointer-events-none">
       {status === "tracking" && (
           <span className="flex h-2 w-2 relative">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
           </span>
       )}
    </div>
  )
}
