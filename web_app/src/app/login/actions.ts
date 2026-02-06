'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import argon2 from 'argon2'
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
    .select('*')
    .eq('Username', data.email)
    .single()

  if (error || !users) {
    console.error("Login failed: User not found or DB error", error)
    // In a real app, return error state to form
    redirect('/login?error=Invalid credentials')
  }

  // 2. Verify Password
  // app.py: ph = PasswordHasher(...)
  // We need to verify standard Argon2 hash
  
  let isValid = false
  try {
    if (users.Password.startsWith('$argon2')) {
       isValid = await argon2.verify(users.Password, data.password)
    } else {
       // Legacy fallback (SHA256) - NOT IMPLEMENTED for security in this demo
       // You should migrate users using the Python app or implement SHA256 here if needed
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
  // For this proof-of-concept, we'll assume a successful login
  // In reality, you'd mint a JWT or set a session cookie here.
  // We will simply redirect for now, but to persist logic we'd need a session lib.
  
  // Because we lack Supabase Auth user, we can't use supabase.auth.signInWithPassword
  
  redirect('/dashboard')
}
