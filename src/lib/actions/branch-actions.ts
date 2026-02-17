"use server"

import { createClient } from "@/utils/supabase/server"

export async function getUniqueBranches() {
    const supabase = await createClient()

    // Since we don't have a strict Master_Branches table (or maybe we do, but let's be safe),
    // let's get distinct Branch_ID from Jobs_Main and Master_Drivers/Vehicles to be comprehensive.
    // Or just fetch all distinct Branch_ID from Jobs_Main for now as they have revenue data.
    
    // We can also check if a manual list is better, but dynamic is requested.
    // Let's try to query distinct Branch_ID from Jobs_Main.
    
    const { data, error } = await supabase
        .from('Jobs_Main')
        .select('Branch_ID')
        .not('Branch_ID', 'is', null)

    if (error || !data) return []

    // JavaScript Set to get unique values
    const branches = Array.from(new Set(data.map(item => item.Branch_ID))).sort()

    // Add 'All' at the beginning
    return ['All', ...branches]
}
