"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

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

    const roleMap: Record<number, string> = {
        1: 'Super Admin',
        2: 'Admin',
        3: 'Staff',
        4: 'Driver',
        5: 'Customer'
    }

    const { error } = await supabase
        .from("Master_Users")
        .insert([{
            Username: user.Username,
            Password: user.Password,
            Name: user.Name,
            Branch_ID: user.Branch_ID,
            Role: roleMap[user.Role_ID] || 'Staff',
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
    
    const roleMap: Record<number, string> = {
        1: 'Super Admin',
        2: 'Admin',
        3: 'Staff',
        4: 'Driver',
        5: 'Customer'
    }

    const updatePayload: any = {
        Name: updates.Name,
        Branch_ID: updates.Branch_ID,
        Active_Status: updates.Active_Status,
        Customer_ID: updates.Customer_ID,
        Permissions: updates.Permissions,
    }

    if (updates.Role_ID) {
        updatePayload.Role = roleMap[updates.Role_ID] || 'Staff'
    }

    if (updates.Password) {
        updatePayload.Password = updates.Password
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

export async function deleteUser(username: string) {
    const supabase = await createClient()
    
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
