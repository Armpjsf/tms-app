"use server"

import { createAdminClient } from '@/utils/supabase/server'
import { isSuperAdmin, getCustomerId } from "@/lib/permissions"
import {
    FinancialJob,
    REVENUE_STATUSES,
    subDays,
    differenceInDays,
    formatDateSafe,
    getBranchPlates,
    getEffectiveBranchId
} from './analytics-helpers'

// 1. Financial Stats
export async function getFinancialStats(startDate?: string, endDate?: string, branchId?: string) {
  const supabase = await createAdminClient()
  const customerId = await getCustomerId()
  
  const now = new Date()
  const firstDay = formatDateSafe(startDate) || formatDateSafe(new Date(now.getFullYear(), now.getMonth(), 1)) || ""
  const lastDay = formatDateSafe(endDate) || formatDateSafe(new Date(now.getFullYear(), now.getMonth() + 1, 0)) || ""

  const effectiveBranchId = await getEffectiveBranchId(branchId)

  let jobsQuery = supabase
    .from('Jobs_Main')
    .select('Price_Cust_Total, Cost_Driver_Total, Price_Cust_Extra, Cost_Driver_Extra')
    .gte('Plan_Date', firstDay)
    .lte('Plan_Date', lastDay)
    .in('Job_Status', REVENUE_STATUSES)

  if (customerId) {
      jobsQuery = jobsQuery.eq('Customer_ID', customerId)
  } else if (effectiveBranchId) {
      jobsQuery = jobsQuery.eq('Branch_ID', effectiveBranchId)
  }

  const { data: jobs } = await jobsQuery as { data: FinancialJob[] | null }

  const revenue: number = (jobs || []).reduce((sum: number, job: FinancialJob) => sum + (Number(job.Price_Cust_Total) || 0), 0)
  
  if (customerId) {
      return { revenue, netProfit: 0, fuelCost: 0, maintenanceCost: 0, secondaryCosts: 0 }
  }

  const driverCost: number = (jobs || []).reduce((sum: number, job: FinancialJob) => sum + (Number(job.Cost_Driver_Total) || 0), 0)
  const secondaryCosts: number = (jobs || []).reduce((sum: number, job: FinancialJob) => sum + (Number(job.Price_Cust_Extra) || 0) + (Number(job.Cost_Driver_Extra) || 0), 0)

  let activePlates: string[] = []
  if (effectiveBranchId) {
      activePlates = await getBranchPlates(effectiveBranchId)
  }

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
    cost: { total: totalCost, driver: driverCost, fuel: fuelCost, maintenance: maintenanceCost, secondary: secondaryCosts },
    netProfit,
    profitMargin
  }
}

// 2. Revenue Trend (Daily for the selected range)
export async function getRevenueTrend(startDate?: string, endDate?: string, branchId?: string) {
  const supabase = await createAdminClient()
  
  const now = new Date()
  let start = formatDateSafe(startDate)
  const end = formatDateSafe(endDate)

  if (!start) {
      start = formatDateSafe(subDays(now, 30))
  }

  const effectiveBranchId = await getEffectiveBranchId(branchId)
  const customerId = await getCustomerId()

  let query = supabase
    .from('Jobs_Main')
    .select('Plan_Date, Price_Cust_Total, Cost_Driver_Total, Actual_Delivery_Time')
    .in('Job_Status', REVENUE_STATUSES)
    .order('Plan_Date', { ascending: true })

  if (customerId) {
      query = query.eq('Customer_ID', customerId)
  } else if (effectiveBranchId) {
      query = query.eq('Branch_ID', effectiveBranchId)
  }

  if (start) query = query.gte('Plan_Date', start)
  if (end) query = query.lte('Plan_Date', end)

  const { data: jobs } = await query

  const dailyStats: Record<string, { date: string, revenue: number, cost: number, jobCount: number, onTimeCount: number }> = {}

  jobs?.forEach(job => {
    const date = job.Plan_Date as string
    if (!dailyStats[date]) {
        dailyStats[date] = { date, revenue: 0, cost: 0, jobCount: 0, onTimeCount: 0 }
    }
    dailyStats[date].revenue += (job.Price_Cust_Total || 0)
    dailyStats[date].cost += (job.Cost_Driver_Total || 0)
    dailyStats[date].jobCount += 1
    
    if (job.Actual_Delivery_Time) {
        const actualDate = job.Actual_Delivery_Time.split('T')[0]
        if (actualDate === date) {
            dailyStats[date].onTimeCount += 1
        }
    } else {
        dailyStats[date].onTimeCount += 1
    }
  })
  
  return Object.values(dailyStats)
}

