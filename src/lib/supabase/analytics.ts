"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin, getCustomerId } from "@/lib/permissions"
import { Job } from "./jobs"

type FinancialJob = {
    Price_Cust_Total: number;
    Cost_Driver_Total: number;
    Price_Cust_Extra?: number | null;
    Cost_Driver_Extra?: number | null;
}

// Date helpers to avoid extra dependencies
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
const differenceInDays = (d1: Date, d2: Date) => Math.floor(Math.abs(d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000))

// Safety helper for ISO date strings - uses local time to avoid UTC shifts
const formatDateSafe = (dateInput: string | Date | null | undefined) => {
    try {
        if (!dateInput) return null
        const d = new Date(dateInput)
        if (isNaN(d.getTime())) return null
        
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    } catch {
        return null
    }
}

// Helper to get vehicle plates for a branch
async function getBranchPlates(branchId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('master_vehicles')
        .select('vehicle_plate')
        .eq('branch_id', branchId)
    return data?.map(v => v.vehicle_plate) || []
}

// 1. Financial Stats
export async function getFinancialStats(startDate?: string, endDate?: string, branchId?: string) {
  const supabase = await createClient()
  const customerId = await getCustomerId()
  
  // Default to current month if no date provided
  const now = new Date()
  const firstDay = formatDateSafe(startDate) || formatDateSafe(new Date(now.getFullYear(), now.getMonth(), 1)) || ""
  const lastDay = formatDateSafe(endDate) || formatDateSafe(new Date(now.getFullYear(), now.getMonth() + 1, 0)) || ""

  // Determine effective branch
  const userBranchId = await getUserBranchId()
  const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
  const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

  // 1.1 Revenue & Driver Cost from Jobs
  // Revenue statuses: We include Completed, Delivered, Finished, and Closed
  const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']
  
  let jobsQuery = supabase
    .from('Jobs_Main')
    .select('Price_Cust_Total, Cost_Driver_Total, Price_Cust_Extra, Cost_Driver_Extra')
    .gte('Plan_Date', firstDay)
    .lte('Plan_Date', lastDay)
    .in('Job_Status', revenueStatuses)

  if (customerId) {
      jobsQuery = jobsQuery.eq('Customer_ID', customerId)
  } else if (effectiveBranchId) {
      jobsQuery = jobsQuery.eq('Branch_ID', effectiveBranchId)
  }

  const { data: jobs } = await jobsQuery as { data: FinancialJob[] | null }

  const revenue: number = (jobs || []).reduce((sum: number, job: FinancialJob) => sum + (Number(job.Price_Cust_Total) || 0), 0)
  
  // If customer, they only see Revenue, not Internal Costs
  if (customerId) {
      return {
          revenue,
          netProfit: 0, 
          fuelCost: 0,
          maintenanceCost: 0,
          secondaryCosts: 0
      }
  }

  const driverCost: number = (jobs || []).reduce((sum: number, job: FinancialJob) => sum + (Number(job.Cost_Driver_Total) || 0), 0)
  const secondaryCosts: number = (jobs || []).reduce((sum: number, job: FinancialJob) => sum + (Number(job.Price_Cust_Extra) || 0) + (Number(job.Cost_Driver_Extra) || 0), 0)

  // For Fuel and Maintenance, we need vehicle plates if branch filtering is active
  let activePlates: string[] = []
  if (effectiveBranchId) {
      activePlates = await getBranchPlates(effectiveBranchId)
  }

  // 1.2 Fuel Cost
  let fuelQuery = supabase
    .from('Fuel_Logs')
    .select('Price_Total')
    .gte('Date_Time', `${firstDay}T00:00:00`)
    .lte('Date_Time', `${lastDay}T23:59:59`)

  if (effectiveBranchId) {
      if (activePlates.length > 0) {
        fuelQuery = fuelQuery.in('Vehicle_Plate', activePlates)
      } else {
        fuelQuery = fuelQuery.in('Vehicle_Plate', ['NO_MATCH']) 
      }
  }

  const { data: fuel } = await fuelQuery
  const fuelCost = fuel?.reduce((sum, log) => sum + (log.Price_Total || 0), 0) || 0

  // 1.3 Maintenance Cost
  let maintenanceQuery = supabase
    .from('Repair_Tickets')
    .select('Cost_Total')
    .gte('Date_Report', `${firstDay}T00:00:00`)
    .lte('Date_Report', `${lastDay}T23:59:59`)
    .neq('Status', 'Cancelled')

  if (effectiveBranchId) {
       if (activePlates.length > 0) {
        maintenanceQuery = maintenanceQuery.in('Vehicle_Plate', activePlates)
      } else {
        maintenanceQuery = maintenanceQuery.in('Vehicle_Plate', ['NO_MATCH'])
      }
  }

  const { data: maintenance } = await maintenanceQuery
  const maintenanceCost = maintenance?.reduce((sum, ticket) => sum + (ticket.Cost_Total || 0), 0) || 0

  const totalCost = driverCost + fuelCost + maintenanceCost + secondaryCosts
  const netProfit = revenue - totalCost
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  return {
    revenue,
    cost: {
      total: totalCost,
      driver: driverCost,
      fuel: fuelCost,
      maintenance: maintenanceCost,
      secondary: secondaryCosts
    },
    netProfit,
    profitMargin
  }
}

