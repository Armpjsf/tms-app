"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin, isAdmin } from "@/lib/permissions"
import type { FuelLog } from "@/lib/supabase/fuel"
import type { Job } from "@/lib/supabase/jobs"

export interface JobFuelAllocation {
  jobId: string;
  planDate: string;
  customerName: string;
  routeName: string;
  originLocation: string;
  destLocation: string;
  driverName: string;
  vehiclePlate: string;
  jobStatus: string;
  distanceKm: number;
  allocatedLiters: number;
  allocatedFuelCost: number;
  kmPerLiter: number;
  fuelCostPerKm: number;
  revenue: number;
  driverCost: number;
  netProfit: number;
  profitMarginPct: number;
}

export interface DailyFuelAggregation {
  date: string;
  totalJobs: number;
  totalDistanceKm: number;
  totalRefueledLiters: number;
  totalConsumedLiters: number;
  totalFuelCost: number;
  avgKmPerLiter: number;
  avgCostPerKm: number;
  totalRevenue: number;
  totalProfit: number;
  vehiclesCount: number;
}

export interface WeeklyFuelAggregation {
  week: string;
  totalJobs: number;
  totalDistanceKm: number;
  totalFuelCost: number;
  totalLiters: number;
  avgKmPerLiter: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface MonthlyFuelAggregation {
  month: string;
  totalJobs: number;
  totalDistanceKm: number;
  totalFuelCost: number;
  totalLiters: number;
  avgKmPerLiter: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface FuelIntelligenceSummary {
  totalJobs: number;
  totalDistanceKm: number;
  totalFuelCost: number;
  totalLiters: number;
  fleetAvgKmPerLiter: number;
  fleetAvgCostPerKm: number;
  totalRevenue: number;
  totalProfit: number;
  avgProfitMarginPct: number;
  jobAllocations: JobFuelAllocation[];
  dailyAggregations: DailyFuelAggregation[];
  weeklyAggregations: WeeklyFuelAggregation[];
  monthlyAggregations: MonthlyFuelAggregation[];
}

/**
 * Core Fuel Intelligence Engine
 * Computes multi-level fuel consumption and profitability based on real Fuel Logs and TMS Jobs
 */
export async function getFuelIntelligenceAnalytics(
  startDate?: string,
  endDate?: string,
  selectedVehicles?: string[]
): Promise<FuelIntelligenceSummary> {
  const isUserAdmin = await isAdmin();
  const branchId = await getUserBranchId();
  const supabase = isUserAdmin ? createAdminClient() : await createClient();

  // Default to last 30 days
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const start = startDate || defaultStart;
  const end = endDate || now.toISOString().split('T')[0];

  // 1. Fetch Completed / In-Transit Jobs
  let jobsQuery = supabase
    .from('Jobs_Main')
    .select('Job_ID, Plan_Date, Customer_Name, Route_Name, Origin_Location, Dest_Location, Driver_Name, Vehicle_Plate, Job_Status, Price_Cust_Total, Cost_Driver_Total, Price_Cust_Extra, Cost_Driver_Extra, Est_Distance_KM, Loaded_Qty')
    .in('Job_Status', ['Completed', 'Delivered', 'Finished', 'Closed', 'Billed', 'Paid', 'Verified', 'In Transit'])
    .gte('Plan_Date', start)
    .lte('Plan_Date', end)
    .order('Plan_Date', { ascending: false });

  if (branchId && branchId !== 'All') {
    jobsQuery = jobsQuery.eq('Branch_ID', branchId);
  }

  if (selectedVehicles && selectedVehicles.length > 0) {
    jobsQuery = jobsQuery.in('Vehicle_Plate', selectedVehicles);
  }

  const { data: jobsData } = await jobsQuery;
  const rawJobs = (jobsData || []) as (Partial<Job> & Record<string, unknown>)[];

  // 2. Fetch Fuel Logs for the period
  let fuelQuery = supabase
    .from('Fuel_Logs')
    .select('*')
    .gte('Date_Time', `${start}T00:00:00`)
    .lte('Date_Time', `${end}T23:59:59`)
    .order('Date_Time', { ascending: false });

  if (branchId && branchId !== 'All') {
    fuelQuery = fuelQuery.eq('Branch_ID', branchId);
  }

  if (selectedVehicles && selectedVehicles.length > 0) {
    fuelQuery = fuelQuery.in('Vehicle_Plate', selectedVehicles);
  }

  const { data: fuelLogsData } = await fuelQuery;
  const rawFuelLogs = (fuelLogsData || []) as FuelLog[];

  // 3. Compute Vehicle-Level Baselines (Actual km/L from Refuels)
  const vehicleRefuels = new Map<string, FuelLog[]>();
  for (const log of rawFuelLogs) {
    if (!log.Vehicle_Plate) continue;
    const list = vehicleRefuels.get(log.Vehicle_Plate) || [];
    list.push(log);
    vehicleRefuels.set(log.Vehicle_Plate, list);
  }

  const vehicleEfficiencyMap = new Map<string, { kmPerLiter: number; avgUnitPrice: number }>();

  vehicleRefuels.forEach((logs, plate) => {
    // Sort chronological
    const sorted = [...logs].sort((a, b) => (a.Date_Time || '').localeCompare(b.Date_Time || ''));
    let totalDist = 0;
    let totalLiters = 0;
    let totalCost = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.Odometer && curr.Odometer && curr.Odometer > prev.Odometer && curr.Liters > 0) {
        totalDist += (curr.Odometer - prev.Odometer);
        totalLiters += curr.Liters;
      }
    }

    logs.forEach(l => {
      totalCost += (l.Price_Total || 0);
      if (!totalLiters) totalLiters += (l.Liters || 0);
    });

    const kmPerLiter = totalDist > 0 && totalLiters > 0 ? +(totalDist / totalLiters).toFixed(2) : 8.5; // Default 8.5 km/L
    const avgUnitPrice = totalCost > 0 && totalLiters > 0 ? +(totalCost / totalLiters).toFixed(2) : 38.0; // Default 38 THB/L

    vehicleEfficiencyMap.set(plate, { kmPerLiter, avgUnitPrice });
  });

