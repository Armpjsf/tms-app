'use server'

import { getSession } from "@/lib/session"
import { cookies } from "next/headers"

export async function getPushIdentityAction() {
  try {
    const session = await getSession()
    if (session && session.userId) {
      // Standardize on Username (session.userId) to match Master_Users
      return {
        userId: session.userId,
        roleId: session.roleId,
        isDriver: false,
        username: session.username
      }
    }

    // 2. Check Driver Session (Stored as plain JSON in 'driver_session' cookie)
    const cookieStore = await cookies()
    const driverCookie = cookieStore.get('driver_session')?.value
    if (driverCookie) {
      try {
        const driverSession = JSON.parse(driverCookie)
        if (driverSession.driverId) {
          return {
            driverId: driverSession.driverId,
            isDriver: true,
            username: driverSession.driverName
          }
        }
      } catch {
        // Fallback or ignore malformed driver cookie
      }
    }

    return null
  } catch (error) {
    console.error("[AUTH] Failed to get push identity:", error)
    return null
  }
}