// 2. Revenue Trend (Daily for the selected range)
export async function getRevenueTrend(startDate?: string, endDate?: string, branchId?: string) {
  const supabase = await createClient()
  
  // Default to last 30 days if no range provided
  const now = new Date()
  let start = formatDateSafe(startDate)
  const end = formatDateSafe(endDate)

  if (!start) {
      start = formatDateSafe(subDays(now, 30))
  }

  // Determine effective branch
  const userBranchId = await getUserBranchId()
  const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
  const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

  const customerId = await getCustomerId()

  // Revenue statuses consistent with getFinancialStats
  const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']

  let query = supabase
    .from('Jobs_Main')
    .select('Plan_Date, Price_Cust_Total, Cost_Driver_Total, Actual_Delivery_Time')
    .in('Job_Status', revenueStatuses)
    .order('Plan_Date', { ascending: true })

  if (customerId) {
      query = query.eq('Customer_ID', customerId)
  } else if (effectiveBranchId) {
      query = query.eq('Branch_ID', effectiveBranchId)
  }

  if (start) query = query.gte('Plan_Date', start)
  if (end) query = query.lte('Plan_Date', end)

  const { data: jobs } = await query

  // Aggregate by date
  const dailyStats: Record<string, { date: string, revenue: number, cost: number, jobCount: number, onTimeCount: number }> = {}

  jobs?.forEach(job => {
    const date = job.Plan_Date as string
    if (!dailyStats[date]) {
        dailyStats[date] = { date, revenue: 0, cost: 0, jobCount: 0, onTimeCount: 0 }
    }
    dailyStats[date].revenue += (job.Price_Cust_Total || 0)
    dailyStats[date].cost += (job.Cost_Driver_Total || 0)
    dailyStats[date].jobCount += 1
    
    // On-time check: Is actual completion on the same day as Plan_Date?
    if (job.Actual_Delivery_Time) {
        const actualDate = job.Actual_Delivery_Time.split('T')[0]
        if (actualDate === date) {
            dailyStats[date].onTimeCount += 1
        }
    } else {
        // Fallback for older records: assume on-time if completed
        dailyStats[date].onTimeCount += 1
    }
  })
  
  return Object.values(dailyStats)
}

// 3. Customer Performance (Top 5)
export async function getTopCustomers(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createClient()
    
    // Determine effective branch
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    const customerId = await getCustomerId()

    // Revenue statuses consistent with getFinancialStats
    const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']

    let query = supabase
        .from('Jobs_Main')
        .select('Customer_Name, Price_Cust_Total')
        .in('Job_Status', revenueStatuses)
    
    if (customerId) {
        query = query.eq('Customer_ID', customerId)
    } else if (effectiveBranchId) {
        query = query.eq('Branch_ID', effectiveBranchId)
    }

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)

    const { data: jobs } = await query

    const customerStats: Record<string, { name: string, revenue: number, jobCount: number }> = {}

    jobs?.forEach(job => {
        const name = job.Customer_Name || 'Unknown'
        if (!customerStats[name]) {
            customerStats[name] = { name, revenue: 0, jobCount: 0 }
        }
        customerStats[name].revenue += (job.Price_Cust_Total || 0)
        customerStats[name].jobCount += 1
    })

    return Object.values(customerStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
}