// 3. Customer Performance (Top 5)
export async function getTopCustomers(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createAdminClient()
    const effectiveBranchId = await getEffectiveBranchId(branchId)
    const customerId = await getCustomerId()

    let query = supabase
        .from('Jobs_Main')
        .select('Customer_Name, Price_Cust_Total')
        .in('Job_Status', REVENUE_STATUSES)
    
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

// 5. Job Status Distribution
export async function getJobStatusDistribution(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createAdminClient()
    const effectiveBranchId = await getEffectiveBranchId(branchId)

    let query = supabase.from('Jobs_Main').select('Job_Status')

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)
    if (effectiveBranchId) query = query.eq('Branch_ID', effectiveBranchId)

    const { data } = await query

    const distribution: Record<string, number> = {
        'Draft': 0, 'Pending': 0, 'Confirmed': 0, 'In Progress': 0,
        'Delivered': 0, 'Completed': 0, 'Finished': 0, 'Closed': 0, 'Cancelled': 0
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

    const supabase = await createAdminClient()

    const { data: branches } = await supabase.from('Master_Branches').select('Branch_ID, Branch_Name')
    if (!branches) return []

    let query = supabase
        .from('Jobs_Main')
        .select('Branch_ID, Price_Cust_Total, Cost_Driver_Total, Job_Status')
        .in('Job_Status', REVENUE_STATUSES)

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
            profit: revenue - driverCost
        }
    })

    return performance.sort((a, b) => b.revenue - a.revenue)
}

// 7. Subcontractor vs Internal Fleet Performance
export async function getSubcontractorPerformance(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createAdminClient()
    const effectiveBranchId = await getEffectiveBranchId(branchId)

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    let query = supabase
        .from('Jobs_Main')
        .select('Price_Cust_Total, Cost_Driver_Total, Sub_ID')
        .in('Job_Status', REVENUE_STATUSES)

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

    const targets = { revenue: 250000, profitMargin: 15, onTimeDelivery: 95 }

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
            current: currentStats.profitMargin ?? 0,
            previous: prevStats.profitMargin ?? 0,
            growth: (currentStats.profitMargin ?? 0) - (prevStats.profitMargin ?? 0),
            target: targets.profitMargin
        }
    }
}

// 9. Route Efficiency (Revenue vs Cost per Route)
export async function getRouteEfficiency(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createAdminClient()
    const effectiveBranchId = await getEffectiveBranchId(branchId)

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    let query = supabase
        .from('Jobs_Main')
        .select('Route_Name, Price_Cust_Total, Cost_Driver_Total, Price_Cust_Extra, Cost_Driver_Extra, Distance_Km')
        .in('Job_Status', REVENUE_STATUSES)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)
    if (effectiveBranchId) query = query.eq('Branch_ID', effectiveBranchId)

    const { data: jobs } = await query

    const routeStats: Record<string, { route: string, revenue: number, cost: number, count: number, extra: number, totalKm: number }> = {}

    jobs?.forEach(job => {
        const route = job.Route_Name || 'Unknown Route'
        if (!routeStats[route]) {
            routeStats[route] = { route, revenue: 0, cost: 0, count: 0, extra: 0, totalKm: 0 }
        }
        routeStats[route].revenue += (job.Price_Cust_Total || 0)
        routeStats[route].cost += (job.Cost_Driver_Total || 0)
        routeStats[route].extra += (job.Price_Cust_Extra || 0) + (job.Cost_Driver_Extra || 0)
        routeStats[route].totalKm += (Number(job.Distance_Km) || 0)
        routeStats[route].count++
    })

    return Object.values(routeStats)
        .map(r => {
            const totalCost = r.cost + r.extra
            const netProfit = r.revenue - totalCost
            return { 
                ...r, 
                netProfit,
                margin: r.revenue > 0 ? (netProfit / r.revenue) * 100 : 0,
                profitPerKm: r.totalKm > 0 ? (netProfit / r.totalKm) : 0
            }
        })
        .sort((a, b) => b.netProfit - a.netProfit)
}

