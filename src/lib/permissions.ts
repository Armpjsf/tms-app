"use server"

import { getSession } from "@/lib/session"

export async function getUserBranchId() {
    const session = await getSession()
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
