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
            const roleId = Number(session.roleId)
            const isSuper = roleId === 1
            const isAdminUser = roleId === 2

            if (isSuper) {
                const cookieStore = await cookies()
                const selected = cookieStore.get('selectedBranch')?.value
                
                // If they have a specifically selected branch in their cookie, use it
                if (selected && selected !== 'All' && selected !== 'ทุกสาขา' && !selected.includes('ทุกสาขา')) {
                    return selected
                }
                
                return 'All'
            }

            // For Admin (Role 2) and other roles (Staff, Driver, Customer), 
            // strictly use their assigned branch from session.
            // DO NOT allow them to use the branch selection cookie.
            return session.branchId || 'HQ'

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