// 9.1 Advanced Efficiency Score (Executive View)
export async function getExecutiveEfficiencyScores(branchId?: string) {
    const stats = await getFinancialStats(undefined, undefined, branchId)
    const routeEfficiency = await getRouteEfficiency(undefined, undefined, branchId)
    
    const avgProfitPerKm = routeEfficiency.reduce((sum, r) => sum + r.profitPerKm, 0) / (routeEfficiency.length || 1)
    
    // Efficiency Grade based on Margin and Profit/KM
    let grade = 'C'
    if (stats.profitMargin > 20 && avgProfitPerKm > 15) grade = 'A+'
    else if (stats.profitMargin > 15 && avgProfitPerKm > 10) grade = 'A'
    else if (stats.profitMargin > 10) grade = 'B'
    
    return {
        avgProfitPerKm,
        grade,
        topEfficiencyRoute: routeEfficiency[0]?.route || 'N/A'
    }
}

// 10. Detailed Trip Profitability (Top 50 Jobs by Margin)
export async function getDetailedProfitability(startDate?: string, endDate?: string, branchId?: string) {
    const supabase = await createAdminClient()
    const effectiveBranchId = await getEffectiveBranchId(branchId)

    const sDate = formatDateSafe(startDate)
    const eDate = formatDateSafe(endDate)

    let query = supabase
        .from('Jobs_Main')
        .select('Job_ID, Customer_Name, Route_Name, Price_Cust_Total, Cost_Driver_Total, Price_Cust_Extra, Cost_Driver_Extra, Plan_Date')
        .in('Job_Status', REVENUE_STATUSES)
        .order('Plan_Date', { ascending: false })
        .limit(50)

    if (sDate) query = query.gte('Plan_Date', sDate)
    if (eDate) query = query.lte('Plan_Date', eDate)
    if (effectiveBranchId) query = query.eq('Branch_ID', effectiveBranchId)

    const { data: jobs } = await query

    return (jobs || []).map(job => {
        const totalCost = (job.Cost_Driver_Total || 0) + (job.Cost_Driver_Extra || 0)
        const revenue = (job.Price_Cust_Total || 0) + (job.Price_Cust_Extra || 0)
        const netProfit = revenue - totalCost
        return {
            id: job.Job_ID,
            date: job.Plan_Date,
            customer: job.Customer_Name,
            route: job.Route_Name,
            revenue,
            cost: totalCost,
            profit: netProfit,
            margin: revenue > 0 ? (netProfit / revenue) * 100 : 0
        }
    })
}

