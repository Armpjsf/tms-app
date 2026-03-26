'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/server'
import argon2 from 'argon2'
import { createSession, deleteSession, getSession } from '@/lib/session'
import { logActivity } from '@/lib/supabase/logs'
// import { cookies } from 'next/headers' // Used in createClient

export async function login(formData: FormData) {
  const supabase = createAdminClient()
  
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
    redirect('/login?error=Invalid credentials')
  }

  // ... (Password verification logic) ...
  let isValid = false
  try {
    if (users.Password.startsWith('$argon2')) {
       isValid = await argon2.verify(users.Password, data.password)
    } else {
       isValid = false 
    }
  } catch {
    isValid = false
  }

  if (!isValid) {
    redirect('/login?error=Invalid credentials')
  }

  // 3. Create Session (Custom)
  // Map string Role to numeric Role_ID if Role_ID is missing
  let roleId = users.Role_ID
  if ((roleId === undefined || roleId === null) && users.Role) {
    const roleMap: Record<string, number> = {
      'Super Admin': 1,
      'Admin': 2,
      'Dispatcher': 3,
      'Accountant': 4,
      'Staff': 5,
      'Driver': 6,
      'Customer': 7
    }
    roleId = roleMap[users.Role] || 5
  } else if (roleId === undefined || roleId === null) {
    roleId = 5
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
      } catch {
          // Failed to load role permissions
      }
  }

  const branchId = users.Branch_ID || users.branch_id || null
  const customerId = users.Customer_ID || users.customer_id || null
  
  // MERGE Role Permissions with User Specific Permissions
  const permissions = { ...rolePermissions, ...(users.Permissions || {}) }
  
  // SECURITY: If role is Customer, ensure customerId is strictly enforced
  const finalCustomerId = (users.Role === 'Customer' || roleId === 7) 
    ? (customerId ? String(customerId) : 'FORCED_RESTRICTION') 
    : (customerId ? String(customerId) : null)
  
  await createSession(
    users.Username, 
    roleId, 
    branchId ? String(branchId) : null, 
    users.Username, 
    finalCustomerId, 
    permissions
  )

  // Log successful login
  await logActivity({
    module: 'Auth',
    action_type: 'LOGIN',
    user_id: users.Username,
    username: users.Username,
    role: users.Role || (roleId === 1 ? 'Super Admin' : roleId === 2 ? 'Admin' : 'Staff'),
    branch_id: branchId || undefined,
    details: { method: 'credentials', login_time: new Date().toISOString() }
  })
  
  redirect('/dashboard')
}

export async function logout() {
  const session = await getSession()
  if (session) {
    await logActivity({
      module: 'Auth',
      action_type: 'LOGOUT',
      user_id: session.userId,
      username: session.username,
      details: { logout_time: new Date().toISOString() }
    })
  }
  await deleteSession()
  redirect('/login')
}
