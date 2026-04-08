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

  // 1. Query Master_Users with Case-Insensitive Username
  const { data: users, error } = await supabase
    .from('Master_Users')
    .select('*')
    .ilike('Username', data.email)
    .maybeSingle()

  if (error || !users) {
    console.warn(`[AUTH] Login failed: User not found (${data.email})`)
    redirect('/login?error=Invalid credentials')
  }

  // 2. Verify Password
  let isValid = false
  const dbPassword = users.Password || ""

  try {
    if (dbPassword.startsWith('$argon2')) {
       isValid = await argon2.verify(dbPassword, data.password)
    } else {
       // Plain-text password fallback
       isValid = data.password === dbPassword
       
       // Auto-migrate to Argon2
       if (isValid && data.password) {
         const hashedPassword = await argon2.hash(data.password)
         await supabase
           .from('Master_Users')
           .update({ Password: hashedPassword })
           .eq('Username', users.Username)
       }
    }
  } catch (err) {
    console.error(`[AUTH] Argon2 Error:`, err)
    isValid = false
  }

  if (!isValid) {
    console.warn(`[AUTH] Login failed: Invalid password for ${data.email}`)
    redirect('/login?error=Invalid credentials')
  }

  // 3. Create Session (Custom)
  // Map string Role to numeric Role_ID if Role_ID is missing
  let roleId = users.Role_ID
  const trimmedRole = users.Role?.trim() || ''
  
  if ((roleId === undefined || roleId === null) && trimmedRole) {
    const roleMap: Record<string, number> = {
      'super admin': 1,
      'admin': 2,
      'executive': 3,
      'dispatcher': 3,
      'accountant': 4,
      'staff': 5,
      'driver': 6,
      'customer': 7
    }
    roleId = roleMap[trimmedRole.toLowerCase()] || 5
  } else if (roleId === undefined || roleId === null) {
    roleId = 5
  }

  // 2. Fetch Role Permissions from correct table
  const rolePermissions: Record<string, boolean> = {}
  if (trimmedRole) {
      try {
        const { data: rolePerms } = await supabase
            .from('role_permissions')
            .select('allowed_menus')
            .ilike('role_name', trimmedRole)
            .maybeSingle()
        
        if (rolePerms?.allowed_menus) {
            // Convert array of allowed menus to boolean map
            rolePerms.allowed_menus.forEach((menu: string) => {
                rolePermissions[menu] = true
            })
        }
      } catch (err) {
          console.error(`[AUTH] Failed to load role permissions for ${trimmedRole}:`, err)
      }
  }

  const branchId = users.Branch_ID || users.branch_id || null
  const customerId = users.Customer_ID || users.customer_id || null
  
  // SECURITY: If role is Customer, ensure customerId is strictly enforced
  const isCustomerRole = trimmedRole.toLowerCase() === 'customer' || roleId === 7
  const finalCustomerId = customerId ? String(customerId) : null

  // CRITICAL: Prevent login for customers with missing IDs
  if (isCustomerRole && !finalCustomerId) {
      console.warn(`[AUTH] Login failed: Customer ${data.email} is missing a Customer_ID linking.`)
      redirect('/login?error=บัญชีของคุณยังไม่ได้ผูกกับโปรไฟล์ลูกค้า กรุณาติดต่อแอดมินให้ระบุรหัสลูกค้าในหน้าจัดการผู้ใช้')
  }
  
  await createSession(
    users.Username, 
    roleId, 
    branchId ? String(branchId) : null, 
    users.Username, 
    finalCustomerId
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
