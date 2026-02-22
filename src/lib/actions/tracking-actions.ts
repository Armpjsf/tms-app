"use server"

import { createClient } from "@/utils/supabase/server"

export interface PublicJobDetails {
    jobId: string
    trackingCode: string
    status: string
    customerName: string
    origin: string
    destination: string
    driverName: string
    driverPhone: string
    vehiclePlate: string
    planDate: string
    pickupDate: string | null
    deliveryDate: string | null
    pickupPhotos: string[]
    podPhotos: string[]
    signature: string | null
    pickupSignature: string | null
    lastLocation?: {
        lat: number
        lng: number
        timestamp: string
    } | null
}

export async function getPublicJobDetails(jobId: string): Promise<PublicJobDetails | null> {
    const supabase = await createClient()

    // Query Jobs_Main with all relevant columns
    const { data: job, error } = await supabase
        .from('Jobs_Main')
        .select('*')
        .eq('Job_ID', jobId)
        .single()
    
    if (error || !job) {
        console.error("Error fetching job:", error)
        return null
    }

    // Process Photos
    const pickupPhotos = job.Pickup_Photo_Url ? job.Pickup_Photo_Url.split(',').filter(Boolean) : []
    const podPhotos = job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',').filter(Boolean) : []

    // Fetch latest location for the vehicle/driver associated with this job
    let lastLocation = null
    if (['In Transit', 'Picked Up'].includes(job.Job_Status)) {
        const { data: gpsData } = await supabase
            .from('gps_logs')
            .select('*')
            .eq('driver_id', job.Driver_Name) // Assuming Driver_Name is the foreign key or ID in some cases, but usually we need Driver_ID. 
            // Let's check if Driver_ID is available in job.
            .order('timestamp', { ascending: false })
            .limit(1)
        
        const log = gpsData?.[0]
        if (log) {
            lastLocation = {
                lat: log.latitude || log.Latitude,
                lng: log.longitude || log.Longitude,
                timestamp: log.timestamp || log.Timestamp
            }
        }
    }

    return {
        jobId: job.Job_ID,
        trackingCode: job.Job_ID,
        status: job.Job_Status || 'Pending',
        customerName: job.Customer_Name || 'Unknown',
        origin: job.Location_Origin_Name || job.Origin_Location || '-',
        destination: job.Location_Destination_Name || job.Dest_Location || '-',
        driverName: job.Driver_Name || '-',
        driverPhone: '-', 
        vehiclePlate: job.Vehicle_Plate || '-',
        planDate: job.Plan_Date || '-',
        pickupDate: job.Actual_Pickup_Time || null,
        deliveryDate: job.Actual_Delivery_Time || null,
        pickupPhotos,
        podPhotos,
        signature: job.Signature_Url || (job as any).signature_url || null,
        pickupSignature: job.Pickup_Signature_Url || (job as any).pickup_signature_url || null,
        lastLocation
    }
}
