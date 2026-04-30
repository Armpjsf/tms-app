"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, getCustomerId, isAdmin } from "@/lib/permissions"

export interface TripCost {
  Job_ID: string
  Plan_Date: string | null
  Customer_Name: string | null
  Route_Name: string | null
  Origin_Location: string | null
  Dest_Location: string | null
  Driver_Name: string | null
  Vehicle_Plate: string | null
  Job_Status: string
  Cost_Customer_Total: number
  Cost_Driver_Total: number
  fuel_real: number
  maint_real: number
  fuel_est: number
  maint_est: number
  toll_cost: number
  extra_cost: number
  total_cost: number
  profit: number
  profit_pct: number
  distance_km: number
}

export interface CostSummary {
  totalTrips: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  totalDistance: number
  avgProfitPerTrip: number
  avgProfitPct: number
  avgCostPerKm: number
}

export async function getCostPerTrip(startDate?: string, endDate?: string, customerNames?: string[]): Promise<{ trips: TripCost[], summary: CostSummary }> {
  const isUserAdmin = await isAdmin()
  const branchId = await getUserBranchId()
  const customerId = await getCustomerId()

  // Use Admin Client to bypass RLS if user is an Admin, otherwise they get 0 rows!
  const supabase = isUserAdmin ? createAdminClient() : await createClient()

  // Default: last 30 days
  const now = new Date()
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const start = startDate || defaultStart.toISOString().split('T')[0]
  const end = endDate || now.toISOString().split('T')[0]

  let query = supabase
    .from('Jobs_Main')
    .select('Job_ID, Plan_Date, Customer_Name, Route_Name, Origin_Location, Dest_Location, Driver_Name, Vehicle_Plate, Job_Status, Price_Cust_Total, Cost_Driver_Total, Price_Cust_Extra, Cost_Driver_Extra, Est_Distance_KM')
    .in('Job_Status', ['Completed', 'Delivered', 'Finished', 'Closed'])
    .gte('Plan_Date', start)
    .lte('Plan_Date', end)
    .order('Plan_Date', { ascending: false })
    .limit(500)

  if (customerId) {
    query = query.eq('Customer_ID', customerId)
  } else {
    if (branchId && branchId !== 'All') {
      query = query.eq('Branch_ID', branchId)
    }
    if (customerNames && customerNames.length > 0) {
      query = query.in('Customer_Name', customerNames)
    }
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`DB Error in getCostPerTrip: ${error.message} (Code: ${error.code})`)
  }
  if (!data) return { trips: [], summary: emptySummary() }

  const trips: TripCost[] = data.map((d: any) => {
    const dist = Number(d.Est_Distance_KM) || 0
    
    // Estimates (For reference only)
    const fuelEst = dist > 0 ? dist * 3.5 : 0
    const maintEst = dist * 1.25

    // Real data
    const fuelReal = 0 // Will read from DB if added later
    const maintReal = 0 // Will read from DB if added later
    const tollCost = 0 // Will read from DB if added later
    
    const driverCost = Number(d.Cost_Driver_Total) || 0
    const extraCost = Number(d.Cost_Driver_Extra) || 0
    
    const revenue = (Number(d.Price_Cust_Total) || 0) + (Number(d.Price_Cust_Extra) || 0)
    
    // Total cost now EXCLUDES estimates, only uses real data
    const totalCost = driverCost + fuelReal + maintReal + tollCost + extraCost
    const profit = revenue - totalCost
    const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0

    return {
      Job_ID: d.Job_ID,
      Plan_Date: d.Plan_Date,
      Customer_Name: d.Customer_Name,
      Route_Name: d.Route_Name,
      Origin_Location: d.Origin_Location,
      Dest_Location: d.Dest_Location,
      Driver_Name: d.Driver_Name,
      Vehicle_Plate: d.Vehicle_Plate,
      Job_Status: d.Job_Status,
      Cost_Customer_Total: revenue,
      Cost_Driver_Total: driverCost,
      fuel_real: fuelReal,
      maint_real: maintReal,
      fuel_est: fuelEst,
      maint_est: maintEst,
      toll_cost: tollCost,
      extra_cost: extraCost,
      total_cost: totalCost,
      profit,
      profit_pct: Math.round(profitPct * 10) / 10,
      distance_km: dist
    }
  })

  const totalTrips = trips.length
  const totalRevenue = trips.reduce((s, t) => s + t.Cost_Customer_Total, 0)
  const totalCostSum = trips.reduce((s, t) => s + t.total_cost, 0)
  const totalProfit = totalRevenue - totalCostSum
  const totalDistance = trips.reduce((s, t) => s + t.distance_km, 0)

  const summary: CostSummary & { debug?: any } = {
    totalTrips,
    totalRevenue,
    totalCost: totalCostSum,
    totalProfit,
    totalDistance,
    avgProfitPerTrip: totalTrips > 0 ? totalProfit / totalTrips : 0,
    avgProfitPct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    avgCostPerKm: totalDistance > 0 ? totalCostSum / totalDistance : 0,
    debug: { branchId, customerId, isUserAdmin, start, end, dataLength: data?.length || 0, error: error?.message || null }
  }

  return { trips, summary }
}

function emptySummary(): CostSummary {
  return { totalTrips: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, totalDistance: 0, avgProfitPerTrip: 0, avgProfitPct: 0, avgCostPerKm: 0 }
}
