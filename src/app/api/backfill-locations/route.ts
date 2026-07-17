import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()

  // 1. Fetch all active vehicles to build a map of vehicle plates -> vehicle types
  const { data: vehicles, error: vError } = await supabase
    .from('Master_Vehicles')
    .select('Vehicle_Plate, Vehicle_Type')

  if (vError) {
    return NextResponse.json({ success: false, error: 'Failed to fetch vehicles: ' + vError.message })
  }

  const vehicleMap = new Map(vehicles.map(v => [v.Vehicle_Plate, v.Vehicle_Type]))

  // 2. Fetch all jobs where Origin_Location, Dest_Location, OR Vehicle_Type is NULL
  const { data: jobs, error: fetchError } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Route_Name, Origin_Location, Dest_Location, original_origins_json, original_destinations_json, Vehicle_Plate, Vehicle_Type')
    .or('Origin_Location.is.null,Dest_Location.is.null,Vehicle_Type.is.null')

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message })
  }

  const updatedJobs = []
  const errors = []

  // 3. Loop through and backfill locations and vehicle types
  for (const job of jobs) {
    const updateData: Record<string, any> = {}

    // A. Parse locations if null
    if ((!job.Origin_Location || !job.Dest_Location) && job.Route_Name) {
      const parts = job.Route_Name.split(/\s*[-–—→>]\s*/)
      if (parts.length > 1) {
        const origin = parts[0].trim()
        const dest = parts[parts.length - 1].trim()

        if (!job.Origin_Location) {
          updateData.Origin_Location = origin
          updateData.original_origins_json = [{ name: origin, lat: null, lng: null }]
        }
        
        if (!job.Dest_Location) {
          updateData.Dest_Location = dest
          updateData.original_destinations_json = [{ name: dest, lat: null, lng: null }]
        }
      }
    }

    // B. Backfill vehicle type from Master_Vehicles if null
    if (!job.Vehicle_Type && job.Vehicle_Plate) {
      const typeFromDb = vehicleMap.get(job.Vehicle_Plate)
      if (typeFromDb) {
        updateData.Vehicle_Type = typeFromDb
      } else {
        // Fallback to 4-Wheel if not in Master_Vehicles
        updateData.Vehicle_Type = '4-Wheel'
      }
    }

    // C. Perform DB update if changes detected
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('Jobs_Main')
        .update(updateData)
        .eq('Job_ID', job.Job_ID)

      if (updateError) {
        errors.push({ jobId: job.Job_ID, error: updateError.message })
      } else {
        updatedJobs.push({ 
          jobId: job.Job_ID, 
          route: job.Route_Name,
          vehiclePlate: job.Vehicle_Plate,
          updatedFields: Object.keys(updateData)
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    total_found: jobs.length,
    updated_count: updatedJobs.length,
    updated: updatedJobs,
    errors
  })
}
