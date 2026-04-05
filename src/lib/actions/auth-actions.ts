'use server'

import { createAdminClient } from "@/utils/supabase/server"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import argon2 from "argon2"

/**
 * Helper to get cookies dynamically to avoid build issues in some environments.
 */
async function getCookieStore() {
  const { cookies } = await import("next/headers")
  return await cookies()
}

/**
 * RESTORED: Get current driver session from cookies
 */
export async function getDriverSession() {
  try {
    const cookieStore = await getCookieStore()
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

/**
 * RESTORED: Driver login with Identifier (Phone/ID) and Password
 */
export async function loginDriver(formData: FormData) {
  const identifier = formData.get("identifier") as string
  const password = formData.get("password") as string

  if (!identifier || !password) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" }
  }

  const supabase = createAdminClient()

  // Try to find driver by Mobile_No first, then by Driver_ID
  let driver = null

  // Check if input looks like a phone number (starts with 0 and has 9-10 digits)
  const isPhone = /^0\d{8,9}$/.test(identifier.replace(/[-\s]/g, ''))

  if (isPhone) {
    // Clean phone number (remove dashes/spaces)
    const cleanPhone = identifier.replace(/[-\s]/g, '')
    const { data } = await supabase
      .from("Master_Drivers")
      .select("*")
      .eq("Mobile_No", cleanPhone)
      .single()
    driver = data
  }

  // If not found by phone (or input is not a phone), try Driver_ID
  if (!driver) {
    const { data } = await supabase
      .from("Master_Drivers")
      .select("*")
      .eq("Driver_ID", identifier)
      .single()
    driver = data
  }

  // Still not found? Try Mobile_No as-is (in case format differs)
  if (!driver) {
    const { data } = await supabase
      .from("Master_Drivers")
      .select("*")
      .eq("Mobile_No", identifier)
      .single()
    driver = data
  }

  if (!driver) {
    return { error: "ไม่พบข้อมูลในระบบ กรุณาตรวจสอบเบอร์โทรหรือ Username" }
  }

  // 2. Password Check
  let isValid = false
  const dbPassword = driver.Password || ""

  try {
    if (dbPassword.startsWith("$argon2")) {
      // Hashed password
      isValid = await argon2.verify(dbPassword, password)
    } else {
      // Plain-text password fallback
      isValid = password === dbPassword

      // If plain-text is correct, migrate to Argon2 automatically
      if (isValid) {
        const hashedPassword = await argon2.hash(password)
        await supabase
          .from("Master_Drivers")
          .update({ Password: hashedPassword })
          .eq("Driver_ID", driver.Driver_ID)
      }
    }
  } catch (error) {
    console.error("Driver Auth Error:", error)
    isValid = false
  }

  if (!isValid) {
      return { error: "รหัสผ่านไม่ถูกต้อง" }
  }

  // 3. Fetch permissions from Master_Users
  let userData = null
  const { data: userData1 } = await supabase
    .from("Master_Users")
    .select("*")
    .eq("Username", identifier)
    .single()
  userData = userData1

  if (!userData && driver.Mobile_No) {
    const { data: userData2 } = await supabase
      .from("Master_Users")
      .select("*")
      .eq("Username", driver.Mobile_No)
      .single()
    userData = userData2
  }

  // 4. Create Session (Cookie)
  const userPermissions = (userData as Record<string, any>)?.Permissions || (userData as Record<string, any>)?.permissions || { show_income: true }

  const sessionData = {
    driverId: driver.Driver_ID,
    driverName: driver.Driver_Name,
    branchId: driver.Branch_ID,
    role: "driver",
    permissions: userPermissions
  }

  const cookieStore = await getCookieStore()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Extend to 30 days for better experience

  cookieStore.set("driver_session", JSON.stringify(sessionData), {
    httpOnly: true,
    secure: true,
    expires,
    maxAge: 30 * 24 * 60 * 60,
    sameSite: "lax",
    path: "/",
    priority: "high"
  })

  return { success: true }
}

/**
 * RESTORED/IMPLEMENTED: Driver Logout
 */
export async function logoutDriver() {
  const cookieStore = await getCookieStore()

  // Clear cookie with specific options to ensure it is deleted
  cookieStore.set("driver_session", "", {
    maxAge: 0,
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax"
  })

  cookieStore.delete("driver_session")
  redirect("/mobile/login")
}

/**
 * RESTORED: Login with QR Token
 */
export async function loginWithQRToken(token: string) {
  if (!token) return { error: "ไม่พบรหัส Token" }

  const supabase = createAdminClient()

  try {
      let driverId = ""

      if (token.startsWith('{')) {
          const data = JSON.parse(token)
          driverId = data.driverId || data.Driver_ID
      } else {
          driverId = token
      }

      const { data: driver } = await supabase
          .from("Master_Drivers")
          .select("*")
          .eq("Driver_ID", driverId)
          .single()

      if (!driver) return { error: "รหัส Token ไม่ถูกต้องหรือไม่พบผู้ใช้งาน" }

      const sessionData = {
          driverId: driver.Driver_ID,
          driverName: driver.Driver_Name,
          branchId: driver.Branch_ID,
          role: "driver",
      }

      const cookieStore = await getCookieStore()
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      cookieStore.set("driver_session", JSON.stringify(sessionData), {
          httpOnly: true,
          secure: true,
          expires,
          maxAge: 30 * 24 * 60 * 60,
          sameSite: "lax",
          path: "/",
          priority: "high"
      })

      return { success: true }
  } catch (error) {
      console.error("QR Login Error:", error)
      return { error: "รหัส QR ไม่ถูกต้อง" }
  }
}

/**
 * RESTORED: Recover Driver Session
 */
export async function recoverDriverSession(driverId: string) {
    if (!driverId) return { success: false }

    const supabase = createAdminClient()
    const { data: driver, error } = await supabase
        .from("Master_Drivers")
        .select("*")
        .eq("Driver_ID", driverId)
        .single()

    if (error || !driver) return { success: false }

    const sessionData = {
        driverId: driver.Driver_ID,
        driverName: driver.Driver_Name,
        branchId: driver.Branch_ID,
        role: "driver",
    }

    const cookieStore = await getCookieStore()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    cookieStore.set("driver_session", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: true,
        expires,
        maxAge: 30 * 24 * 60 * 60,
        sameSite: "lax",
        path: "/",
        priority: "high"
    })

    return { success: true }
}

/**
 * PRESERVED: Identity matching for Push Notifications
 */
export async function getPushIdentityAction() {
  try {
    const session = await getSession()
    if (session && session.userId) {
      return {
        userId: session.userId,
        roleId: session.roleId,
        isDriver: false,
        username: session.username
      }
    }

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
