"use server"

import { createClient } from "@/utils/supabase/server"
import { Role, RolePermissions } from "@/types/role"
import { revalidatePath } from "next/cache"

export async function getRoles() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("Master_Roles")
        .select("*")
        .order("Role_ID", { ascending: true })

    if (error) {
        console.error("Error fetching roles:", error)
        return []
    }

    return data as Role[]
}

export async function getRoleById(id: number) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("Master_Roles")
        .select("*")
        .eq("Role_ID", id)
        .single()

    if (error) return null

    return data as Role
}

export async function createRole(role: Omit<Role, "Role_ID">) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("Master_Roles")
        .insert([role])
        .select()

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath("/settings/roles")
    return { success: true, data }
}

export async function updateRole(id: number, role: Partial<Role>) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("Master_Roles")
        .update(role)
        .eq("Role_ID", id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath("/settings/roles")
    return { success: true }
}

export async function deleteRole(id: number) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("Master_Roles")
        .delete()
        .eq("Role_ID", id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath("/settings/roles")
    return { success: true }
}
