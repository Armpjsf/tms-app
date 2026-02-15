import { getSession } from "@/lib/session"

export async function getUserBranchId() {
    const session = await getSession()
    return session?.branchId
}

export async function getUserRole() {
    const session = await getSession()
    return session?.roleId
}

export async function isSuperAdmin() {
    const roleId = await getUserRole()
    return roleId === 1
}
