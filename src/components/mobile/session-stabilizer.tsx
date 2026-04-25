"use client"

import { useEffect, useRef } from "react"
import { recoverDriverSession } from "@/lib/actions/auth-actions"
import { useRouter } from "next/navigation"

const STORAGE_KEY = "logis_driver_session_v1"

interface Session {
  driverId: string;
  driverName: string;
  branchId?: string;
  role: string;
  permissions?: any;
}

export function SessionStabilizer({ session }: { session: Session | null }) {
  const router = useRouter()
  const isRecoveringRef = useRef(false)

  // 1. Sync session to localStorage
  useEffect(() => {
    if (session?.driverId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        driverId: session.driverId,
        timestamp: Date.now()
      }))
    }
  }, [session])

  // 2. Recovery Logic
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // If we are on a protected mobile route but session is null in props,
        // it means the server component didn't see the cookie.
        if (!session && !isRecoveringRef.current) {
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            try {
              const { driverId, timestamp } = JSON.parse(stored)
              
              // Only recover if stored within last 30 days
              const thirtyDays = 30 * 24 * 60 * 60 * 1000
              if (Date.now() - timestamp < thirtyDays) {
                console.log("[PWA] Attempting session recovery for:", driverId)
                isRecoveringRef.current = true
                
                const result = await recoverDriverSession(driverId)
                if (result.success) {
                  console.log("[PWA] Session recovered successfully")
                  // Use window.location.reload() for a more stable full-state recovery
                  window.location.reload()
                }
              }
            } catch (e) {
              console.error("[PWA] Recovery failed:", e)
            } finally {
               isRecoveringRef.current = false
            }
          }
        } else {
          // Normal case: We have a session, just refresh the data to ensure it's up to date
          // This solves the "must reopen app to see new data" issue.
          console.log("[PWA] App foregrounded, refreshing data...")
          router.refresh()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    // For Native APK (Capacitor), visibilitychange doesn't always fire reliably
    // We use the native appStateChange event to trigger the refresh
    import('@capacitor/core').then(({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
            import('@capacitor/app').then(({ App }) => {
                App.addListener('appStateChange', ({ isActive }) => {
                    if (isActive) {
                        console.log("[APK] App foregrounded, refreshing data...")
                        router.refresh()
                    }
                })
            }).catch(e => console.error("Capacitor App module load failed", e))
        }
    }).catch(e => console.error("Capacitor core module load failed", e))

    // Also check on mount
    handleVisibilityChange()

    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [session, router])

  return null
}
