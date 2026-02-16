"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { Subcontractor } from "@/types/subcontractor"

export async function createSubcontractor(data: Partial<Subcontractor>) {
    try {
        if (!data.Sub_ID || !data.Sub_Name) {
            throw new Error("Missing Sub_ID or Sub_Name")
        }

        const supabase = await createClient()
        const { error } = await supabase
            .from("Master_Subcontractors")
            .insert([{
                Sub_ID: data.Sub_ID,
                Sub_Name: data.Sub_Name,
                Tax_ID: data.Tax_ID,
                Bank_Name: data.Bank_Name,
                Bank_Account_No: data.Bank_Account_No,
                Bank_Account_Name: data.Bank_Account_Name,
                Active_Status: data.Active_Status || 'Active'
            }])

        if (error) throw error
        
        revalidatePath("/settings/subcontractors")
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("Error creating subcontractor:", error)
        return { success: false, error: message }
    }
}

export async function updateSubcontractor(id: string, data: Partial<Subcontractor>) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from("Master_Subcontractors")
            .update(data)
            .eq("Sub_ID", id)

        if (error) throw error
        
        revalidatePath("/settings/subcontractors")
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("Error updating subcontractor:", error)
        return { success: false, error: message }
    }
}

export async function deleteSubcontractor(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from("Master_Subcontractors")
            .delete()
            .eq("Sub_ID", id)

        if (error) throw error
        
        revalidatePath("/settings/subcontractors")
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("Error deleting subcontractor:", error)
        return { success: false, error: message }
    }
}
