'use server'

import { getSession } from "@/lib/session"
// next/headers is imported dynamically inside the action to avoid build issues

export async function getDriverSession() {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const driverCookie = cookieStore.get('driver_session')?.value
    if (driverCookie) {
      return JSON.parse(driverCookie)
    }
    return null
  } catch (error) {
    console.error("[AUTH] Failed to get driver session:", error)
    return null
  }
}

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
    const driverSession = await getDriverSession()
    if (driverSession && driverSession.driverId) {
      return {
        driverId: driverSession.driverId,
        isDriver: true,
        username: driverSession.driverName
      }
    }

    return null
  } catch (error) {
    console.error("[AUTH] Failed to get push identity:", error)
    return null
  }
}