// 4. Operational Stats
export async function getOperationalStats(branchId?: string, startDate?: string, endDate?: string) {
    const supabase = await createClient()

    // Determine effective branch
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    const now = new Date()
    const firstDay = formatDateSafe(startDate) || formatDateSafe(new Date(now.getFullYear(), now.getMonth(), 1)) || ""
    const lastDay = formatDateSafe(endDate) || formatDateSafe(new Date(now.getFullYear(), now.getMonth() + 1, 0)) || ""

    // 4.1 Fleet Utilization (Active vs Total Vehicles)
    let vehicleQuery = supabase
        .from('master_vehicles') 
        .select('*', { count: 'exact', head: true })
    
    if (effectiveBranchId) {
        vehicleQuery = vehicleQuery.eq('branch_id', effectiveBranchId)
    }

    const { count: totalVehicles } = await vehicleQuery

    // KPI: Active in period (Drivers with non-cancelled jobs in range for the specific branch)
    let activeJobsQuery = supabase
        .from('Jobs_Main')
        .select('Vehicle_Plate')
        .gte('Plan_Date', firstDay)
        .lte('Plan_Date', lastDay)
        .not('Job_Status', 'eq', 'Cancelled') // Exclude cancelled jobs
        .not('Vehicle_Plate', 'is', null)

    if (effectiveBranchId) {
        activeJobsQuery = activeJobsQuery.eq('Branch_ID', effectiveBranchId)
    }

    const { data: activeJobs } = await activeJobsQuery

    const uniqueActiveVehicles = new Set(activeJobs?.map(j => j.Vehicle_Plate)).size

    // 4.2 Fleet Health (GPS Connectivity in last 2 hours)
    // We already fetch fleet health with a dedicated helper if needed, 
    // but we can compute it here for a single operational snapshot.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    let gpsQuery = supabase
        .from('Fleet_GPS')
        .select('Vehicle_Plate', { count: 'exact', head: true })
        .gte('Last_Update', twoHoursAgo)
    
    // Branch filtering for GPS requires plate lookup
    if (effectiveBranchId) {
        const branchPlates = await getBranchPlates(effectiveBranchId)
        if (branchPlates.length > 0) gpsQuery = gpsQuery.in('Vehicle_Plate', branchPlates)
        else gpsQuery = gpsQuery.in('Vehicle_Plate', ['NONE'])
    }
    const { count: healthyVehicles } = await gpsQuery

    // 4.3 On-Time Delivery
    let jobStatsQuery = supabase
        .from('Jobs_Main')
        .select('Job_Status')
        .gte('Plan_Date', firstDay)
        .lte('Plan_Date', lastDay)
    
    if (effectiveBranchId) {
        jobStatsQuery = jobStatsQuery.eq('Branch_ID', effectiveBranchId)
    }
        
    const { data: jobStats } = await jobStatsQuery
        
    const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']
    const totalJobs = jobStats?.length || 0
    const completedJobs = jobStats?.filter(j => revenueStatuses.includes(j.Job_Status || '')).length || 0
    const onTimeDelivery = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

    // 4.4 Fuel Efficiency (km/L)
    let activePlates: string[] = []
    if (effectiveBranchId) {
        activePlates = await getBranchPlates(effectiveBranchId)
    }

    let fuelLogsQuery = supabase
        .from('Fuel_Logs')
        .select('Liters, Odometer, Vehicle_Plate')
        .gte('Date_Time', firstDay)
        .lte('Date_Time', lastDay + 'T23:59:59')
        .order('Date_Time', { ascending: true })

    if (effectiveBranchId) {
        if (activePlates.length > 0) {
            fuelLogsQuery = fuelLogsQuery.in('Vehicle_Plate', activePlates)
        } else {
             fuelLogsQuery = fuelLogsQuery.in('Vehicle_Plate', ['NO_MATCH'])
        }
    }
    
    const { data: fuelLogs } = await fuelLogsQuery

    let totalDistanceApprox = 0
    let totalFuelUsed = 0

    if (fuelLogs && fuelLogs.length > 0) {
        const vehicleLogs: Record<string, { Odometer: number, Liters: number }[]> = {}
        fuelLogs.forEach(log => {
            if (log.Vehicle_Plate && log.Odometer && log.Liters) {
                if (!vehicleLogs[log.Vehicle_Plate]) vehicleLogs[log.Vehicle_Plate] = []
                vehicleLogs[log.Vehicle_Plate].push(log)
            }
        })

        Object.values(vehicleLogs).forEach(logs => {
            if (logs.length >= 2) {
                const minOdo = logs[0].Odometer
                const maxOdo = logs[logs.length - 1].Odometer
                totalDistanceApprox += (maxOdo - minOdo)
                for (let i = 1; i < logs.length; i++) totalFuelUsed += logs[i].Liters
            }
        })
    }

    const fuelEfficiency = totalFuelUsed > 0 ? (totalDistanceApprox / totalFuelUsed) : 0

    return {
        fleet: {
            active: uniqueActiveVehicles || 0,
            total: totalVehicles || 0,
            utilization: totalVehicles ? (uniqueActiveVehicles / totalVehicles) * 100 : 0,
            onTimeDelivery,
            fuelEfficiency,
            health: totalVehicles ? Math.min(100, (healthyVehicles || 0) / totalVehicles * 100) : 0
        }
    }
}

