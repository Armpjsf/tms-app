'use server'

import { createAdminClient } from "@/utils/supabase/server"

/**
 * Updates the current location of a driver in the Master_Drivers table.
 * This is used for real-time tracking on the admin dashboard.
 */
export async function updateDriverLocation(driverId: string, lat: number, lon: number) {
    const supabase = createAdminClient()

    const { error } = await supabase
        .from('Master_Drivers')
        .update({
            Current_Lat: lat,
            Current_Lon: lon,
            Last_Seen: new Date().toISOString()
        })
        .eq('Driver_ID', driverId)

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}
