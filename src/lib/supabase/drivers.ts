"use server"

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

// Type matching actual Supabase schema
export type Driver = {
  Driver_ID: string
  Driver_Name: string | null  // ⚠️ ไม่ใช่ 'Name'
  Role: string | null
  Mobile_No: string | null    // ⚠️ ไม่ใช่ 'Phone'
  Line_User_ID: string | null
  Password: string | null
  Vehicle_Plate: string | null
  Vehicle_Type: string | null
  Max_Weight_kg: number | null
  Max_Volume_cbm: number | null
  Insurance_Expiry: string | null
  Tax_Expiry: string | null
  Act_Expiry: string | null
  Current_Mileage: number | null
  Active_Status: string | null
  License_Expiry: string | null // Added for document tracking
  Bank_Name?: string | null
  Bank_Account_No?: string | null
  Bank_Account_Name?: string | null
  Sub_ID?: string | null
  Show_Price_Default?: boolean | null
}

// Get all drivers from Master_Drivers table


export async function getAllDriversFromTable(): Promise<Driver[]> {
  try {
    const supabase = await createClient()
    let dbQuery = supabase.from('Master_Drivers').select('*')
    
    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    // Check for Admin Override Cookie
    const cookieStore = await cookies()
    const selectedBranch = cookieStore.get('selectedBranch')?.value
    
    if (isAdmin && selectedBranch && selectedBranch !== 'All') {
        console.log(`[getAllDriversFromTable] Admin Filtering by Branch: ${selectedBranch}`)
        // @ts-ignore
        dbQuery = dbQuery.eq('Branch_ID', selectedBranch)
    } else if (branchId && !isAdmin) {
        console.log(`[getAllDriversFromTable] Filtering by Branch: ${branchId}`)
        // @ts-ignore
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data, error } = await dbQuery
    
    if (error) {
      console.error('Error fetching drivers:', JSON.stringify(error))
      return []
    }
    return data || []
  } catch {
    return []
  }
}

// Get driver by ID
export async function getDriverById(id: string): Promise<Driver | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers')
      .select('*')
      .eq('Driver_ID', id)
      .single()
    
    if (error) return null
    return data
  } catch {
    return null
  }
}

