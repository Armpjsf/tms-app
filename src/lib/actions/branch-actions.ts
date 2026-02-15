"use server"

import { createClient } from "@/utils/supabase/server"

export interface Branch {
    Branch_ID: string;
    Branch_Name: string;
}

export async function getBranches() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("Master_Branches")
        .select("Branch_ID, Branch_Name")
        .order("Branch_ID")

    if (error) {
        console.error("Error fetching branches:", error)
        return []
    }

    return data as Branch[]
}
