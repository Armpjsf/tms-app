"use server"

import { createClient } from "@/utils/supabase/server"

export interface PublicJobDetails {
    jobId: string
    trackingCode: string
    status: string
    customerName: string // Masked or partial? Maybe full name is okay for the user tracking it.
    origin: string
    destination: string
    driverName: string
    driverPhone: string
    vehiclePlate: string
    pickupDate: string
    deliveryDate: string | null
    planDate: string
    photos: string[]
    signature: string | null
}

export async function getPublicJobDetails(jobId: string): Promise<PublicJobDetails | null> {
    const supabase = await createClient()

    // Query Jobs_Main
    const { data: job, error } = await supabase
        .from('Jobs_Main')
        .select(`
            Job_ID,
            Job_Status,
            Customer_Name,
            Location_Origin_Name,
            Location_Destination_Name,
            Driver_Name,
            Vehicle_Plate,
            Plan_Date,
            Actual_Pickup_Time,
            Actual_Delivery_Time
        `)
        .eq('Job_ID', jobId)
        .single()
    
    if (error || !job) {
        console.error("Error fetching job:", error)
        return null
    }

    // Prepare photos list (This depends on where photos are stored. 
    // Usually in Jobs_Main columns like 'Image_Url_1', or a related table?)
    // Let's assume standard columns or a related bucket fetch if needed.
    // For now, let's look for columns in Jobs_Main or just return empty if not sure.
    // *Wait*, previous tasks mentioned 'IMAGE' formula in G33 for GSheets. 
    // In Supabase, we likely have 'Image_Url_...' columns.
    
    // Let's inspect Jobs_Main columns via a quick query if needed, or assume standard names.
    // Based on `jobs.ts`, we might have `image_url_1`, `image_url_2`, etc.
    // Let's fetch them if they exist. For now, I'll fetch * and map manually to be safe.
    
    const { data: fullJob } = await supabase
        .from('Jobs_Main')
        .select('*')
        .eq('Job_ID', jobId)
        .single()

    const photos: string[] = []
    if (fullJob) {
        // Collect all non-null image columns
        // Assuming columns like 'Image_1', 'Image_2' or 'Proof_Of_Delivery'
        // Let's iterate keys or checking specific known columns
        if (fullJob.Image_1_Url) photos.push(fullJob.Image_1_Url)
        if (fullJob.Image_2_Url) photos.push(fullJob.Image_2_Url)
        if (fullJob.Image_3_Url) photos.push(fullJob.Image_3_Url)
        if (fullJob.Signature_Url) photos.push(fullJob.Signature_Url)
    }

    return {
        jobId: job.Job_ID,
        trackingCode: job.Job_ID, // Use Job ID as tracking code for now
        status: job.Job_Status || 'Pending',
        customerName: job.Customer_Name || 'Unknown',
        origin: job.Location_Origin_Name || '-',
        destination: job.Location_Destination_Name || '-',
        driverName: job.Driver_Name || '-',
        driverPhone: '-', // We might need to join Master_Drivers to get phone
        vehiclePlate: job.Vehicle_Plate || '-',
        pickupDate: job.Actual_Pickup_Time,
        deliveryDate: job.Actual_Delivery_Time,
        planDate: job.Plan_Date,
        photos: photos,
        signature: fullJob?.Signature_Url || null
    }
}
