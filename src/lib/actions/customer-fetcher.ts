"use server"

import { createAdminClient } from "@/utils/supabase/server"

/**
 * Isolated server action to fetch customers with admin privileges.
 * This is kept in a separate file to avoid circular dependencies 
 * and ensure runtime stability in large module graphs.
 */
export async function fetchCustomerList() {
    try {
        const supabase = createAdminClient()
        
        const { data, error } = await supabase
            .from('Master_Customers')
            .select('*')
            .order('Customer_Name')
            .limit(1000)
            
        if (error) {
            console.error("[FETCH_ERROR] Failed to fetch customers:", error)
            return { data: [], count: 0 }
        }
        
        return { 
            data: data || [], 
            count: data?.length || 0 
        }
    } catch (e) {
        console.error("[FETCH_ERROR] Unhandled error in fetchCustomerList:", e)
        return { data: [], count: 0 }
    }
}
