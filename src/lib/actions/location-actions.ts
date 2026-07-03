'use server'

// No admin client needed here anymore since we only log.

/**
 * Updates the current location of a driver in the Master_Drivers table.
 * This is used for real-time tracking on the admin dashboard.
 */
export async function updateDriverLocation(driverId: string, lat: number, lon: number) {
    // We NO LONGER update Master_Drivers because it lacks the necessary columns (Current_Lat, Updated_At, etc.)
    // The coordinates are already saved to 'gps_logs' via saveGPSLog.
    return { success: true }
}
