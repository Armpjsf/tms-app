'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import argon2 from 'argon2'
import { createSession, deleteSession, getSession } from '@/lib/session'
import { logActivity } from '@/lib/supabase/logs'
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
  // Map string Role to numeric Role_ID if Role_ID is missing
  let roleId = users.Role_ID
  if (roleId === undefined && users.Role) {
    const roleMap: Record<string, number> = {
      'Super Admin': 1,
      'Admin': 2,
      'Staff': 3,
      'Driver': 4,
      'Customer': 5
    }
    roleId = roleMap[users.Role] || 3
  } else if (roleId === undefined) {
    roleId = 3
  }

  // 2. Fetch Role Permissions
  let rolePermissions = {}
  if (users.Role) {
      try {
        const { data: rolePerms } = await supabase
            .from('Master_Role_Permissions')
            .select('Permissions')
            .eq('Role', users.Role)
            .single()
        
        if (rolePerms) {
            rolePermissions = rolePerms.Permissions
        }
      } catch (e) {
          console.error("Failed to load role permissions", e)
      }
  }

  const branchId = users.Branch_ID || null
  const customerId = users.Customer_ID || null
  // Merge Role Permissions with User Specific Permissions
  const permissions = { ...rolePermissions, ...(users.Permissions || {}) }
  
  await createSession(
    users.Username, 
    roleId, 
    branchId, 
    users.Username, 
    customerId, 
    permissions
  )

  // Log successful login
  await logActivity({
    module: 'Auth',
    action: 'LOGIN',
    userId: users.Username,
    username: users.Username,
    role: users.Role || (roleId === 1 ? 'Super Admin' : roleId === 2 ? 'Admin' : 'Staff'),
    branchId: branchId || undefined,
    details: { method: 'credentials', login_time: new Date().toISOString() }
  })
  
  redirect('/dashboard')
}

export async function logout() {
  const session = await getSession()
  if (session) {
    await logActivity({
      module: 'Auth',
      action: 'LOGOUT',
      userId: session.userId,
      username: session.username,
      details: { logout_time: new Date().toISOString() }
    })
  }
  await deleteSession()
  redirect('/login')
}
