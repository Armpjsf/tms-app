'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isSuperAdmin } from '@/lib/permissions'

export type RolePermission = {
    Role: string
    Permissions: Record<string, boolean>
    Updated_At?: string
    Updated_By?: string
}

export async function getRolePermissions() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('Master_Role_Permissions')
            .select('*')
            .order('Role')

        if (error) throw error
        return { success: true, data: data as RolePermission[] }
    } catch (error: any) {
        console.error('Error fetching role permissions:', error)
        return { success: false, error: error.message }
    }
}

export async function updateRolePermissions(role: string, permissions: Record<string, boolean>) {
    try {
        // Security check: Only Super Admin can update permissions
        const isSuper = await isSuperAdmin()
        if (!isSuper) {
            return { success: false, error: 'Unauthorized: Only Super Admin can manage permissions' }
        }

        const supabase = await createClient()
        const { error } = await supabase
            .from('Master_Role_Permissions')
            .upsert({
                Role: role,
                Permissions: permissions,
                Updated_At: new Date().toISOString()
            })

        if (error) throw error

        revalidatePath('/settings/roles')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating role permissions:', error)
        return { success: false, error: error.message }
    }
}

export async function getPermissionForRole(role: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('Master_Role_Permissions')
            .select('Permissions')
            .eq('Role', role)
            .single()

        if (error) return {}
        return data.Permissions as Record<string, boolean>
    } catch {
        return {}
    }
}
