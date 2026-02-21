'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { getAllDriversFromTable } from '@/lib/supabase/drivers'
import { getAllVehiclesFromTable } from '@/lib/supabase/vehicles'


export type JobFormData = {
  Job_ID: string
  Plan_Date: string
  Delivery_Date?: string
  Customer_Name: string
  Route_Name: string
  Driver_ID: string
  Vehicle_Plate: string
  Vehicle_Type?: string
  Job_Status: string
  Cargo_Type?: string
  Notes?: string
  Price_Cust_Total?: number
  Cost_Driver_Total?: number
  original_origins_json?: string
  original_destinations_json?: string
  extra_costs_json?: string
  Sub_ID?: string | null
  Show_Price_To_Driver?: boolean
  Weight_Kg?: number
  Volume_Cbm?: number
  Branch_ID?: string
}

export async function createJob(data: JobFormData) {
  const supabase = await createClient()

  // Get Driver Name and Sub_ID based on Driver_ID
  let driverName = ''
  let subId = data.Sub_ID || null

  if (data.Driver_ID) {
    const { data: driver } = await supabase
      .from('Master_Drivers')
      .select('Driver_Name, Sub_ID, Show_Price_Default')
      .eq('Driver_ID', data.Driver_ID)
      .single()
    if (driver) {
      driverName = driver.Driver_Name
      if (!subId) subId = driver.Sub_ID || null
      // Default to driver preference if not explicitly set in form
      if (data.Show_Price_To_Driver === undefined) {
         data.Show_Price_To_Driver = driver.Show_Price_Default ?? true
      }
    }
  }

  // If subId still null, try looking up via Vehicle_Plate
  if (!subId && data.Vehicle_Plate) {
    const { data: vehicle } = await supabase
      .from('master_vehicles')
      .select('sub_id')
      .eq('vehicle_plate', data.Vehicle_Plate)
      .single()
    if (vehicle) subId = vehicle.sub_id || null
  }



  // Attempt 1
  const { error: error1 } = await supabase.from('Jobs_Main').insert(buildInsertPayload(data, driverName, subId))
  
  if (!error1) {
      revalidatePath('/planning')
      return { success: true, message: 'Job created successfully' }
  }

  // If duplicate key (23505), try regenerating ID once
  if (error1.code === '23505') {
      console.log('Duplicate Job ID detected, retrying with suffix...')
      const newId = `${data.Job_ID}-${Math.floor(Math.random() * 1000)}`
      const { error: error2 } = await supabase.from('Jobs_Main').insert(buildInsertPayload({ ...data, Job_ID: newId }, driverName, subId))
      
      if (!error2) {
          revalidatePath('/planning')
          return { success: true, message: `Job created with new ID: ${newId}` }
      }
      return { success: false, message: `Failed to create job (Duplicate ID): ${error2.message}` }
  }

  return { success: false, message: `Failed to create job: ${error1.message}` }
}

function buildInsertPayload(data: JobFormData, driverName: string, subId: string | null) {
  const parseIfString = (val: string | undefined) => {
      if (!val) return null
      try { return JSON.parse(val) } catch { return val }
  }
  return {
      Job_ID: data.Job_ID,
      Plan_Date: data.Plan_Date,
      Delivery_Date: data.Delivery_Date,
      Customer_Name: data.Customer_Name,
      Route_Name: data.Route_Name,
      Driver_ID: data.Driver_ID,
      Driver_Name: driverName,
      Vehicle_Plate: data.Vehicle_Plate,
      Vehicle_Type: data.Vehicle_Type,
      Job_Status: 'New',
      Cargo_Type: data.Cargo_Type,
      Notes: data.Notes,
      Price_Cust_Total: data.Price_Cust_Total || 0,
      Cost_Driver_Total: data.Cost_Driver_Total || 0,
      original_origins_json: parseIfString(data.original_origins_json),
      original_destinations_json: parseIfString(data.original_destinations_json),
      extra_costs_json: parseIfString(data.extra_costs_json),
      Sub_ID: subId,
      Show_Price_To_Driver: data.Show_Price_To_Driver ?? true,
      Weight_Kg: data.Weight_Kg || 0,
      Volume_Cbm: data.Volume_Cbm || 0,
      Branch_ID: data.Branch_ID || null,
      Created_At: new Date().toISOString(),
  }
}