  // 4. Allocate Fuel to Jobs (Pro-rata Distance Allocation)
  const jobAllocations: JobFuelAllocation[] = [];

  for (const j of rawJobs) {
    const plate = String(j.Vehicle_Plate || '');
    const dist = Number(j.Est_Distance_KM) || 0;
    const eff = vehicleEfficiencyMap.get(plate) || { kmPerLiter: 8.5, avgUnitPrice: 38.0 };

    const consumedLiters = dist > 0 ? +(dist / eff.kmPerLiter).toFixed(2) : 0;
    const fuelCost = dist > 0 ? +(consumedLiters * eff.avgUnitPrice).toFixed(2) : 0;
    const fuelCostPerKm = dist > 0 ? +(fuelCost / dist).toFixed(2) : 0;

    const revenue = (Number(j.Price_Cust_Total) || 0) + (Number(j.Price_Cust_Extra) || 0);
    const driverCost = (Number(j.Cost_Driver_Total) || 0) + (Number(j.Cost_Driver_Extra) || 0);
    const netProfit = +(revenue - driverCost - fuelCost).toFixed(2);
    const profitMarginPct = revenue > 0 ? +((netProfit / revenue) * 100).toFixed(1) : 0;

    jobAllocations.push({
      jobId: String(j.Job_ID || ''),
      planDate: String(j.Plan_Date || ''),
      customerName: String(j.Customer_Name || '-'),
      routeName: String(j.Route_Name || '-'),
      originLocation: String(j.Origin_Location || '-'),
      destLocation: String(j.Dest_Location || '-'),
      driverName: String(j.Driver_Name || '-'),
      vehiclePlate: plate || '-',
      jobStatus: String(j.Job_Status || ''),
      distanceKm: dist,
      allocatedLiters: consumedLiters,
      allocatedFuelCost: fuelCost,
      kmPerLiter: eff.kmPerLiter,
      fuelCostPerKm,
      revenue,
      driverCost,
      netProfit,
      profitMarginPct
    });
  }

  // 5. Daily Aggregation
  const dailyMap = new Map<string, DailyFuelAggregation>();
  
  // Initialize with jobs
  for (const a of jobAllocations) {
    const d = a.planDate || start;
    const curr = dailyMap.get(d) || {
      date: d,
      totalJobs: 0,
      totalDistanceKm: 0,
      totalRefueledLiters: 0,
      totalConsumedLiters: 0,
      totalFuelCost: 0,
      avgKmPerLiter: 0,
      avgCostPerKm: 0,
      totalRevenue: 0,
      totalProfit: 0,
      vehiclesCount: 0
    };

    curr.totalJobs += 1;
    curr.totalDistanceKm = +(curr.totalDistanceKm + a.distanceKm).toFixed(2);
    curr.totalConsumedLiters = +(curr.totalConsumedLiters + a.allocatedLiters).toFixed(2);
    curr.totalFuelCost = +(curr.totalFuelCost + a.allocatedFuelCost).toFixed(2);
    curr.totalRevenue = +(curr.totalRevenue + a.revenue).toFixed(2);
    curr.totalProfit = +(curr.totalProfit + a.netProfit).toFixed(2);
    dailyMap.set(d, curr);
  }

  // Add refueled liters from Fuel_Logs
  for (const f of rawFuelLogs) {
    const d = (f.Date_Time || '').slice(0, 10);
    if (!d) continue;
    const curr = dailyMap.get(d) || {
      date: d,
      totalJobs: 0,
      totalDistanceKm: 0,
      totalRefueledLiters: 0,
      totalConsumedLiters: 0,
      totalFuelCost: 0,
      avgKmPerLiter: 0,
      avgCostPerKm: 0,
      totalRevenue: 0,
      totalProfit: 0,
      vehiclesCount: 0
    };
    curr.totalRefueledLiters = +(curr.totalRefueledLiters + (f.Liters || 0)).toFixed(2);
    dailyMap.set(d, curr);
  }

