"use server"

import { getSession } from "@/lib/session"
import { cookies } from "next/headers"

export async function getUserBranchId() {
    try {
        const session = await getSession()
        if (session) {
            console.log(`[DEBUG] Session found: userId=${session.userId}, roleId=${session.roleId}`)
            // For Super Admin, use the selected branch from cookies if available
            if (Number(session.roleId) === 1) {
                const cookieStore = await cookies()
                return cookieStore.get('selectedBranch')?.value || 'All'
            }
            return session.branchId
        }

        // fallback to driver session
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
    } catch {
        return null
    }

    return null
}

export async function getUserRole() {
    const session = await getSession()
    return session?.roleId
}

export async function getCustomerId() {
    const session = await getSession()
    return session?.customerId
}

export async function hasPermission(permission: string) {
    const session = await getSession()
    if (!session) return false
    
    // Super Admin (Role 1) always has all permissions
    if (session.roleId === 1) return true
    
    // For other roles, check the specific permission flag
    // Support both boolean true and presence in an array if we ever change formats, 
    // but sticking to Record<string, boolean> as per current standard.
    return !!session?.permissions?.[permission]
}

export async function isSuperAdmin() {
    const roleId = await getUserRole()
    return Number(roleId) === 1
}

export async function isAdmin() {
    const roleId = await getUserRole()
    const result = Number(roleId) === 1 || Number(roleId) === 2
    console.log(`[DEBUG] isAdmin check: roleId=${roleId}, result=${result}`)
    return result
}

export async function isCustomer() {
    const customerId = await getCustomerId()
    return !!customerId
}
