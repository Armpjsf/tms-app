"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"
import argon2 from "argon2"

export interface UserData {
    Username: string;
    Password?: string;
    Name: string;
    Branch_ID: string;
    Role_ID: number;
    Role?: string; // Legacy/Display
    Active_Status: string;
    Customer_ID?: string | null;
    Permissions?: Record<string, boolean>;
}

export async function getUsers() {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from("Master_Users")
        .select(`
            *,
            Master_Customers ( Customer_Name )
        `)
        .order("Username")

    if (error) {
        console.error("Error fetching users:", error)
        return []
    }

    return data
}

export async function createUser(user: UserData) {
    const supabase = await createClient()
    
    // Check if username exists
    const { data: existing } = await supabase
        .from("Master_Users")
        .select("Username")
        .eq("Username", user.Username)
        .single()
        
    if (existing) {
        return { success: false, error: "ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว" }
    }

    const session = await getSession()
    if (!session) return { success: false, error: "Not authenticated" }

    if (user.Role === "Super Admin" && session.roleId !== 1) {
        return { success: false, error: "คุณไม่มีสิทธิ์สร้างผู้ใช้งานระดับ Super Admin" }
    }

    const hashedPassword = await argon2.hash(user.Password || "123456")

    const { error } = await supabase
        .from("Master_Users")
        .insert([{
            Username: user.Username,
            Password: hashedPassword,
            Name: user.Name,
            Branch_ID: user.Branch_ID,
            Role: user.Role || 'Staff',
            Customer_ID: user.Customer_ID || null,
            Permissions: user.Permissions || {},
            Active_Status: 'Active'
        }])

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath("/settings/users")
    return { success: true }
}

export async function updateUser(username: string, updates: Partial<UserData>) {
    const supabase = await createClient()
    
    const session = await getSession()
    if (!session) return { success: false, error: "Not authenticated" }

    // Check target user's current role
    const { data: targetUser } = await supabase
        .from("Master_Users")
        .select("Role")
        .eq("Username", username)
        .single()

    if (targetUser?.Role === "Super Admin" && session.roleId !== 1) {
        return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขข้อมูลของ Super Admin" }
    }

    // New Rule: Admin usage restricted
    // Assuming Role ID 2 is Admin. If session.roleId is NOT 1 (Super Admin), they cannot edit another Admin.
    // We strictly check if target is Admin and current user is NOT Super Admin.
    if (targetUser?.Role === "Admin" && session.roleId !== 1) {
        return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขข้อมูลของ Admin" }
    }

    const updatePayload: Partial<UserData> = {
        Name: updates.Name,
        Branch_ID: updates.Branch_ID,
        Active_Status: updates.Active_Status,
        Customer_ID: updates.Customer_ID,
        Permissions: updates.Permissions,
        Role: updates.Role
    }

    if (updates.Password) {
        updatePayload.Password = await argon2.hash(updates.Password)
    }

    const { error } = await supabase
        .from("Master_Users")
        .update(updatePayload)
        .eq("Username", username)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath("/settings/users")
    return { success: true }
}

export async function getCurrentUserRole() {
    const session = await getSession()
    if (!session) return { roleId: 3, username: null } // Default to Staff
    return {
        roleId: session.roleId,
        username: session.username
    }
}

export async function deleteUser(username: string) {
    const supabase = await createClient()
    
    const session = await getSession()
    if (!session) return { success: false, error: "Not authenticated" }

    // Check target user's current role
    const { data: targetUser } = await supabase
        .from("Master_Users")
        .select("Role")
        .eq("Username", username)
        .single()

    if (targetUser?.Role === "Super Admin" && session.roleId !== 1) {
        return { success: false, error: "คุณไม่มีสิทธิ์ลบข้อมูลของ Super Admin" }
    }

    if (targetUser?.Role === "Admin" && session.roleId !== 1) {
        return { success: false, error: "คุณไม่มีสิทธิ์ลบข้อมูลของ Admin" }
    }

    const { error } = await supabase
        .from("Master_Users")
        .delete()
        .eq("Username", username)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath("/settings/users")
    return { success: true }
}
