"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'
import { cookies } from 'next/headers'

export interface FuelAnalytics {
  // Summary KPIs
  totalLiters: number
  totalCost: number
  totalLogs: number
  avgCostPerLiter: number
  avgKmPerLiter: number
  
  // Per-vehicle breakdown
  vehicleBreakdown: {
    vehicle_plate: string
    totalLiters: number
    totalCost: number
    logCount: number
    avgEfficiency: number
    lastOdometer: number
  }[]
  
  // Monthly trends (last 6 months)
  monthlyTrends: {
    month: string
    totalLiters: number
    totalCost: number
    logCount: number
  }[]
  
  // Anomalies (high consumption)
  anomalies: {
    vehicle_plate: string
    date: string
    liters: number
    cost: number
    issue: string
  }[]
}

export async function getFuelAnalytics(dateFrom?: string, dateTo?: string): Promise<FuelAnalytics> {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()
  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get('selectedBranch')?.value

  // Default: last 90 days
  const now = new Date()
  const from = dateFrom || new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
  const to = dateTo || now.toISOString().split('T')[0]

  let query = supabase
    .from('Fuel_Logs')
    .select('Vehicle_Plate, Date_Time, Liters, Price_Total, Odometer')
    .gte('Date_Time', `${from}T00:00:00`)
    .lte('Date_Time', `${to}T23:59:59`)
    .order('Date_Time', { ascending: false })
    .limit(5000)

  if (isAdmin && selectedBranch && selectedBranch !== 'All') {
    query = query.eq('Branch_ID', selectedBranch)
  } else if (branchId && !isAdmin) {
    query = query.eq('Branch_ID', branchId)
  }

  const { data: logs } = await query

  if (!logs || logs.length === 0) {
    return {
      totalLiters: 0, totalCost: 0, totalLogs: 0,
      avgCostPerLiter: 0, avgKmPerLiter: 0,
      vehicleBreakdown: [], monthlyTrends: [], anomalies: []
    }
  }

  // Get vehicle tank capacities
  const { data: vehicles } = await supabase
    .from('master_vehicles')
    .select('vehicle_plate, tank_capacity')
  const tankMap = new Map(vehicles?.map(v => [v.vehicle_plate, v.tank_capacity || 50]) || [])

  // Calculate totals
  const totalLiters = logs.reduce((s, l) => s + (l.Liters || 0), 0)
  const totalCost = logs.reduce((s, l) => s + (l.Price_Total || 0), 0)
  const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0

  // Per-vehicle breakdown
  const vehicleMap = new Map<string, { liters: number; cost: number; count: number; odometers: number[] }>()
  for (const log of logs) {
    const plate = log.Vehicle_Plate || 'Unknown'
    const entry = vehicleMap.get(plate) || { liters: 0, cost: 0, count: 0, odometers: [] }
    entry.liters += log.Liters || 0
    entry.cost += log.Price_Total || 0
    entry.count++
    if (log.Odometer) entry.odometers.push(log.Odometer)
    vehicleMap.set(plate, entry)
  }

  const vehicleBreakdown = Array.from(vehicleMap.entries())
    .map(([plate, v]) => {
      const sortedOdo = v.odometers.sort((a, b) => a - b)
      const totalKm = sortedOdo.length >= 2 ? sortedOdo[sortedOdo.length - 1] - sortedOdo[0] : 0
      return {
        vehicle_plate: plate,
        totalLiters: Math.round(v.liters * 10) / 10,
        totalCost: Math.round(v.cost),
        logCount: v.count,
        avgEfficiency: v.liters > 0 && totalKm > 0 ? Math.round((totalKm / v.liters) * 10) / 10 : 0,
        lastOdometer: sortedOdo[sortedOdo.length - 1] || 0,
      }
    })
    .sort((a, b) => b.totalCost - a.totalCost)

  // Calculate overall avg km/l
  const allEfficiencies = vehicleBreakdown.filter(v => v.avgEfficiency > 0).map(v => v.avgEfficiency)
  const avgKmPerLiter = allEfficiencies.length > 0
    ? Math.round((allEfficiencies.reduce((s, e) => s + e, 0) / allEfficiencies.length) * 10) / 10
    : 0

  // Monthly trends
  const monthMap = new Map<string, { liters: number; cost: number; count: number }>()
  for (const log of logs) {
    const month = (log.Date_Time || '').slice(0, 7) // YYYY-MM
    if (!month) continue
    const entry = monthMap.get(month) || { liters: 0, cost: 0, count: 0 }
    entry.liters += log.Liters || 0
    entry.cost += log.Price_Total || 0
    entry.count++
    monthMap.set(month, entry)
  }

  const monthlyTrends = Array.from(monthMap.entries())
    .map(([month, v]) => ({
      month,
      totalLiters: Math.round(v.liters * 10) / 10,
      totalCost: Math.round(v.cost),
      logCount: v.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Anomaly detection
  const anomalies: FuelAnalytics['anomalies'] = []
  for (const log of logs) {
    const plate = log.Vehicle_Plate || 'Unknown'
    const tankCap = tankMap.get(plate) || 50
    
    // Flag overflow: >110% of tank capacity
    if (log.Liters && log.Liters > tankCap * 1.1) {
      anomalies.push({
        vehicle_plate: plate,
        date: (log.Date_Time || '').slice(0, 10),
        liters: log.Liters,
        cost: log.Price_Total || 0,
        issue: `เติมเกินถังน้ำมัน (${log.Liters}L / ${tankCap}L)`,
      })
    }
    
    // Flag high cost: >5,000 per fill
    if ((log.Price_Total || 0) > 5000) {
      anomalies.push({
        vehicle_plate: plate,
        date: (log.Date_Time || '').slice(0, 10),
        liters: log.Liters || 0,
        cost: log.Price_Total || 0,
        issue: `ค่าใช้จ่ายสูงผิดปกติ (฿${(log.Price_Total || 0).toLocaleString()})`,
      })
    }
  }

  return {
    totalLiters: Math.round(totalLiters * 10) / 10,
    totalCost: Math.round(totalCost),
    totalLogs: logs.length,
    avgCostPerLiter: Math.round(avgCostPerLiter * 100) / 100,
    avgKmPerLiter,
    vehicleBreakdown: vehicleBreakdown.slice(0, 20), // Top 20
    monthlyTrends,
    anomalies: anomalies.slice(0, 10),
  }
}
