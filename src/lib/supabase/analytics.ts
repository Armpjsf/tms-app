"use server"

import { createClient } from '@/utils/supabase/server'

// 1. Financial Stats
export async function getFinancialStats(startDate?: string, endDate?: string) {
  const supabase = await createClient()
  
  // Default to current month if no date provided
  const now = new Date()
  const firstDay = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // 1.1 Revenue & Driver Cost from Jobs
  const { data: jobs } = await supabase
    .from('Jobs_Main')
    .select('Price_Cust_Total, Cost_Driver_Total')
    .gte('Plan_Date', firstDay)
    .lte('Plan_Date', lastDay)
    .in('Job_Status', ['Completed', 'Delivered']) // Only count completed jobs

  const revenue = jobs?.reduce((sum, job) => sum + (job.Price_Cust_Total || 0), 0) || 0
  const driverCost = jobs?.reduce((sum, job) => sum + (job.Cost_Driver_Total || 0), 0) || 0

  // 1.2 Fuel Cost
  const { data: fuel } = await supabase
    .from('Fuel_Logs')
    .select('Price_Total')
    .gte('Date_Time', `${firstDay}T00:00:00`)
    .lte('Date_Time', `${lastDay}T23:59:59`)

  const fuelCost = fuel?.reduce((sum, log) => sum + (log.Price_Total || 0), 0) || 0

  // 1.3 Maintenance Cost
  const { data: maintenance } = await supabase
    .from('Repair_Tickets')
    .select('Cost_Total')
    .gte('Date_Report', `${firstDay}T00:00:00`)
    .lte('Date_Report', `${lastDay}T23:59:59`)
    .neq('Status', 'Cancelled') // Exclude cancelled tickets

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
export async function getRevenueTrend(startDate?: string, endDate?: string) {
  const supabase = await createClient()
  
  // Default to last 30 days if no range provided
  const today = new Date()
  let start = startDate
  let end = endDate

  if (!start) {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      start = thirtyDaysAgo.toISOString().split('T')[0]
  }

  let query = supabase
    .from('Jobs_Main')
    .select('Plan_Date, Price_Cust_Total, Cost_Driver_Total')
    .in('Job_Status', ['Completed', 'Delivered'])
    .order('Plan_Date', { ascending: true })

  if (start) query = query.gte('Plan_Date', start)
  if (end) query = query.lte('Plan_Date', end)

  const { data: jobs } = await query

  // Aggregate by date
  const dailyStats: Record<string, { date: string, revenue: number, cost: number }> = {}

  jobs?.forEach(job => {
    const date = job.Plan_Date as string
    if (!dailyStats[date]) {
        dailyStats[date] = { date, revenue: 0, cost: 0 }
    }
    dailyStats[date].revenue += (job.Price_Cust_Total || 0)
    dailyStats[date].cost += (job.Cost_Driver_Total || 0)
  })
  
  return Object.values(dailyStats)
}

// 3. Customer Performance (Top 5)
export async function getTopCustomers(startDate?: string, endDate?: string) {
    const supabase = await createClient()
    
    let query = supabase
        .from('Jobs_Main')
        .select('Customer_Name, Price_Cust_Total')
        .in('Job_Status', ['Completed', 'Delivered'])

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
// 4. Operational Stats
export async function getOperationalStats() {
    const supabase = await createClient()

    // 4.1 Fleet Utilization (Active vs Total Vehicles)
    // Fix: Table name is lowercase 'master_vehicles'
    const { count: totalVehicles } = await supabase
        .from('master_vehicles') 
        .select('*', { count: 'exact', head: true })

    // Vehicles active today (assigned to a job)
    const today = new Date().toISOString().split('T')[0]
    const { data: activeJobs } = await supabase
        .from('Jobs_Main')
        .select('Vehicle_Plate')
        .eq('Plan_Date', today)
        .not('Vehicle_Plate', 'is', null)

    // Count unique vehicles
    const uniqueActiveVehicles = new Set(activeJobs?.map(j => j.Vehicle_Plate)).size

    // 4.2 On-Time Delivery
    const { data: jobStats } = await supabase
        .from('Jobs_Main')
        .select('Job_Status')
        
    const totalJobs = jobStats?.length || 0
    const completedJobs = jobStats?.filter(j => ['Completed', 'Delivered'].includes(j.Job_Status || '')).length || 0
    const onTimeDelivery = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

    // 4.3 Fuel Efficiency (km/L)
    // Calculate from Fuel Logs: Sum(Odometer) / Sum(Liters) - simplified approximation
    // Better: Average of (Odometer - PrevOdometer) / Liters. 
    // For now: Sum(Liters) and assume Total Distance from Jobs if available, or just placeholder logic.
    // Let's use: Total Distance of Completed Jobs / Total Fuel Liters
    
    // We don't have "Distance" in Jobs_Main yet. 
    // Alternative: Use Odometer max - min from Fuel Logs for active vehicles.
    
    const { data: fuelLogs } = await supabase
        .from('Fuel_Logs')
        .select('Liters, Odometer, Vehicle_Plate')
        .order('Date_Time', { ascending: true })

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
                
                // Sum liters excluding the first fill (since it sets the start point)
                // actually simpler: Sum liters of all records except the FIRST one? 
                // Or just sum all liters? standard is Liters filled covers NEXT distance, but here we look back.
                // Let's sum liters of 2nd record onwards.
                for (let i = 1; i < logs.length; i++) {
                    totalFuelUsed += logs[i].Liters
                }
            }
        })
    }

    const fuelEfficiency = totalFuelUsed > 0 ? (totalDistanceApprox / totalFuelUsed) : 0

    return {
        fleet: {
            total: totalVehicles || 0,
            active: uniqueActiveVehicles || 0,
            utilization: totalVehicles ? (uniqueActiveVehicles / totalVehicles) * 100 : 0,
            onTimeDelivery,
            fuelEfficiency
        }
    }
}
