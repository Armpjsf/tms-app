import { cookies } from "next/headers"

/**
 * Get current driver session from cookies
 * This is a helper function, not a server action, to avoid circular dependencies.
 */
export async function getDriverSession() {
  try {
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
