"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

// Date helpers to avoid extra dependencies
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
const differenceInDays = (d1: Date, d2: Date) => Math.floor(Math.abs(d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000))

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
  
  // Default to current month if no date provided
  const now = new Date()
  const firstDay = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Determine effective branch
  const userBranchId = await getUserBranchId()
  const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
  const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

  // 1.1 Revenue & Driver Cost from Jobs
  let jobsQuery = supabase
    .from('Jobs_Main')
    .select('Price_Cust_Total, Cost_Driver_Total')
    .gte('Plan_Date', firstDay)
    .lte('Plan_Date', lastDay)
    .in('Job_Status', ['Completed', 'Delivered'])

  if (effectiveBranchId) {
      jobsQuery = jobsQuery.eq('Branch_ID', effectiveBranchId)
  }

  const { data: jobs } = await jobsQuery

  const revenue = jobs?.reduce((sum, job) => sum + (job.Price_Cust_Total || 0), 0) || 0
  const driverCost = jobs?.reduce((sum, job) => sum + (job.Cost_Driver_Total || 0), 0) || 0

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
        // If no vehicles in branch, no fuel cost
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

  const totalCost = driverCost + fuelCost + maintenanceCost
  const netProfit = revenue - totalCost
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  return {
    revenue,
    cost: {
      total: totalCost,
      driver: driverCost,
      fuel: fuelCost,
      maintenance: maintenanceCost
    },
    netProfit,
    profitMargin
  }
}

