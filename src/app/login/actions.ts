'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import argon2 from 'argon2'
import { createSession, deleteSession } from '@/lib/session'
// import { cookies } from 'next/headers' // Used in createClient

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // 1. Query Master_Users
  const { data: users, error } = await supabase
    .from('Master_Users')
    .select('*, Master_Roles(Role_Name)')
    .eq('Username', data.email)
    .single()

  if (error || !users) {
    console.error("Login failed: User not found or DB error", error)
    // In a real app, return error state to form
    redirect('/login?error=Invalid credentials')
  }

  // ... (Password verification logic) ...
  let isValid = false
  try {
    if (users.Password.startsWith('$argon2')) {
       isValid = await argon2.verify(users.Password, data.password)
    } else {
       console.warn("Legacy password format detected")
       isValid = false 
    }
  } catch (e) {
    console.error("Argon2 verification failed", e)
    isValid = false
  }

  if (!isValid) {
    redirect('/login?error=Invalid credentials')
  }

  // 3. Create Session (Custom)
  const roleId = users.Role_ID || 3 // Default to Staff if null
  const branchId = users.Branch_ID || null
  const customerId = users.Customer_ID || null
  const permissions = users.Permissions || {}
  
  await createSession(
    users.Username, 
    roleId, 
    branchId, 
    users.Username, 
    customerId, 
    permissions
  )
  
  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
