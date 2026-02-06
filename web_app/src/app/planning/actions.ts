'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type JobFormData = {
  Job_ID: string
  Plan_Date: string
  Customer_Name: string
  Route_Name: string
  Driver_ID: string
  Vehicle_Plate: string
  Job_Status: string
}

export async function createJob(data: JobFormData) {
  const supabase = await createClient()

  // Get Driver Name based on Driver_ID
  let driverName = ''
  if (data.Driver_ID) {
    const { data: driver } = await supabase
      .from('Master_Drivers')
      .select('Driver_Name')
      .eq('Driver_ID', data.Driver_ID)
      .single()
    if (driver) driverName = driver.Driver_Name
  }

  const { error } = await supabase
    .from('Jobs_Main')
    .insert({
      Job_ID: data.Job_ID,
      Plan_Date: data.Plan_Date,
      Customer_Name: data.Customer_Name,
      Route_Name: data.Route_Name,
      Driver_ID: data.Driver_ID,
      Driver_Name: driverName,
      Vehicle_Plate: data.Vehicle_Plate,
      Job_Status: 'New',
      Created_At: new Date().toISOString(),
    })

  if (error) {
    console.error('Error creating job:', error)
    return { success: false, message: 'Failed to create job' }
  }

  revalidatePath('/planning')
  return { success: true, message: 'Job created successfully' }
}

export async function updateJob(jobId: string, data: Partial<JobFormData>) {
  const supabase = await createClient()

  const updateData: any = { ...data }
  
  // Update Driver Name if Driver_ID specifically changes
  if (data.Driver_ID) {
    const { data: driver } = await supabase
      .from('Master_Drivers')
      .select('Driver_Name')
      .eq('Driver_ID', data.Driver_ID)
      .single()
    if (driver) updateData.Driver_Name = driver.Driver_Name
  }

  const { error } = await supabase
    .from('Jobs_Main')
    .update(updateData)
    .eq('Job_ID', jobId)

  if (error) {
    console.error('Error updating job:', error)
    return { success: false, message: 'Failed to update job' }
  }

  revalidatePath('/planning')
  return { success: true, message: 'Job updated successfully' }
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Jobs_Main')
    .delete()
    .eq('Job_ID', jobId)

  if (error) {
    console.error('Error deleting job:', error)
    return { success: false, message: 'Failed to delete job' }
  }

  revalidatePath('/planning')
  return { success: true, message: 'Job deleted successfully' }
}