// Create driver
export async function createDriver(driverData: Partial<Driver>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers')
      .insert({
        Driver_ID: driverData.Driver_ID || `DRV-${Date.now()}`,
        Driver_Name: driverData.Driver_Name,
        Mobile_No: driverData.Mobile_No,
        Role: driverData.Role || 'Driver',
        Vehicle_Plate: driverData.Vehicle_Plate,
        Vehicle_Type: driverData.Vehicle_Type,
        Password: driverData.Password, // Added
        Active_Status: driverData.Active_Status || 'Active', // Added
        License_Expiry: driverData.License_Expiry, // Added
        Branch_ID: await getUserBranchId()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating driver:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Update driver
export async function updateDriver(id: string, driverData: Partial<Driver>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers')
      .update({
        Driver_Name: driverData.Driver_Name,
        Mobile_No: driverData.Mobile_No,
        Role: driverData.Role,
        Vehicle_Plate: driverData.Vehicle_Plate,
        Vehicle_Type: driverData.Vehicle_Type,
        Password: driverData.Password, // Added
        Active_Status: driverData.Active_Status, // Added
        License_Expiry: driverData.License_Expiry // Added
      })
      .eq('Driver_ID', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating driver:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Delete driver
export async function deleteDriver(id: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('Master_Drivers')
      .delete()
      .eq('Driver_ID', id)
    
    if (error) {
      console.error('Error deleting driver:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}

// ดึงรายชื่อคนขับที่ Active
export async function getActiveDrivers() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Drivers') // Assuming 'Master_Drivers' is the correct table name based on other functions
      .select('*')
      .eq('Active_Status', 'Active') // Assuming 'Active_Status' is the correct column name
      .limit(10) // Limit for UI
    
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// Alias for planning page compatibility - returns { data: drivers }
// Also supports pagination for /drivers page
export async function getAllDrivers(page?: number, limit?: number, query?: string) {
  try {
    const supabase = await createClient()
    let queryBuilder = supabase.from('Master_Drivers').select('*', { count: 'exact' })
    
    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    
    // Check for Admin Override Cookie
    const cookieStore = await cookies()
    const selectedBranch = cookieStore.get('selectedBranch')?.value

    if (isAdmin && selectedBranch && selectedBranch !== 'All') {
        // @ts-ignore - Dynamic query
        queryBuilder = queryBuilder.eq('Branch_ID', selectedBranch)
    } else if (branchId && !isAdmin) {
        // @ts-ignore - Dynamic query
        queryBuilder = queryBuilder.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { data: [], count: 0 }
    }
    
    // Apply search filter if query provided
    if (query) {
      queryBuilder = queryBuilder.or(`Driver_Name.ilike.%${query}%,Mobile_No.ilike.%${query}%,Driver_ID.ilike.%${query}%`)
    }
    
    // Apply pagination if provided
    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }
    
    const { data, error, count } = await queryBuilder
    
    if (error) {
      console.error('Error fetching drivers:', JSON.stringify(error))
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}

// Get driver stats for dashboard
export async function getDriverStats() {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('Master_Drivers')
      .select('Driver_ID, Role')

    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    
    // Check for Admin Override Cookie
    const cookieStore = await cookies()
    const selectedBranch = cookieStore.get('selectedBranch')?.value

    if (isAdmin && selectedBranch && selectedBranch !== 'All') {
        // @ts-ignore
        query = query.eq('Branch_ID', selectedBranch)
    } else if (branchId && !isAdmin) {
        // @ts-ignore
        query = query.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { total: 0, active: 0, onJob: 0 }
    }

    const { data, error } = await query
    
    if (error) {
      return { total: 0, active: 0, onJob: 0 }
    }
    
    const total = data?.length || 0
    // Since we don't have Active_Status in schema, approximate
    const active = total
    const onJob = Math.floor(total * 0.3) // Approximate 30% on job
    
    return { total, active, onJob }
  } catch {
    return { total: 0, active: 0, onJob: 0 }
  }
}

// คำนวณคะแนนคนขับ
export async function getDriverScore(driverId: string) {
  try {
    const supabase = await createClient()
    
    // 1. Get Job Stats
    const { data: jobs, error } = await supabase
      .from('Jobs_Main')
      .select('Job_Status, Plan_Date')
      .eq('Driver_ID', driverId)
      // Limit to last 30 days for relevance
      .gte('Plan_Date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (error || !jobs) return { totalScore: 0, onTimeScore: 0, safetyScore: 0, acceptanceScore: 0 }

    const totalJobs = jobs.length
    if (totalJobs === 0) return { totalScore: 100, onTimeScore: 100, safetyScore: 100, acceptanceScore: 100 } // New driver starts at 100?

    // 2. Calculate Metrics
    
    // Acceptance Rate: (Total - Cancelled) / Total
    const cancelled = jobs.filter(j => j.Job_Status === 'Cancelled').length
    const acceptanceRate = ((totalJobs - cancelled) / totalJobs) * 100

    // On-Time Delivery: (Completed + Delivered) / (Total - Cancelled - Active)
    // Simplified: Just check success vs failure ratio of *finished* jobs
    const finishedJobs = jobs.filter(j => ['Completed', 'Delivered', 'Failed'].includes(j.Job_Status || ''))
    const successJobs = jobs.filter(j => ['Completed', 'Delivered'].includes(j.Job_Status || ''))
    
    const onTimeRate = finishedJobs.length > 0 
        ? (successJobs.length / finishedJobs.length) * 100 
        : 100

    // Safety Score: Placeholder (Assume 100% until Vehicle Check DB is ready)
    const safetyRate = 100

    // Weighted Score
    // On-Time: 40%, Safety: 30%, Acceptance: 30%
    const totalScore = (onTimeRate * 0.4) + (safetyRate * 0.3) + (acceptanceRate * 0.3)

    return {
        totalScore: Math.round(totalScore),
        onTimeScore: Math.round(onTimeRate),
        safetyScore: Math.round(safetyRate),
        acceptanceScore: Math.round(acceptanceRate)
    }

  } catch (e) {
    console.error('Exception calculating driver score:', e)
    return { totalScore: 0, onTimeScore: 0, safetyScore: 0, acceptanceScore: 0 }
  }
}
