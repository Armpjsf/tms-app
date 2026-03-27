'use server'

import { createAdminClient } from "@/utils/supabase/server"

/**
 * Updates the current location of a driver in the Master_Drivers table.
 * This is used for real-time tracking on the admin dashboard.
 */
export async function updateDriverLocation(driverId: string, lat: number, lon: number) {
    console.log('[DEBUG] updateDriverLocation start:', { driverId, lat, lon })
    const supabase = createAdminClient()

    const { data, error } = await supabase
        .from('Master_Drivers')
        .update({
            Current_Lat: lat,
            Current_Lon: lon,
            current_lat: lat,
            current_lon: lon,
            Last_Seen: new Date().toISOString(),
            last_seen: new Date().toISOString()
        })
        .eq('Driver_ID', driverId)
        .select()

    if (error) {
        console.error('[DEBUG] updateDriverLocation error:', JSON.stringify(error, null, 2))
        return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
        // Try snake_case ID check
        await supabase.from('Master_Drivers').update({ current_lat: lat, current_lon: lon }).eq('driver_id', driverId)
        console.warn('[DEBUG] updateDriverLocation: No record updated for ID:', driverId)
    } else {
        console.log('[DEBUG] updateDriverLocation success for:', driverId, 'New Coords:', data[0].Current_Lat || data[0].current_lat)
    }

    return { success: true }
}