// 2. Revenue Trend (Daily for the selected range)
export async function getRevenueTrend(startDate?: string, endDate?: string, branchId?: string) {
  const supabase = await createClient()
  
  // Default to last 30 days if no range provided
  const today = new Date()
  let start = startDate
  const end = endDate

  if (!start) {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      start = thirtyDaysAgo.toISOString().split('T')[0]
  }

  // Determine effective branch
  const userBranchId = await getUserBranchId()
  const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
  const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

  let query = supabase
    .from('Jobs_Main')
    .select('Plan_Date, Price_Cust_Total, Cost_Driver_Total, Actual_Delivery_Time')
    .in('Job_Status', ['Completed', 'Delivered'])
    .order('Plan_Date', { ascending: true })

  if (effectiveBranchId) {
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

    let query = supabase
        .from('Jobs_Main')
        .select('Customer_Name, Price_Cust_Total')
        .in('Job_Status', ['Completed', 'Delivered'])

    if (effectiveBranchId) {
        query = query.eq('Branch_ID', effectiveBranchId)
    }

    if (startDate) query = query.gte('Plan_Date', startDate)
    if (endDate) query = query.lte('Plan_Date', endDate)

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
export async function getOperationalStats(branchId?: string) {
    const supabase = await createClient()

    // Determine effective branch
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    // 4.1 Fleet Utilization (Active vs Total Vehicles)
    let vehicleQuery = supabase
        .from('master_vehicles') 
        .select('*', { count: 'exact', head: true })
    
    if (effectiveBranchId) {
        vehicleQuery = vehicleQuery.eq('branch_id', effectiveBranchId)
    }

    const { count: totalVehicles } = await vehicleQuery

    // Vehicles active today (assigned to a job)
    const today = new Date().toISOString().split('T')[0]
    let activeJobsQuery = supabase
        .from('Jobs_Main')
        .select('Vehicle_Plate')
        .eq('Plan_Date', today)
        .not('Vehicle_Plate', 'is', null)

    if (effectiveBranchId) {
        activeJobsQuery = activeJobsQuery.eq('Branch_ID', effectiveBranchId)
    }

    const { data: activeJobs } = await activeJobsQuery

    const uniqueActiveVehicles = new Set(activeJobs?.map(j => j.Vehicle_Plate)).size

    // 4.2 On-Time Delivery
    let jobStatsQuery = supabase
        .from('Jobs_Main')
        .select('Job_Status')
    
    if (effectiveBranchId) {
        jobStatsQuery = jobStatsQuery.eq('Branch_ID', effectiveBranchId)
    }
        
    const { data: jobStats } = await jobStatsQuery
        
    const totalJobs = jobStats?.length || 0
    const completedJobs = jobStats?.filter(j => ['Completed', 'Delivered'].includes(j.Job_Status || '')).length || 0
    const onTimeDelivery = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

    // 4.3 Fuel Efficiency (km/L)
    let activePlates: string[] = []
    if (effectiveBranchId) {
        activePlates = await getBranchPlates(effectiveBranchId)
    }

    let fuelLogsQuery = supabase
        .from('Fuel_Logs')
        .select('Liters, Odometer, Vehicle_Plate')
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
        // Group by Vehicle
        const vehicleLogs: Record<string, typeof fuelLogs> = {}
        fuelLogs.forEach(log => {
            if (log.Vehicle_Plate && log.Odometer && log.Liters) {
                if (!vehicleLogs[log.Vehicle_Plate]) vehicleLogs[log.Vehicle_Plate] = []
                vehicleLogs[log.Vehicle_Plate].push(log)
            }
        })

        // Calculate distance for each vehicle
        Object.values(vehicleLogs).forEach(logs => {
            if (logs.length >= 2) {
                const minOdo = logs[0].Odometer
                const maxOdo = logs[logs.length - 1].Odometer
                totalDistanceApprox += (maxOdo - minOdo)
                
                for (let i = 1; i < logs.length; i++) {
                    totalFuelUsed += logs[i].Liters
                }
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
            fuelEfficiency
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

    if (startDate) query = query.gte('Plan_Date', startDate)
    if (endDate) query = query.lte('Plan_Date', endDate)
    if (effectiveBranchId) query = query.eq('Branch_ID', effectiveBranchId)

    const { data } = await query

    const distribution: Record<string, number> = {
        'Draft': 0,
        'Pending': 0,
        'Confirmed': 0,
        'In Progress': 0,
        'Delivered': 0,
        'Completed': 0,
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

    // Get all branches
    const { data: branches } = await supabase.from('master_branches').select('Branch_ID, Branch_Name')
    if (!branches) return []

    // Fetch jobs for the range
    let query = supabase
        .from('Jobs_Main')
        .select('Branch_ID, Price_Cust_Total, Cost_Driver_Total, Job_Status')
        .in('Job_Status', ['Completed', 'Delivered'])

    if (startDate) query = query.gte('Plan_Date', startDate)
    if (endDate) query = query.lte('Plan_Date', endDate)

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

    let query = supabase
        .from('Jobs_Main')
        .select('Price_Cust_Total, Cost_Driver_Total, Sub_ID')
        .in('Job_Status', ['Completed', 'Delivered'])

    if (startDate) query = query.gte('Plan_Date', startDate)
    if (endDate) query = query.lte('Plan_Date', endDate)
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
        getFinancialStats(currentStart.toISOString(), currentEnd.toISOString(), branchId),
        getFinancialStats(prevStart.toISOString(), prevEnd.toISOString(), branchId)
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

    let query = supabase
        .from('Jobs_Main')
        .select('Route_Name, Price_Cust_Total, Cost_Driver_Total')
        .in('Job_Status', ['Completed', 'Delivered'])

    if (startDate) query = query.gte('Plan_Date', startDate)
    if (endDate) query = query.lte('Plan_Date', endDate)
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

    let query = supabase
        .from('Jobs_Main')
        .select('Driver_Name, Price_Cust_Total, Cost_Driver_Total, Job_Status, Plan_Date, Actual_Delivery_Time')
        .not('Driver_Name', 'is', null)

    if (startDate) query = query.gte('Plan_Date', startDate)
    if (endDate) query = query.lte('Plan_Date', endDate)
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
        
        const isCompleted = ['Completed', 'Delivered'].includes(job.Job_Status || '')
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

// 11. Regional / Branch Deep-Dive (Comparison with detailed metrics)
export async function getRegionalDeepDive(startDate?: string, endDate?: string) {
    const performance = await getBranchPerformance(startDate, endDate)
    
    // Enrich with growth if possible (Comparing current period vs previous)
    const currentStart = startDate ? new Date(startDate) : subDays(new Date(), 30)
    const currentEnd = endDate ? new Date(endDate) : new Date()
    const duration = differenceInDays(currentEnd, currentStart)
    const prevStart = subDays(currentStart, duration + 1)
    const prevEnd = subDays(currentStart, 1)

    const prevPerformance = await getBranchPerformance(prevStart.toISOString(), prevEnd.toISOString())

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
    const firstDay = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Determine effective branch
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    const effectiveBranchId = targetBranchId === 'All' ? null : targetBranchId

    // 1. Get Revenue & Driver Cost per Vehicle
    let jobsQuery = supabase
        .from('Jobs_Main')
        .select('Vehicle_Plate, Price_Cust_Total, Cost_Driver_Total')
        .gte('Plan_Date', firstDay)
        .lte('Plan_Date', lastDay)
        .in('Job_Status', ['Completed', 'Delivered'])
        .not('Vehicle_Plate', 'is', null)

    if (effectiveBranchId) {
        jobsQuery = jobsQuery.eq('Branch_ID', effectiveBranchId)
    }

    const { data: jobs } = await jobsQuery

    // 2. Get Fuel Cost per Vehicle
    let fuelQuery = supabase
        .from('Fuel_Logs')
        .select('Vehicle_Plate, Price_Total')
        .gte('Date_Time', `${firstDay}T00:00:00`)
        .lte('Date_Time', `${lastDay}T23:59:59`)
        .eq('Status', 'Approved')

    const { data: fuel } = await fuelQuery

    // 3. Get Maintenance Cost per Vehicle
    let maintenanceQuery = supabase
        .from('Repair_Tickets')
        .select('Vehicle_Plate, Cost_Total')
        .gte('Date_Report', `${firstDay}T00:00:00`)
        .lte('Date_Report', `${lastDay}T23:59:59`)
        .eq('Status', 'Completed')

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