// 11. Regional / Branch Deep-Dive
export async function getRegionalDeepDive(startDate?: string, endDate?: string) {
    const performance = await getBranchPerformance(startDate, endDate)
    
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

import { FUEL_BASELINES, FUEL_FRAUD_THRESHOLD } from '@/lib/constants/fuel-baselines'

// 13. Fuel Anomaly & Fraud Detection (Executive Guard)
export async function getFuelAnomalyAlerts(branchId?: string) {
    const supabase = await createAdminClient()
    const effectiveBranchId = await getEffectiveBranchId(branchId)
    
    // 1. Fetch recent fuel logs (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    let fuelQuery = supabase
        .from('Fuel_Logs')
        .select('*')
        .gte('Date_Time', thirtyDaysAgo.toISOString())
        .order('Date_Time', { ascending: false })
    
    if (effectiveBranchId) {
        fuelQuery = fuelQuery.eq('Branch_ID', effectiveBranchId)
    }

    const { data: logs } = await fuelQuery
    if (!logs || logs.length === 0) return []

    // 2. Fetch vehicle master for baselines
    const plates = Array.from(new Set(logs.map(l => l.Vehicle_Plate)))
    const { data: vehicles } = await supabase
        .from('master_vehicles')
        .select('vehicle_plate, vehicle_type, tank_capacity')
        .in('vehicle_plate', plates)
    
    const vehicleMap = new Map(vehicles?.map(v => [v.vehicle_plate, v]) || [])

    const alerts: any[] = []

    for (const log of logs) {
        const vehicle = vehicleMap.get(log.Vehicle_Plate)
        if (!vehicle) continue

        const type = vehicle.vehicle_type || 'Default'
        const baseline = FUEL_BASELINES[type] || FUEL_BASELINES['Default']
        const tankCapacity = vehicle.tank_capacity || 0

        // A. Check for Over-fill (Fraud Risk)
        if (tankCapacity > 0 && log.Liters > tankCapacity * 1.05) {
            alerts.push({
                type: 'CRITICAL',
                category: 'Fuel Over-fill',
                plate: log.Vehicle_Plate,
                date: log.Date_Time,
                message: `เติมน้ำมัน ${log.Liters}L เกินความจุถัง (${tankCapacity}L)`,
                value: log.Liters,
                excess: log.Liters - tankCapacity
            })
        }

        // B. Check for Efficiency (Requires Previous Log)
        // Note: For real-time fraud, we look at the KM/L of the LAST trip
        // This is handled in the frontend or we can pre-calculate it here
    }

    // Sort by severity
    return alerts.slice(0, 10)
}

// 12. Predictive Revenue Forecasting
export async function getRevenueForecast(branchId?: string): Promise<{ month: string; actual?: number; forecast?: number }[]> {
    try {
        const supabase = await createAdminClient()
        const effectiveBranchId = await getEffectiveBranchId(branchId)
        
        // 1. Get historical revenue (last 6 months)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        
        let query = supabase
            .from('Jobs_Main')
            .select('Price_Cust_Total, Plan_Date')
            .gte('Plan_Date', sixMonthsAgo.toISOString().split('T')[0])
            .in('Job_Status', REVENUE_STATUSES)

        if (effectiveBranchId) {
            query = query.eq('Branch_ID', effectiveBranchId)
        }

        const { data: history } = await query
        if (!history) return []

        // Group by month
        const monthlyData: Record<string, number> = {}
        history.forEach(j => {
            const month = (j.Plan_Date as string).substring(0, 7) // YYYY-MM
            monthlyData[month] = (monthlyData[month] || 0) + (Number(j.Price_Cust_Total) || 0)
        })

        const sortedMonths = Object.keys(monthlyData).sort()
        if (sortedMonths.length === 0) return []
        
        const values = sortedMonths.map(m => monthlyData[m])

        // Simple Linear Trend Calculation
        const n = values.length
        if (n < 2) return sortedMonths.map(m => ({ month: m, actual: monthlyData[m] }))

        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
        for (let i = 0; i < n; i++) {
            sumX += i
            sumY += values[i]
            sumXY += i * values[i]
            sumXX += i * i
        }

        const denominator = (n * sumXX - sumX * sumX)
        const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
        const intercept = (sumY - slope * sumX) / n

        // 2. Generate result with history + 3 months forecast
        const result = sortedMonths.map(m => ({ month: m, actual: monthlyData[m] }))
        
        const lastMonthDate = new Date(sortedMonths[sortedMonths.length - 1] + "-01")
        for (let i = 1; i <= 3; i++) {
            const forecastMonth = new Date(lastMonthDate)
            forecastMonth.setMonth(forecastMonth.getMonth() + i)
            const monthStr = forecastMonth.toISOString().substring(0, 7)
            
            const forecastValue = slope * (n + i - 1) + intercept
            result.push({ month: monthStr, forecast: Math.max(0, Math.round(forecastValue)) })
        }

        return result
    } catch (err) {
        console.error('Forecast Error:', err)
        return []
    }
}