  const dailyAggregations = Array.from(dailyMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(d => ({
      ...d,
      avgKmPerLiter: d.totalConsumedLiters > 0 ? +(d.totalDistanceKm / d.totalConsumedLiters).toFixed(2) : 0,
      avgCostPerKm: d.totalDistanceKm > 0 ? +(d.totalFuelCost / d.totalDistanceKm).toFixed(2) : 0
    }));

  // 6. Weekly Aggregation
  const weeklyMap = new Map<string, WeeklyFuelAggregation>();
  for (const d of dailyAggregations) {
    const weekKey = getWeekKey(d.date);
    const curr = weeklyMap.get(weekKey) || {
      week: weekKey,
      totalJobs: 0,
      totalDistanceKm: 0,
      totalFuelCost: 0,
      totalLiters: 0,
      avgKmPerLiter: 0,
      totalRevenue: 0,
      totalProfit: 0
    };

    curr.totalJobs += d.totalJobs;
    curr.totalDistanceKm = +(curr.totalDistanceKm + d.totalDistanceKm).toFixed(2);
    curr.totalFuelCost = +(curr.totalFuelCost + d.totalFuelCost).toFixed(2);
    curr.totalLiters = +(curr.totalLiters + d.totalConsumedLiters).toFixed(2);
    curr.totalRevenue = +(curr.totalRevenue + d.totalRevenue).toFixed(2);
    curr.totalProfit = +(curr.totalProfit + d.totalProfit).toFixed(2);
    weeklyMap.set(weekKey, curr);
  }

  const weeklyAggregations = Array.from(weeklyMap.values())
    .sort((a, b) => b.week.localeCompare(a.week))
    .map(w => ({
      ...w,
      avgKmPerLiter: w.totalLiters > 0 ? +(w.totalDistanceKm / w.totalLiters).toFixed(2) : 0
    }));

  // 7. Monthly Aggregation
  const monthlyMap = new Map<string, MonthlyFuelAggregation>();
  for (const d of dailyAggregations) {
    const monthKey = d.date.slice(0, 7);
    const curr = monthlyMap.get(monthKey) || {
      month: monthKey,
      totalJobs: 0,
      totalDistanceKm: 0,
      totalFuelCost: 0,
      totalLiters: 0,
      avgKmPerLiter: 0,
      totalRevenue: 0,
      totalProfit: 0
    };

    curr.totalJobs += d.totalJobs;
    curr.totalDistanceKm = +(curr.totalDistanceKm + d.totalDistanceKm).toFixed(2);
    curr.totalFuelCost = +(curr.totalFuelCost + d.totalFuelCost).toFixed(2);
    curr.totalLiters = +(curr.totalLiters + d.totalConsumedLiters).toFixed(2);
    curr.totalRevenue = +(curr.totalRevenue + d.totalRevenue).toFixed(2);
    curr.totalProfit = +(curr.totalProfit + d.totalProfit).toFixed(2);
    monthlyMap.set(monthKey, curr);
  }

  const monthlyAggregations = Array.from(monthlyMap.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .map(m => ({
      ...m,
      avgKmPerLiter: m.totalLiters > 0 ? +(m.totalDistanceKm / m.totalLiters).toFixed(2) : 0
    }));

  // Macro Summary
  const totalJobs = jobAllocations.length;
  const totalDistanceKm = +jobAllocations.reduce((s, j) => s + j.distanceKm, 0).toFixed(2);
  const totalFuelCost = +jobAllocations.reduce((s, j) => s + j.allocatedFuelCost, 0).toFixed(2);
  const totalLiters = +jobAllocations.reduce((s, j) => s + j.allocatedLiters, 0).toFixed(2);
  const totalRevenue = +jobAllocations.reduce((s, j) => s + j.revenue, 0).toFixed(2);
  const totalProfit = +jobAllocations.reduce((s, j) => s + j.netProfit, 0).toFixed(2);
  const fleetAvgKmPerLiter = totalLiters > 0 ? +(totalDistanceKm / totalLiters).toFixed(2) : 0;
  const fleetAvgCostPerKm = totalDistanceKm > 0 ? +(totalFuelCost / totalDistanceKm).toFixed(2) : 0;
  const avgProfitMarginPct = totalRevenue > 0 ? +((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  return {
    totalJobs,
    totalDistanceKm,
    totalFuelCost,
    totalLiters,
    fleetAvgKmPerLiter,
    fleetAvgCostPerKm,
    totalRevenue,
    totalProfit,
    avgProfitMarginPct,
    jobAllocations,
    dailyAggregations,
    weeklyAggregations,
    monthlyAggregations
  };
}

function getWeekKey(isoDate: string): string {
  const d = new Date(isoDate);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}
