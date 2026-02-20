"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function loginDriver(formData: FormData) {
  const identifier = formData.get("identifier") as string
  const password = formData.get("password") as string

  if (!identifier || !password) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" }
  }

  const supabase = await createClient()

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
  // In production, we should use hashed passwords (Argon2/Bcrypt)
  // For now, we compare with the plain text password stored in DB (as per current implementation)
  if (password !== driver.Password) { 
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
    path: "/" 
  })

  return { success: true }
}

export async function logoutDriver() {
  const cookieStore = await cookies()
  cookieStore.delete("driver_session")
  redirect("/mobile/login")
}

export async function getDriverSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get("driver_session")
  return session ? JSON.parse(session.value) : null
}