// 5. Job Status Distribution
export async function getJobStatusDistribution(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createClient()
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    let query = supabase.from('Jobs_Main').select('Job_Status')

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)
    if (effectiveBranchId) query = query.eq('Branch_ID', effectiveBranchId)

    const { data } = await query

    const distribution: Record<string, number> = {
        'Draft': 0,
        'Pending': 0,
        'Confirmed': 0,
        'In Progress': 0,
        'Delivered': 0,
        'Completed': 0,
        'Finished': 0,
        'Closed': 0,
        'Cancelled': 0
    }

    data?.forEach(job => {
        const status = job.Job_Status || 'Draft'
        if (distribution.hasOwnProperty(status)) {
            distribution[status]++
        } else {
            distribution[status] = (distribution[status] || 0) + 1
        }
    })

    return Object.entries(distribution).map(([name, value]) => ({ name, value }))
}

// 6. Branch Performance Comparison (Super Admin Only)
export async function getBranchPerformance(startDate?: string, endDate?: string) {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return []

    const supabase = await createClient()

    // Get all branches - Standardized to PascalCase Master_Branches
    const { data: branches } = await supabase.from('Master_Branches').select('Branch_ID, Branch_Name')
    if (!branches) return []

    // Revenue statuses consistent with getFinancialStats
    const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']

    // Fetch jobs for the range
    let query = supabase
        .from('Jobs_Main')
        .select('Branch_ID, Price_Cust_Total, Cost_Driver_Total, Job_Status')
        .in('Job_Status', revenueStatuses)

    // Use YYYY-MM-DD format for Plan_Date filtering
    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)

    const { data: jobs } = await query

    const performance = branches.map(branch => {
        const branchJobs = jobs?.filter(j => j.Branch_ID === branch.Branch_ID) || []
        const revenue = branchJobs.reduce((sum, j) => sum + (j.Price_Cust_Total || 0), 0)
        const driverCost = branchJobs.reduce((sum, j) => sum + (j.Cost_Driver_Total || 0), 0)
        
        return {
            branchId: branch.Branch_ID,
            branchName: branch.Branch_Name,
            revenue,
            jobsCount: branchJobs.length,
            profit: revenue - driverCost // Simple profit (Revenue - Driver Cost)
        }
    })

    return performance.sort((a, b) => b.revenue - a.revenue)
}

// 7. Subcontractor vs Internal Fleet Performance
export async function getSubcontractorPerformance(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createClient()
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    // Revenue statuses consistent with getFinancialStats
    const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    let query = supabase
        .from('Jobs_Main')
        .select('Price_Cust_Total, Cost_Driver_Total, Sub_ID')
        .in('Job_Status', revenueStatuses)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)
    if (effectiveBranchId) query = query.eq('Branch_ID', effectiveBranchId)

    const { data: jobs } = await query

    const stats = {
        internal: { revenue: 0, cost: 0, count: 0 },
        subcontractor: { revenue: 0, cost: 0, count: 0 }
    }

    jobs?.forEach(job => {
        const isSub = !!job.Sub_ID
        const target = isSub ? stats.subcontractor : stats.internal
        target.revenue += (job.Price_Cust_Total || 0)
        target.cost += (job.Cost_Driver_Total || 0)
        target.count++
    })

    return [
        { name: 'รถบริษัท (Internal)', ...stats.internal },
        { name: 'รถซับ (Subcontractor)', ...stats.subcontractor }
    ]
}

