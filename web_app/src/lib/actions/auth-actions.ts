"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function loginDriver(formData: FormData) {
  const phone = formData.get("phone") as string
  const password = formData.get("password") as string

  if (!phone || !password) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" }
  }

  const supabase = await createClient()

  // 1. Check if driver exists in Master_Drivers (using Mobile_No as identifier for now)
  // In a real app, you might use Supabase Auth users, but if simple table auth:
  const { data: driver, error } = await supabase
    .from("Master_Drivers")
    .select("*")
    .eq("Mobile_No", phone)
    .single()

  if (error || !driver) {
    return { error: "ไม่พบเบอร์โทรศัพท์นี้ในระบบ" }
  }

  // 2. Simple password check (In production, use hashed passwords or Supabase Auth)
  // For this prototype, we'll assume a default password or check a column if it existed
  // Let's assume default password for all drivers is '123456' for MVP demo unless strictly required otherwise
  if (password !== "123456") { 
      return { error: "รหัสผ่านไม่ถูกต้อง" }
  }

  // 3. Create Session (Cookie)
  const sessionData = {
    driverId: driver.Driver_ID,
    driverName: driver.Driver_Name,
    role: "driver"
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
  redirect("/login")
}

export async function getDriverSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get("driver_session")
  return session ? JSON.parse(session.value) : null
}
