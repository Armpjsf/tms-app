"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

// Type matching actual Supabase schema
export type Driver = {
  Driver_ID: string
  Driver_Name: string | null
  Role: string | null
  Mobile_No: string | null
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
  License_Expiry: string | null
  Bank_Name?: string | null
  Bank_Account_No?: string | null
  Bank_Account_Name?: string | null
  Sub_ID?: string | null
  Show_Price_Default?: boolean | null
  Branch_ID?: string | null
}

// Get all drivers from Master_Drivers table
export async function getAllDriversFromTable(): Promise<Driver[]> {
  try {
    const supabase = await createClient()
    let dbQuery = supabase.from('Master_Drivers').select('*')
    
    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data, error } = await dbQuery
    if (error) return []
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
        Password: driverData.Password,
        Active_Status: driverData.Active_Status || 'Active',
        License_Expiry: driverData.License_Expiry,
        Branch_ID: driverData.Branch_ID || await getUserBranchId()
      })
      .select()
      .single()
    
    if (error) return { success: false, error }
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
        Password: driverData.Password,
        Active_Status: driverData.Active_Status,
        License_Expiry: driverData.License_Expiry
      })
      .eq('Driver_ID', id)
      .select()
      .single()
    
    if (error) return { success: false, error }
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
    
    if (error) return { success: false, error }
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}

// ดึงรายชื่อคนขับที่ Active
export async function getActiveDrivers() {
  try {
    const supabase = await createClient()
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    let queryBuilder = supabase
      .from('Master_Drivers')
      .select('*')
      .eq('Active_Status', 'Active')
    
    if (branchId && branchId !== 'All') {
        queryBuilder = queryBuilder.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data, error } = await queryBuilder.limit(10)
    
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// Alias for planning page compatibility
export async function getAllDrivers(page?: number, limit?: number, query?: string) {
  try {
    const supabase = await createClient()
    let queryBuilder = supabase.from('Master_Drivers').select('*', { count: 'exact' })
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    if (branchId && branchId !== 'All') {
        queryBuilder = queryBuilder.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { data: [], count: 0 }
    }
    
    if (query) {
      queryBuilder = queryBuilder.or(`Driver_Name.ilike.%${query}%,Mobile_No.ilike.%${query}%,Driver_ID.ilike.%${query}%`)
    }
    
    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }
    
    const { data, error, count } = await queryBuilder
    if (error) return { data: [], count: 0 }
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}

// Get driver stats for dashboard
export async function getDriverStats() {
  try {
    const supabase = await createClient()
    let query = supabase.from('Master_Drivers').select('Driver_ID, Role')

    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    if (branchId && branchId !== 'All') {
        query = query.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { total: 0, active: 0, onJob: 0 }
    }

    const { data, error } = await query
    if (error) return { total: 0, active: 0, onJob: 0 }
    
    const total = data?.length || 0
    return { total, active: total, onJob: Math.floor(total * 0.3) }
  } catch {
    return { total: 0, active: 0, onJob: 0 }
  }
}

// คำนวณคะแนนคนขับ
export async function getDriverScore(driverId: string) {
  try {
    const supabase = await createClient()
    const { data: jobs, error } = await supabase
      .from('Jobs_Main')
      .select('Job_Status, Plan_Date')
      .eq('Driver_ID', driverId)
      .gte('Plan_Date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (error || !jobs) return { totalScore: 0, onTimeScore: 0, safetyScore: 0, acceptanceScore: 0 }

    const totalJobs = jobs.length
    if (totalJobs === 0) return { totalScore: 100, onTimeScore: 100, safetyScore: 100, acceptanceScore: 100 }

    const cancelled = jobs.filter(j => j.Job_Status === 'Cancelled').length
    const acceptanceRate = ((totalJobs - cancelled) / totalJobs) * 100
    const finishedJobs = jobs.filter(j => ['Completed', 'Delivered', 'Failed'].includes(j.Job_Status || ''))
    const successJobs = jobs.filter(j => ['Completed', 'Delivered'].includes(j.Job_Status || ''))
    const onTimeRate = finishedJobs.length > 0 ? (successJobs.length / finishedJobs.length) * 100 : 100
    const totalScore = (onTimeRate * 0.4) + (100 * 0.3) + (acceptanceRate * 0.3)

    return {
        totalScore: Math.round(totalScore),
        onTimeScore: Math.round(onTimeRate),
        safetyScore: 100,
        acceptanceScore: Math.round(acceptanceRate)
    }
  } catch {
    return { totalScore: 0, onTimeScore: 0, safetyScore: 0, acceptanceScore: 0 }
  }
}

// Get driver compliance stats
export async function getDriverComplianceStats(branchId?: string) {
    try {
        const supabase = await createClient()
        let query = supabase.from('Master_Drivers').select('License_Expiry')

        const userBranchId = await getUserBranchId()
        const isAdmin = await isSuperAdmin()
        const targetBranchId = isAdmin ? (branchId && branchId !== 'All' ? branchId : null) : userBranchId

        if (targetBranchId) {
            query = query.eq('Branch_ID', targetBranchId)
        } else if (!isAdmin && !userBranchId) {
            return { valid: 0, expiring: 0, expired: 0, missing: 0 }
        }

        const { data, error } = await query
        if (error) throw error

        const now = new Date()
        const thirtyDays = new Date()
        thirtyDays.setDate(now.getDate() + 30)

        const stats = { valid: 0, expiring: 0, expired: 0, missing: 0 }
        data?.forEach(d => {
            if (!d.License_Expiry) stats.missing++
            else {
                const expiry = new Date(d.License_Expiry)
                if (expiry < now) stats.expired++
                else if (expiry < thirtyDays) stats.expiring++
                else stats.valid++
            }
        })
        return stats
    } catch {
        return { valid: 0, expiring: 0, expired: 0, missing: 0 }
    }
}

// Get driver efficiency summary
export async function getDriverEfficiencySummary(branchId?: string) {
    try {
        const { data: drivers } = await getAllDrivers(1, 1000, '')
        const targetDrivers = branchId ? drivers.filter((d: any) => d.Branch_ID === branchId) : drivers
        
        if (!targetDrivers || targetDrivers.length === 0) return { avgSuccess: 0, avgOnTime: 0, totalDrivers: 0 }
        const scores = await Promise.all(targetDrivers.map((d: Driver) => getDriverScore(d.Driver_ID)))
        const total = targetDrivers.length
        
        return {
            avgSuccess: Math.round(scores.reduce((sum, s) => sum + s.acceptanceScore, 0) / total),
            avgOnTime: Math.round(scores.reduce((sum, s) => sum + s.onTimeScore, 0) / total),
            totalDrivers: total
        }
    } catch {
        return { avgSuccess: 0, avgOnTime: 0, totalDrivers: 0 }
    }
}
