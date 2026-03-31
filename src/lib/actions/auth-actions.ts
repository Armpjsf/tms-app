"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import argon2 from "argon2"

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

  // 3. Fetch permissions from Master_Users (try by identifier or driver's Mobile_No)
  let userData = null
  const { data: userData1 } = await supabase
    .from("Master_Users")
    .select("Permissions")
    .eq("Username", identifier)
    .single()
  userData = userData1

  if (!userData && driver.Mobile_No) {
    const { data: userData2 } = await supabase
      .from("Master_Users")
      .select("Permissions")
      .eq("Username", driver.Mobile_No)
      .single()
    userData = userData2
  }

  // 4. Create Session (Cookie)
  const sessionData = {
    driverId: driver.Driver_ID,
    driverName: driver.Driver_Name,
    branchId: driver.Branch_ID,
    role: "driver",
    permissions: userData?.Permissions || { show_income: true } // Default to true if not found for backward compatibility
  }
  
  const cookieStore = await cookies()
  // 7 days expiry
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  cookieStore.set("driver_session", JSON.stringify(sessionData), { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    expires,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    sameSite: "lax",
    path: "/",
    priority: "high"
  })

  return { success: true }
}

export async function logoutDriver() {
  const cookieStore = await cookies()
  
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

export async function getDriverSession() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("driver_session")
    return session ? JSON.parse(session.value) : null
  } catch (error) {
    console.error("Session Parse Error:", error)
    return null
  }
}

export async function loginWithQRToken(token: string) {
  if (!token) return { error: "ไม่พบรหัส Token" }

  const supabase = createAdminClient()

  // In a production app, the token should be verified against a DB table or a signed JWT
  // For this implementation, we'll try to parse it and find the driver
  try {
      let driverId = ""
      
      // If it's a JSON string like {"driverId": "..."}
      if (token.startsWith('{')) {
          const data = JSON.parse(token)
          driverId = data.driverId || data.Driver_ID
      } else {
          // If it's just the DriverID
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

      const cookieStore = await cookies()
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      cookieStore.set("driver_session", JSON.stringify(sessionData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          expires,
          maxAge: 7 * 24 * 60 * 60,
          sameSite: "lax",
          path: "/",
      })

      return { success: true }
  } catch (error) {
      console.error("QR Login Error:", error)
      return { error: "รหัส QR ไม่ถูกต้อง" }
  }
}
