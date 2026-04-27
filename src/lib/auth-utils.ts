import { cookies } from "next/headers"
import { cache } from "react"

/**
 * Get current driver session from cookies
 * Cached for the duration of the request to prevent redundant parsing.
 */
export const getDriverSession = cache(async () => {
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
})
