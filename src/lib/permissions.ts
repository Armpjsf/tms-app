"use server"

import { getSession } from "@/lib/session"
import { cookies } from "next/headers"

/**
 * Enhanced Branch ID resolver with strict isolation logic.
 * - Restricted Admins/Staff: Strictly returns their assigned Branch_ID.
 * - Global Users (Super Admin): Returns selected cookie branch or 'All'.
 */
export async function getUserBranchId() {
    try {
        const session = await getSession()
        if (session) {
            const isSuper = Number(session.roleId) === 1
            
            // 1. Restricted Users: If they have a specific branch assigned in DB, FORCE it.
            if (session.branchId && session.branchId !== 'All') {
                return session.branchId
            }

            // 2. Global Users (Super Admin): Allow switching via cookie.
            if (isSuper) {
                const cookieStore = await cookies()
                const selected = cookieStore.get('selectedBranch')?.value
                if (!selected || selected === 'All' || selected === 'ทุกสาขา' || selected.includes('ทุกสาขา')) return 'All'
                return selected
            }

            // 3. Regular Admins (Role 2) with no specific branch assigned:
            // Fallback to cookie BUT prevent 'All' access.
            const cookieStore = await cookies()
            const selected = cookieStore.get('selectedBranch')?.value
            const isAll = !selected || selected === 'All' || selected === 'ทุกสาขา' || selected.includes('ทุกสาขา')
            
            if (!isAll && selected) return selected
            
            return 'HQ' // Fail-safe default for admins with no assigned branch
        }

        // Fallback to driver session if no staff session exists
        const cookieStore = await cookies()
        const driverSessionStr = cookieStore.get('driver_session')?.value
        if (driverSessionStr) {
            try {
                const driverSession = JSON.parse(driverSessionStr)
                return driverSession.branchId || null
            } catch {
                return null
            }
        }
        
        return 'All'
    } catch {
        return 'All'
    }
}

export async function getFixedUserBranchId() {
    try {
        const session = await getSession()
        return session?.branchId || null
    } catch {
        return null
    }
}

export async function getUserRole() {
    const session = await getSession()
    return session?.roleId
}

export async function getCustomerId() {
    const session = await getSession()
    return session?.customerId
}

export async function getUserId() {
    const session = await getSession()
    return session?.userId
}

export async function hasPermission(permission: string) {
    const session = await getSession()
    if (!session) return false

    // Super admin has all permissions
    if (session.roleId === 1) return true

    try {
        // Fetch permissions from DB since they are no longer in the session cookie
        const { getPermissionsByRole } = await import("@/lib/actions/permission-actions")
        const { getUserProfile } = await import("@/lib/supabase/users")
        const profile = await getUserProfile()

        if (!profile?.Role) return false

        const allowedMenus = await getPermissionsByRole(profile.Role)
        return !!allowedMenus?.includes(permission)
    } catch {
        return false
    }
}

export async function isSuperAdmin() {
    const roleId = await getUserRole()
    const result = Number(roleId) === 1
    return result
}

export async function isAdmin() {
    const roleId = await getUserRole()
    const result = Number(roleId) === 1 || Number(roleId) === 2
    return result
}

export async function isCustomer() {
    const session = await getSession()
    if (!session) return false
    
    // Check if role is explicitly 'Customer' (ID 7)
    const hasCustomerRole = Number(session.roleId) === 7
    
    // Or if they have a customerId assigned
    const hasCustomerId = !!session.customerId && session.customerId !== 'FORCED_RESTRICTION'
    
    return hasCustomerRole || hasCustomerId
}
