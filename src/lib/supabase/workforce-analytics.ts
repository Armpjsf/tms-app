"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'
import { cookies } from 'next/headers'
import { getDriverLeaderboard } from './analytics'

export type WorkforceAnalytics = {
  kpis: {
    totalBox: number
    activeToday: number
    licenseExpiring: number
    licenseExpired: number
  }
  topPerformers: {
    name: string
    revenue: number
    jobCount: number
    successRate: number
  }[]
  driversWithIssues: {
    id: string
    name: string
    issue: string // 'License Expired', 'License Expiring Soon', 'Medical Expired'
    daysAuth: number // days until/since expiry
  }[]
}

export async function getWorkforceAnalytics(
  startDate?: string,
  endDate?: string,
  branchId?: string
): Promise<WorkforceAnalytics> {
  const supabase = await createClient()
  const userBranchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()
  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get('selectedBranch')?.value

  // Determine effective branch ID
  let effectiveBranchId = branchId
  if (!effectiveBranchId) {
    if (isAdmin && selectedBranch && selectedBranch !== 'All') {
      effectiveBranchId = selectedBranch
    } else if (!isAdmin) {
      effectiveBranchId = userBranchId || undefined
    }
  }

  // 1. Fetch Drivers List for Status & Compliance
  let driverQuery = supabase
    .from('Master_Drivers')
    .select('Driver_ID, Driver_Name, Active_Status, License_Expiry')
  
  if (effectiveBranchId) driverQuery = driverQuery.eq('Branch_ID', effectiveBranchId)
  
  const { data: drivers } = await driverQuery
  const allDrivers = drivers || []
  
  // KPI: Total Drivers
  const totalBox = allDrivers.length // Assuming box means headcount
  
  // KPI: Active Today (Drivers with non-cancelled jobs today)
  const today = new Date().toISOString().split('T')[0]
  let activeQuery = supabase
    .from('Jobs_Main')
    .select('Driver_ID', { count: 'exact', head: true })
    .eq('Plan_Date', today)
    .neq('Job_Status', 'Cancelled')
    .not('Driver_ID', 'is', null) // Only assigned jobs
    
  // if (effectiveBranchId) activeQuery = activeQuery.eq('Branch_ID', effectiveBranchId) // Unused because we query again below
  
  // We need distinct driver IDs. supabase count with head true implies row count. 
  // To get distinct active drivers, we need standard select and process.
  let activeDriversCount = 0
  const { data: activeJobs } = await supabase
     .from('Jobs_Main')
     .select('Driver_ID')
     .eq('Plan_Date', today)
     .neq('Job_Status', 'Cancelled')
     .not('Driver_ID', 'is', null)
  
  if (activeJobs) {
      const uniqueDrivers = new Set(activeJobs.map(j => j.Driver_ID))
      activeDriversCount = uniqueDrivers.size
  }
  
  // KPIs: License Compliance
  const now = new Date()
  
  let licenseExpiring = 0
  let licenseExpired = 0
  const driversWithIssues: WorkforceAnalytics['driversWithIssues'] = []
  
  for (const d of allDrivers) {
      if (!d.License_Expiry) continue
      const expiry = new Date(d.License_Expiry)
      const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
      
      if (daysUntil < 0) {
          licenseExpired++
          driversWithIssues.push({
              id: d.Driver_ID,
              name: d.Driver_Name || 'Unknown',
              issue: 'ใบขับขี่หมดอายุ',
              daysAuth: Math.abs(daysUntil)
          })
      } else if (daysUntil <= 30) {
          licenseExpiring++
          driversWithIssues.push({
              id: d.Driver_ID,
              name: d.Driver_Name || 'Unknown',
              issue: 'ใบขับขี่ใกล้หมดอายุ',
              daysAuth: daysUntil
          })
      }
  }
  
  // Sort issues by urgency (expired first, then expiring soonest)
  driversWithIssues.sort((a, b) => {
      if (a.issue === 'ใบขับขี่หมดอายุ' && b.issue !== 'ใบขับขี่หมดอายุ') return -1
      if (b.issue === 'ใบขับขี่หมดอายุ' && a.issue !== 'ใบขับขี่หมดอายุ') return 1
      return a.daysAuth - b.daysAuth // specific logic might vary but keep simple
  })
  
  // 2. Fetch Top Performers using existing logic
  // We specifically want Revenue and Job Count
  const leaderboard = await getDriverLeaderboard(startDate, endDate, effectiveBranchId)
  
  const topPerformers = leaderboard.map(d => ({
      name: d.name,
      revenue: d.revenue,
      jobCount: d.completedJobs, // Using completed jobs as primary metric
      successRate: d.successRate
  })).slice(0, 5)

  return {
    kpis: {
        totalBox,
        activeToday: activeDriversCount,
        licenseExpiring,
        licenseExpired
    },
    topPerformers,
    driversWithIssues: driversWithIssues.slice(0, 10)
  }
}