// 8. Growth & Multi-period Comparison
export async function getExecutiveKPIs(startDate?: string, endDate?: string, branchId?: string) {
    const currentStart = startDate ? new Date(startDate) : subDays(new Date(), 30)
    const currentEnd = endDate ? new Date(endDate) : new Date()
    
    // Calculate duration to find the previous period
    const duration = differenceInDays(currentEnd, currentStart)
    const prevStart = subDays(currentStart, duration + 1)
    const prevEnd = subDays(currentStart, 1)

    const [currentStats, prevStats] = await Promise.all([
        getFinancialStats(formatDateSafe(currentStart)!, formatDateSafe(currentEnd)!, branchId),
        getFinancialStats(formatDateSafe(prevStart)!, formatDateSafe(prevEnd)!, branchId)
    ])

    const calculateGrowth = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0
        return ((curr - prev) / prev) * 100
    }

    // Define targets (In a real app, these would come from DB/Settings)
    // Monthly Targets
    const targets = {
        revenue: 250000, 
        profitMargin: 15,
        onTimeDelivery: 95
    }

    return {
        revenue: {
            current: currentStats.revenue,
            previous: prevStats.revenue,
            growth: calculateGrowth(currentStats.revenue, prevStats.revenue),
            target: targets.revenue,
            attainment: (currentStats.revenue / targets.revenue) * 100
        },
        profit: {
            current: currentStats.netProfit,
            previous: prevStats.netProfit,
            growth: calculateGrowth(currentStats.netProfit, prevStats.netProfit),
        },
        margin: {
            current: currentStats.profitMargin,
            previous: prevStats.profitMargin,
            growth: currentStats.profitMargin - prevStats.profitMargin, // Percentage point difference
            target: targets.profitMargin
        }
    }
}
// 9. Route Efficiency (Revenue vs Cost per Route)
export async function getRouteEfficiency(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createClient()
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    // Revenue statuses consistent with getFinancialStats
    const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    let query = supabase
        .from('Jobs_Main')
        .select('Route_Name, Price_Cust_Total, Cost_Driver_Total')
        .in('Job_Status', revenueStatuses)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)
    if (effectiveBranchId) query = query.eq('Branch_ID', effectiveBranchId)

    const { data: jobs } = await query

    const routeStats: Record<string, { route: string, revenue: number, cost: number, count: number }> = {}

    jobs?.forEach(job => {
        const route = job.Route_Name || 'Unknown Route'
        if (!routeStats[route]) {
            routeStats[route] = { route, revenue: 0, cost: 0, count: 0 }
        }
        routeStats[route].revenue += (job.Price_Cust_Total || 0)
        routeStats[route].cost += (job.Cost_Driver_Total || 0)
        routeStats[route].count++
    })

    return Object.values(routeStats)
        .map(r => ({ ...r, margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
}

// 10. Driver Leaderboard (Efficiency & Volume)
export async function getDriverLeaderboard(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createClient()
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    let query = supabase
        .from('Jobs_Main')
        .select('Driver_Name, Price_Cust_Total, Cost_Driver_Total, Job_Status, Plan_Date, Actual_Delivery_Time')
        .not('Driver_Name', 'is', null)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)
    if (effectiveBranchId) query = query.eq('Branch_ID', effectiveBranchId)

    const { data: jobs } = await query

    const driverStats: Record<string, { 
        name: string, 
        revenue: number, 
        completedJobs: number, 
        totalJobs: number,
        onTimeJobs: number,
        lateJobs: number
    }> = {}

    jobs?.forEach(job => {
        const name = job.Driver_Name!
        if (!driverStats[name]) {
            driverStats[name] = { name, revenue: 0, completedJobs: 0, totalJobs: 0, onTimeJobs: 0, lateJobs: 0 }
        }
        
        // Revenue statuses consistent with getFinancialStats
        const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']
        const isCompleted = revenueStatuses.includes(job.Job_Status || '')
        if (isCompleted) {
            driverStats[name].revenue += (job.Price_Cust_Total || 0)
            driverStats[name].completedJobs++
            
            // On-time check
            if (job.Actual_Delivery_Time && job.Plan_Date) {
                const actualDate = job.Actual_Delivery_Time.split('T')[0]
                if (actualDate === job.Plan_Date) {
                    driverStats[name].onTimeJobs++
                } else {
                    driverStats[name].lateJobs++
                }
            } else {
                // Fallback: Default to on-time for historical
                driverStats[name].onTimeJobs++
            }
        }
        driverStats[name].totalJobs++
    })

    return Object.values(driverStats)
        .map(d => ({ 
            ...d, 
            successRate: d.totalJobs > 0 ? (d.completedJobs / d.totalJobs) * 100 : 0,
            onTimeRate: d.completedJobs > 0 ? (d.onTimeJobs / d.completedJobs) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
}

// 10.1 Detailed Driver Analytics (Leaderboard & Export)
export async function getDetailedDriverAnalytics(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createClient()
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    // Parallel fetch drivers and jobs
    const [driversResult, jobsResult] = await Promise.all([
        supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Vehicle_Plate, Vehicle_Type, Branch_ID, Active_Status'),
        supabase.from('Jobs_Main')
            .select('Driver_ID, Job_Status, Plan_Date, Actual_Delivery_Time, Cost_Driver_Total, Rating, Est_Distance_KM, Weight_Kg')
            .gte('Plan_Date', sDate || '')
            .lte('Plan_Date', eDate || '')
            .not('Driver_ID', 'is', null)
    ])

    if (jobsResult.error) return []

    const driverStats: Record<string, {
        driverId: string
        name: string
        plate: string
        type: string
        totalJobs: number
        completedJobs: number
        cancelledJobs: number
        onTimeJobs: number
        totalEarnings: number
        totalDistance: number
        totalWeight: number
        ratings: number[]
        avgRating: number
    }> = {}

    // Initialize with all active drivers in branch
    driversResult.data?.forEach(d => {
        if (effectiveBranchId && d.Branch_ID !== effectiveBranchId) return
        
        driverStats[d.Driver_ID] = {
            driverId: d.Driver_ID,
            name: d.Driver_Name || 'N/A',
            plate: d.Vehicle_Plate || '-',
            type: d.Vehicle_Type || '-',
            totalJobs: 0,
            completedJobs: 0,
            cancelledJobs: 0,
            onTimeJobs: 0,
            totalEarnings: 0,
            totalDistance: 0,
            totalWeight: 0,
            ratings: [],
            avgRating: 0
        }
    })

    // Aggregate job data
    jobsResult.data?.forEach(job => {
        const id = job.Driver_ID!
        if (!driverStats[id]) return // Driver might be from another branch or inactive

        const stats = driverStats[id]
        stats.totalJobs++
        
        if (job.Job_Status === 'Cancelled') {
            stats.cancelledJobs++
            return
        }

        const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']
        const isCompleted = revenueStatuses.includes(job.Job_Status || '')
        
        if (isCompleted) {
            stats.completedJobs++
            stats.totalEarnings += (job.Cost_Driver_Total || 0)
            stats.totalDistance += (job.Est_Distance_KM || 0)
            stats.totalWeight += (job.Weight_Kg || 0)
            
            if (job.Rating) stats.ratings.push(job.Rating)

            // On-time check
            if (job.Actual_Delivery_Time && job.Plan_Date) {
                const actualDate = job.Actual_Delivery_Time.split('T')[0]
                if (actualDate === job.Plan_Date) {
                    stats.onTimeJobs++
                }
            } else {
                stats.onTimeJobs++ // Fallback
            }
        }
    })

    // Calculate final metrics and rank
    return Object.values(driverStats).map(d => {
        const completionRate = d.totalJobs > 0 ? (d.completedJobs / (d.totalJobs - d.cancelledJobs)) * 100 : 0
        const onTimeRate = d.completedJobs > 0 ? (d.onTimeJobs / d.completedJobs) * 100 : 0
        const avgRating = d.ratings.length > 0 ? d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length : 0
        
        // Gamification Score (matching Mobile logic)
        const points = d.completedJobs * 10
        let rank = 'Bronze'
        if (points >= 1200) rank = 'Platinum'
        else if (points >= 700) rank = 'Gold'
        else if (points >= 300) rank = 'Silver'

        return {
            ...d,
            completionRate,
            onTimeRate,
            avgRating,
            points,
            rank
        }
    }).sort((a, b) => b.points - a.points)
}

// 11. Regional / Branch Deep-Dive (Comparison with detailed metrics)
export async function getRegionalDeepDive(startDate?: string, endDate?: string) {
    const performance = await getBranchPerformance(startDate, endDate)
    
    // Enrich with growth if possible (Comparing current period vs previous)
    const cStart = formatDateSafe(startDate) || formatDateSafe(subDays(new Date(), 30))!
    const cEnd = formatDateSafe(endDate) || formatDateSafe(new Date())!
    const currentStart = new Date(cStart)
    const currentEnd = new Date(cEnd)

    const duration = differenceInDays(currentEnd, currentStart)
    const prevStart = subDays(currentStart, duration + 1)
    const prevEnd = subDays(currentStart, 1)

    const prevPerformance = await getBranchPerformance(formatDateSafe(prevStart)!, formatDateSafe(prevEnd)!)

    return performance.map(curr => {
        const prev = prevPerformance.find(p => p.branchId === curr.branchId)
        const revenueGrowth = prev && prev.revenue > 0 ? ((curr.revenue - prev.revenue) / prev.revenue) * 100 : 0
        
        return {
            ...curr,
            revenueGrowth,
            previousRevenue: prev?.revenue || 0
        }
    })
}
// 12. Vehicle Profitability Breakdown
export async function getVehicleProfitability(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createClient()
    
    // Default to current month
    const now = new Date()
    const firstDay = formatDateSafe(startDate) || formatDateSafe(new Date(now.getFullYear(), now.getMonth(), 1)) || ""
    const lastDay = formatDateSafe(endDate) || formatDateSafe(new Date(now.getFullYear(), now.getMonth() + 1, 0)) || ""

    // Determine effective branch
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    // Revenue statuses consistent with getFinancialStats
    const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']

    // 1. Get Revenue & Driver Cost per Vehicle
    let jobsQuery = supabase
        .from('Jobs_Main')
        .select('Vehicle_Plate, Price_Cust_Total, Cost_Driver_Total')
        .gte('Plan_Date', firstDay)
        .lte('Plan_Date', lastDay)
        .in('Job_Status', revenueStatuses)
        .not('Vehicle_Plate', 'is', null)

    if (effectiveBranchId) {
        jobsQuery = jobsQuery.eq('Branch_ID', effectiveBranchId)
    }

    const { data: jobs } = await jobsQuery

    // 2. Get Fuel Cost per Vehicle
    // Consistent with getFinancialStats: no status filter for fuel yet.
    const fuelQuery = supabase
        .from('Fuel_Logs')
        .select('Vehicle_Plate, Price_Total')
        .gte('Date_Time', `${firstDay}T00:00:00`)
        .lte('Date_Time', `${lastDay}T23:59:59`)

    if (effectiveBranchId) {
        const branchPlates = await getBranchPlates(effectiveBranchId)
        if (branchPlates.length > 0) fuelQuery.in('Vehicle_Plate', branchPlates)
        else fuelQuery.in('Vehicle_Plate', ['NO_MATCH'])
    }

    const { data: fuel } = await fuelQuery

    // 3. Get Maintenance Cost per Vehicle
    // Consistent with getFinancialStats: exclude cancelled
    const maintenanceQuery = supabase
        .from('Repair_Tickets')
        .select('Vehicle_Plate, Cost_Total')
        .gte('Date_Report', `${firstDay}T00:00:00`)
        .lte('Date_Report', `${lastDay}T23:59:59`)
        .neq('Status', 'Cancelled')

    if (effectiveBranchId) {
        const branchPlates = await getBranchPlates(effectiveBranchId)
        if (branchPlates.length > 0) maintenanceQuery.in('Vehicle_Plate', branchPlates)
        else maintenanceQuery.in('Vehicle_Plate', ['NO_MATCH'])
    }

    const { data: maintenance } = await maintenanceQuery

    const stats: Record<string, { plate: string, revenue: number, driverCost: number, fuelCost: number, maintenanceCost: number, totalCost: number, netProfit: number }> = {}

    jobs?.forEach(job => {
        const plate = job.Vehicle_Plate!
        if (!stats[plate]) {
            stats[plate] = { plate, revenue: 0, driverCost: 0, fuelCost: 0, maintenanceCost: 0, totalCost: 0, netProfit: 0 }
        }
        stats[plate].revenue += (job.Price_Cust_Total || 0)
        stats[plate].driverCost += (job.Cost_Driver_Total || 0)
    })

    fuel?.forEach(f => {
        const plate = f.Vehicle_Plate!
        if (!stats[plate]) {
            stats[plate] = { plate, revenue: 0, driverCost: 0, fuelCost: 0, maintenanceCost: 0, totalCost: 0, netProfit: 0 }
        }
        stats[plate].fuelCost += (f.Price_Total || 0)
    })

    maintenance?.forEach(m => {
        const plate = m.Vehicle_Plate!
        if (!stats[plate]) {
            stats[plate] = { plate, revenue: 0, driverCost: 0, fuelCost: 0, maintenanceCost: 0, totalCost: 0, netProfit: 0 }
        }
        stats[plate].maintenanceCost += (m.Cost_Total || 0)
    })

    return Object.values(stats).map(s => {
        const totalCost = s.driverCost + s.fuelCost + s.maintenanceCost
        return {
            ...s,
            totalCost,
            netProfit: s.revenue - totalCost
        }
    }).sort((a, b) => b.netProfit - a.netProfit)
}

// 13. Provincial Mileage Stats (New for Dashboard)
export async function getProvincialMileageStats(branchId?: string) {
    try {
        const supabase = await createClient()
        const userBranchId = await getUserBranchId()
        const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
        const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

        // Revenue-generating statuses consistent with getFinancialStats
        const revenueStatuses = ['Completed', 'Delivered', 'Finished', 'Closed']

        let query = supabase
            .from('Jobs_Main')
            .select('Dest_Location, Zone, Weight_Kg, Distance_Km')
            .in('Job_Status', revenueStatuses)
        
        if (effectiveBranchId) {
            query = query.eq('Branch_ID', effectiveBranchId)
        }

        const { data, error } = await query.limit(500)
        if (error) return []

        const stats: Record<string, { name: string, range: string, percentage: number, color: string, rawVal: number, totalKm: number }> = {}
        const colors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"]
        
        let totalVal = 0
        data?.forEach(job => {
            let geoLabel = (job as { Zone?: string }).Zone || 'ไม่ระบุโซน'
            if (geoLabel.includes('BKK') || geoLabel.includes('กรุงเทพ')) geoLabel = 'กรุงเทพมหานคร'
            
            if (!stats[geoLabel]) {
                stats[geoLabel] = { name: geoLabel, range: "0 KM", percentage: 0, color: colors[Object.keys(stats).length % colors.length], rawVal: 0, totalKm: 0 }
            }
            stats[geoLabel].rawVal += 1
            stats[geoLabel].totalKm += (job.Distance_Km || 0)
            totalVal += 1
        })

        const sorted = Object.values(stats)
            .sort((a, b) => b.rawVal - a.rawVal)
            .slice(0, 5)

        return sorted.map(s => ({
            ...s,
            percentage: totalVal > 0 ? Math.round((s.rawVal / totalVal) * 100) : 0,
            range: `${s.totalKm.toLocaleString()} KM`
        }))
    } catch {
        return []
    }
}

// 14. Fleet Compliance Metrics (New for Dashboard)
export async function getFleetComplianceMetrics(branchId?: string) {
    try {
        const supabase = await createClient()
        const userBranchId = await getUserBranchId()
        const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
        const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

        let query = supabase.from('master_vehicles').select('vehicle_plate, tax_expiry, insurance_expiry, act_expiry')
        
        if (effectiveBranchId) {
            query = query.eq('branch_id', effectiveBranchId)
        }

        const { data, error } = await query
        if (error || !data) return []

        const today = new Date()
        const metrics = [
            { name: "Vehicle Registration (ภาษีรถ)", status: "valid", date: "-", daysLeft: 0, total: 0, alert: 0 },
            { name: "Vehicle Insurance (ประกันภัย)", status: "valid", date: "-", daysLeft: 0, total: 0, alert: 0 },
            { name: "Compulsory ACT (พ.ร.บ.)", status: "valid", date: "-", daysLeft: 0, total: 0, alert: 0 },
        ]

        data.forEach(v => {
            const check = (expiry: string | null, idx: number) => {
                if (!expiry) return
                const expDate = new Date(expiry)
                const diffTime = expDate.getTime() - today.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                
                if (diffDays < metrics[idx].daysLeft || metrics[idx].daysLeft === 0) {
                    metrics[idx].daysLeft = diffDays
                    metrics[idx].date = expiry
                }

                if (diffDays <= 15) metrics[idx].alert++
                else if (diffDays <= 30 && metrics[idx].status !== 'expiredSoon') metrics[idx].status = 'expiring'
                
                if (diffDays <= 0) metrics[idx].status = 'expiredSoon'
            }

            check(v.tax_expiry, 0)
            check(v.insurance_expiry, 1)
            check(v.act_expiry, 2)
        })

        return metrics.map(m => ({
            ...m,
            status: m.daysLeft <= 0 ? 'expiredSoon' : m.daysLeft <= 30 ? 'expiring' : 'valid'
        }))
    } catch {
        return []
    }
}

// 15. Fleet Health Score (New for Dashboard)
export async function getFleetHealthScore(branchId?: string) {
    try {
        const supabase = await createClient()
        const userBranchId = await getUserBranchId()
        const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
        const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

        let query = supabase.from('master_vehicles').select('active_status')
        
        if (effectiveBranchId) {
            query = query.eq('branch_id', effectiveBranchId)
        }

        const { data, error } = await query
        if (error || !data || data.length === 0) return 100

        const active = data.filter(v => v.active_status === 'Active').length
        return Math.round((active / data.length) * 100)
    } catch {
        return 100
    }
}

