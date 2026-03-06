"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, getCustomerId } from "@/lib/permissions"

export interface TripCost {
  Job_ID: string
  Plan_Date: string | null
  Customer_Name: string | null
  Route_Name: string | null
  Driver_Name: string | null
  Vehicle_Plate: string | null
  Job_Status: string
  Cost_Customer_Total: number | null
  Cost_Driver_Total: number | null
  fuel_cost: number
  toll_cost: number
  total_cost: number
  profit: number
  profit_pct: number
}

export interface CostSummary {
  totalTrips: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  avgCostPerTrip: number
  avgProfitPerTrip: number
  avgProfitPct: number
}

export async function getCostPerTrip(startDate?: string, endDate?: string): Promise<{ trips: TripCost[], summary: CostSummary }> {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const customerId = await getCustomerId()

  // Default: last 30 days
  const now = new Date()
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const start = startDate || defaultStart.toISOString().split('T')[0]
  const end = endDate || now.toISOString().split('T')[0]

  let query = supabase
    .from('Jobs_Main')
    .select('Job_ID, Plan_Date, Customer_Name, Route_Name, Driver_Name, Vehicle_Plate, Job_Status, Cost_Customer_Total, Cost_Driver_Total, Fuel_Cost, Toll_Fee')
    .in('Job_Status', ['Completed', 'Delivered', 'Finished', 'Closed'])
    .gte('Plan_Date', start)
    .lte('Plan_Date', end)
    .order('Plan_Date', { ascending: false })
    .limit(500)

  if (customerId) {
    query = query.eq('Customer_ID', customerId)
  } else if (branchId && branchId !== 'All') {
    query = query.eq('Branch_ID', branchId)
  }

  const { data, error } = await query
  if (error || !data) return { trips: [], summary: emptySummary() }

  const trips: TripCost[] = data.map((d: Record<string, unknown>) => {
    const fuelCost = Number(d.Fuel_Cost) || 0
    const tollCost = Number(d.Toll_Fee) || 0
    const driverCost = Number(d.Cost_Driver_Total) || 0
    const totalCost = driverCost + fuelCost + tollCost
    const revenue = Number(d.Cost_Customer_Total) || 0
    const profit = revenue - totalCost
    const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0

    return {
      Job_ID: d.Job_ID as string,
      Plan_Date: d.Plan_Date as string | null,
      Customer_Name: d.Customer_Name as string | null,
      Route_Name: d.Route_Name as string | null,
      Driver_Name: d.Driver_Name as string | null,
      Vehicle_Plate: d.Vehicle_Plate as string | null,
      Job_Status: d.Job_Status as string,
      Cost_Customer_Total: Number(d.Cost_Customer_Total) || null,
      Cost_Driver_Total: Number(d.Cost_Driver_Total) || null,
      fuel_cost: fuelCost,
      toll_cost: tollCost,
      total_cost: totalCost,
      profit,
      profit_pct: Math.round(profitPct * 10) / 10,
    }
  })

  const totalTrips = trips.length
  const totalRevenue = trips.reduce((s, t) => s + (t.Cost_Customer_Total || 0), 0)
  const totalCostSum = trips.reduce((s, t) => s + t.total_cost, 0)
  const totalProfit = totalRevenue - totalCostSum

  const summary: CostSummary = {
    totalTrips,
    totalRevenue,
    totalCost: totalCostSum,
    totalProfit,
    avgCostPerTrip: totalTrips > 0 ? totalCostSum / totalTrips : 0,
    avgProfitPerTrip: totalTrips > 0 ? totalProfit / totalTrips : 0,
    avgProfitPct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
  }

  return { trips, summary }
}

function emptySummary(): CostSummary {
  return { totalTrips: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, avgCostPerTrip: 0, avgProfitPerTrip: 0, avgProfitPct: 0 }
}