export async function createBulkJobs(jobs: Partial<JobFormData>[]) {
  const supabase = await createClient()

  const parseIfString = (val: string | undefined) => {
      if (!val) return null
      try { return JSON.parse(val) } catch { return val }
  }

  const cleanData = jobs.map(j => ({
      Job_ID: j.Job_ID || `JOB-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`,
      Plan_Date: j.Plan_Date || new Date().toISOString().split('T')[0],
      Delivery_Date: j.Delivery_Date,
      Customer_Name: j.Customer_Name,
      Route_Name: j.Route_Name || 'Direct',
      Driver_ID: j.Driver_ID || null,
      Vehicle_Plate: j.Vehicle_Plate || null,
      Vehicle_Type: j.Vehicle_Type,
      Job_Status: 'New',
      Cargo_Type: j.Cargo_Type,
      Notes: j.Notes,
      Price_Cust_Total: j.Price_Cust_Total || 0,
      Cost_Driver_Total: j.Cost_Driver_Total || 0,
      original_origins_json: parseIfString(j.original_origins_json),
      original_destinations_json: parseIfString(j.original_destinations_json),
      extra_costs_json: parseIfString(j.extra_costs_json),
      Sub_ID: j.Sub_ID || null,
      Show_Price_To_Driver: j.Show_Price_To_Driver ?? true,
      Weight_Kg: j.Weight_Kg || 0,
      Volume_Cbm: j.Volume_Cbm || 0,
      Branch_ID: j.Branch_ID || null,
      Created_At: new Date().toISOString(),
  })).filter(j => j.Customer_Name)

  if (cleanData.length === 0) {
     return { success: false, message: 'No valid data found' }
  }

  const { error } = await supabase
    .from('Jobs_Main')
    .upsert(cleanData, { onConflict: 'Job_ID' })

  if (error) {
    console.error('Error bulk creating jobs:', error)
    return { success: false, message: `Failed to import: ${error.message}` }
  }

  revalidatePath('/planning')
  return { success: true, message: `Successfully imported ${cleanData.length} jobs` }
}

export async function updateJob(jobId: string, data: Partial<JobFormData>) {
  const supabase = await createClient()

  console.log(`[DEBUG] updateJob RCVD JobID: ${jobId}`, JSON.stringify(data, null, 2))

  const parseIfString = (val: string | undefined) => {
      if (!val) return null
      try { return JSON.parse(val) } catch { return val }
  }

  const updateData: Record<string, unknown> = { ...data }
  
  // Ensure JSON fields are parsed if they are strings
  if (data.extra_costs_json) updateData.extra_costs_json = parseIfString(data.extra_costs_json)
  if (data.original_origins_json) updateData.original_origins_json = parseIfString(data.original_origins_json)
  if (data.original_destinations_json) updateData.original_destinations_json = parseIfString(data.original_destinations_json)

  
  // Update Driver Name and Sub_ID if Driver_ID specifically changes
  if (data.Driver_ID) {
    const { data: driver } = await supabase
      .from('Master_Drivers')
      .select('Driver_Name, Sub_ID')
      .eq('Driver_ID', data.Driver_ID)
      .single()
    if (driver) {
       updateData.Driver_Name = driver.Driver_Name
       if (!updateData.Sub_ID) updateData.Sub_ID = driver.Sub_ID || null
    }
  }

  // Also check Vehicle_Plate for Sub_ID if still not present
  if (!updateData.Sub_ID && data.Vehicle_Plate) {
    const { data: vehicle } = await supabase
      .from('master_vehicles')
      .select('sub_id')
      .eq('vehicle_plate', data.Vehicle_Plate)
      .single()
    if (vehicle) updateData.Sub_ID = vehicle.sub_id || null
  }
  
  console.log(`[DEBUG] updateJob SENT:`, JSON.stringify(updateData, null, 2))

  const { error } = await supabase
    .from('Jobs_Main')
    .update(updateData)
    .eq('Job_ID', jobId)

  if (error) {
    console.error('Error updating job:', error)
    return { success: false, message: `Failed to update job: ${error.message}` }
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

// Remove getAllCustomers import if it's the only usage
// ...

export async function getJobCreationData() {
  const supabase = await createClient()

  const [driversResult, vehiclesResult, customersResult, routesResult] = await Promise.all([
    getAllDriversFromTable(),
    getAllVehiclesFromTable(),
    supabase.from('Master_Customers').select('*').order('Customer_Name', { ascending: true }),
    supabase.from('Master_Routes').select('*').order('Route_Name', { ascending: true })
  ])

  if (customersResult.error) {
    console.error('Error fetching customers:', customersResult.error)
  }

  return {
    drivers: driversResult,
    vehicles: vehiclesResult,
    customers: customersResult.data || [],
    routes: routesResult.data || []
  }
}
