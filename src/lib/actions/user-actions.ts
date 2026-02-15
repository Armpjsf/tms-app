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
}

export async function getUsers() {
    const supabase = await createClient()
    
    // Join with Master_Roles and Master_Branches if possible, 
    // but standard supabase join uses foreign keys.
    // Assuming Role_ID is FK linked.
    
    const { data, error } = await supabase
        .from("Master_Users")
        .select(`
            *,
            Master_Roles ( Role_Name ),
            Master_Branches ( Branch_Name )
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

    const { error } = await supabase
        .from("Master_Users")
        .insert([{
            Username: user.Username,
            Password: user.Password, // Note: Should be hashed in production
            Name: user.Name,
            Branch_ID: user.Branch_ID,
            Role_ID: user.Role_ID,
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
    
    const { error } = await supabase
        .from("Master_Users")
        .update(updates)
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
