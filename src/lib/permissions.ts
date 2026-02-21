"use server"

import { getSession } from "@/lib/session"
import { cookies } from "next/headers"

export async function getUserBranchId() {
    const session = await getSession()
    if (!session) return null

    // For Super Admin, use the selected branch from cookies if available
    if (session.roleId === 1) {
        const cookieStore = await cookies()
        return cookieStore.get('selectedBranch')?.value || 'All'
    }

    return session?.branchId
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
    
    // Super Admin (Role 1) and Admin (Role 2) have all permissions
    if (session.roleId === 1 || session.roleId === 2) return true
    
    return !!session?.permissions?.[permission]
}

export async function isSuperAdmin() {
    const roleId = await getUserRole()
    return roleId === 1
}

export async function isAdmin() {
    const roleId = await getUserRole()
    return roleId === 1 || roleId === 2
}

export async function isCustomer() {
    const customerId = await getCustomerId()
    return !!customerId
}
