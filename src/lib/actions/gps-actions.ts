"use server"

import { createClient } from "@/utils/supabase/server"

export async function getJobGPSData(jobId: string, driverName: string, date: string) {
    const supabase = await createClient()
    
    try {
        // 1. Fetch Job Route History (Breadcrumbs)
        // We use the driver Name/ID and the specific date of the job
        const startDate = `${date}T00:00:00`
        const endDate = `${date}T23:59:59`

        const { data: routeData } = await supabase
            .from('gps_logs')
            .select('latitude, longitude, timestamp')
            .eq('job_id', jobId) // Try specific job first
            .order('timestamp', { ascending: true })
        
        // If no job-specific logs, fallback to driver logs for that day
        let finalRoute = routeData
        if (!finalRoute || finalRoute.length === 0) {
            const { data: driverData } = await supabase
                .from('gps_logs')
                .select('latitude, longitude, timestamp')
                .eq('driver_id', driverName)
                .gte('timestamp', startDate)
                .lte('timestamp', endDate)
                .order('timestamp', { ascending: true })
            finalRoute = driverData
        }

        // 2. Fetch Latest Location
        const { data: latestData } = await supabase
            .from('gps_logs')
            .select('*')
            .eq('driver_id', driverName)
            .order('timestamp', { ascending: false })
            .limit(1)

        const latest = latestData?.[0]

        return {
            route: finalRoute?.map(r => [r.latitude || (r as any).Latitude, r.longitude || (r as any).Longitude]) || [],
            latest: latest ? {
                lat: latest.latitude || latest.Latitude,
                lng: latest.longitude || latest.Longitude,
                timestamp: latest.timestamp || latest.Timestamp
            } : null
        }
    } catch (e) {
        console.error("Failed to fetch GPS data for job summary:", e)
        return { route: [], latest: null }
    }
}
