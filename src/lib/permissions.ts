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

export async function getUserId() {
    const session = await getSession()
    return session?.userId
}

export async function hasPermission(permission: string) {
    const session = await getSession()
    if (!session) return false
    
    // Super Admin (Role 1) always has all permissions
    if (session.roleId === 1) return true
    
    return !!session?.permissions?.[permission]
}

export async function isSuperAdmin() {
    const roleId = await getUserRole()
    const result = Number(roleId) === 1
    if (result) {
        console.log(`[AUTH] User identified as SUPER_ADMIN (Role: ${roleId})`)
    }
    return result
}

export async function isAdmin() {
    const roleId = await getUserRole()
    const result = Number(roleId) === 1 || Number(roleId) === 2
    if (result) {
        console.log(`[AUTH] User identified as ADMIN/MANAGER (Role: ${roleId})`)
    }
    return result
}

export async function isCustomer() {
    const session = await getSession()
    // Strictly verify customer ID exists and is not a restriction placeholder
    const result = (!!session?.customerId && session.customerId !== 'FORCED_RESTRICTION') || Number(session?.roleId) === 7
    return result
}
