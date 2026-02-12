'use server'

import { getAllJobs } from "@/lib/supabase/jobs"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { getAllFuelLogs } from "@/lib/supabase/fuel"
import { getAllRepairTickets } from "@/lib/supabase/maintenance"

export async function getReportData(type: string) {
  try {
    switch (type) {
      case 'jobs':
        // Get all jobs (limit 1000 for now)
        return (await getAllJobs(1, 1000)).data
      case 'drivers':
        return (await getAllDrivers(1, 1000)).data
      case 'vehicles':
        return (await getAllVehicles(1, 1000)).data
      case 'fuel':
        return (await getAllFuelLogs(1, 1000)).data
      case 'maintenance':
        return (await getAllRepairTickets(1, 1000)).data
      default:
        return []
    }
  } catch (error) {
    console.error('Error fetching report data:', error)
    return []
  }
}
