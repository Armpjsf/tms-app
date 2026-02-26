'use server'

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'
import { cookies } from 'next/headers'

export interface ReportFilters {
  reportType: string
  dateFrom?: string
  dateTo?: string
  status?: string
  branchId?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFilteredReportData(filters: ReportFilters): Promise<{ data: any[], columns: string[] }> {
  const supabase = await createClient()
  const userBranchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()
  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get('selectedBranch')?.value

  const effectiveBranch = isAdmin 
    ? (filters.branchId || selectedBranch || 'All')
    : userBranchId

  try {
    switch (filters.reportType) {
      case 'jobs': {
        let query = supabase
          .from('Jobs_Main')
          .select('Job_ID, Plan_Date, Customer_Name, Route_Name, Driver_Name, Vehicle_Plate, Job_Status, Price_Cust_Total, extra_costs_json, Branch_ID')
          .order('Plan_Date', { ascending: false })
          .limit(2000)

        if (filters.dateFrom) query = query.gte('Plan_Date', filters.dateFrom)
        if (filters.dateTo) query = query.lte('Plan_Date', filters.dateTo)
        if (filters.status && filters.status !== 'all') query = query.eq('Job_Status', filters.status)
        if (effectiveBranch && effectiveBranch !== 'All') query = query.eq('Branch_ID', effectiveBranch)

        const { data } = await query
        return { 
          data: data || [], 
          columns: ['Job_ID', 'Plan_Date', 'Customer_Name', 'Route_Name', 'Driver_Name', 'Vehicle_Plate', 'Job_Status', 'Price_Cust_Total']
        }
      }

      case 'drivers': {
        let query = supabase
          .from('Master_Drivers')
          .select('Driver_ID, Driver_Name, Mobile_No, Active_Status, Branch_ID, Vehicle_Plate')
          .order('Driver_Name')
          .limit(500)

        if (filters.status && filters.status !== 'all') query = query.eq('Active_Status', filters.status)
        if (effectiveBranch && effectiveBranch !== 'All') query = query.eq('Branch_ID', effectiveBranch)

        const { data } = await query
        return { 
          data: data || [], 
          columns: ['Driver_ID', 'Driver_Name', 'Mobile_No', 'Active_Status', 'Vehicle_Plate']
        }
      }

      case 'vehicles': {
        let query = supabase
          .from('Master_Vehicles')
          .select('Vehicle_Plate, Vehicle_Type, Active_Status, Insurance_Expiry, Tax_Expiry, Branch_ID')
          .order('Vehicle_Plate')
          .limit(500)

        if (filters.status && filters.status !== 'all') query = query.eq('Active_Status', filters.status)
        if (effectiveBranch && effectiveBranch !== 'All') query = query.eq('Branch_ID', effectiveBranch)

        const { data } = await query
        return { 
          data: (data as any[] || []).map(v => ({
            ...v,
            vehicle_plate: v.Vehicle_Plate,
            vehicle_type: v.Vehicle_Type,
            status: v.Active_Status,
            insurance_expiry: v.Insurance_Expiry,
            registration_expiry: v.Tax_Expiry
          })), 
          columns: ['vehicle_plate', 'vehicle_type', 'status', 'insurance_expiry', 'registration_expiry']
        }
      }

      case 'fuel': {
        let query = supabase
          .from('Fuel_Logs')
          .select('Log_ID, Vehicle_Plate, Driver_ID, Date_Time, Liters, Price_Total, Station_Name, Branch_ID')
          .order('Date_Time', { ascending: false })
          .limit(2000)

        if (filters.dateFrom) query = query.gte('Date_Time', filters.dateFrom)
        if (filters.dateTo) query = query.lte('Date_Time', filters.dateTo)
        if (effectiveBranch && effectiveBranch !== 'All') query = query.eq('Branch_ID', effectiveBranch)

        const { data } = await query
        return { 
          data: (data as any[] || []).map(f => ({
            ...f,
            fuel_date: f.Date_Time,
            vehicle_plate: f.Vehicle_Plate,
            amount: f.Price_Total,
            station: f.Station_Name
          })), 
          columns: ['fuel_date', 'vehicle_plate', 'amount', 'station', 'Liters']
        }
      }

      case 'maintenance': {
        let query = supabase
          .from('Repair_Tickets')
          .select('Ticket_ID, Vehicle_Plate, Issue_Type, Description, Status, Cost_Total, Date_Report, Date_Finish')
          .order('Date_Report', { ascending: false })
          .limit(1000)

        if (filters.dateFrom) query = query.gte('Date_Report', filters.dateFrom)
        if (filters.dateTo) query = query.lte('Date_Report', filters.dateTo)
        if (filters.status && filters.status !== 'all') query = query.eq('Status', filters.status)

        const { data } = await query
        return { 
          data: (data as any[] || []).map(m => ({
            ...m,
            created_at: m.Date_Report,
            vehicle_plate: m.Vehicle_Plate,
            maintenance_type: m.Issue_Type,
            cost: m.Cost_Total,
            description: m.Description,
            status: m.Status
          })), 
          columns: ['created_at', 'vehicle_plate', 'maintenance_type', 'status', 'cost', 'description']
        }
      }

      case 'vehicle_expenses': {
        // 1. Get all vehicles in the branch
        let vQuery = supabase
          .from('master_vehicles')
          .select('vehicle_plate, vehicle_type, sub_id, branch_id')
        
        if (effectiveBranch && effectiveBranch !== 'All') {
          vQuery = vQuery.eq('branch_id', effectiveBranch)
        }
        const { data: vehicles } = await vQuery

        if (!vehicles || vehicles.length === 0) return { data: [], columns: [] }

        const plates = vehicles.map(v => v.vehicle_plate)

        // 2. Aggregate Fuel Costs
        let fuelQuery = supabase
          .from('Fuel_Logs')
          .select('Vehicle_Plate, Price_Total')
          .in('Vehicle_Plate', plates)
        if (filters.dateFrom) fuelQuery = fuelQuery.gte('Date_Time', filters.dateFrom)
        if (filters.dateTo) fuelQuery = fuelQuery.lte('Date_Time', filters.dateTo)
        const { data: fuelLogs } = await fuelQuery

        // 3. Aggregate Maintenance Costs
        let maintQuery = supabase
          .from('Repair_Tickets')
          .select('Vehicle_Plate, Cost_Total')
          .in('Vehicle_Plate', plates)
          .eq('Status', 'completed')
        if (filters.dateFrom) maintQuery = maintQuery.gte('Date_Report', filters.dateFrom)
        if (filters.dateTo) maintQuery = maintQuery.lte('Date_Report', filters.dateTo)
        const { data: maintLogs } = await maintQuery

        // 4. Get Extra Costs from Jobs (Subcontractor job costs if applicable)
        let jobQuery = supabase
          .from('Jobs_Main')
          .select('Vehicle_Plate, extra_costs_json')
          .in('Vehicle_Plate', plates)
        if (filters.dateFrom) jobQuery = jobQuery.gte('Plan_Date', filters.dateFrom)
        if (filters.dateTo) jobQuery = jobQuery.lte('Plan_Date', filters.dateTo)
        const { data: rawJobs } = await jobQuery

        // 5. Get Subcontractor details for labeling
        const subIds = [...new Set(vehicles.map(v => v.sub_id).filter(Boolean))]
        const { data: subs } = await supabase
          .from('Master_Subcontractors')
          .select('Sub_ID, Sub_Name')
          .in('Sub_ID', subIds as string[])

        const subMap = (subs || []).reduce((acc: any, s) => {
          acc[s.Sub_ID] = s.Sub_Name
          return acc
        }, {})

        // Aggregate by Plate
        const reportData = vehicles.map(v => {
          const vPlate = v.vehicle_plate
          const fuelTotal = (fuelLogs || [])
            .filter(f => f.Vehicle_Plate === vPlate)
            .reduce((sum, f) => sum + (Number(f.Price_Total) || 0), 0)
          
          const maintTotal = (maintLogs || [])
            .filter(m => m.Vehicle_Plate === vPlate)
            .reduce((sum, m) => sum + (Number(m.Cost_Total) || 0), 0)

          const extraCosts = (rawJobs || [])
            .filter(j => j.Vehicle_Plate === vPlate)
            .reduce((sum, j) => {
              let extra = 0
              if (j.extra_costs_json) {
                try {
                  const costs = typeof j.extra_costs_json === 'string' ? JSON.parse(j.extra_costs_json) : j.extra_costs_json
                  if (Array.isArray(costs)) {
                    extra = costs.reduce((s, c) => s + (Number(c.charge_base) || Number(c.amount) || 0), 0)
                  }
                } catch {}
              }
              return sum + extra
            }, 0)

          return {
            vehicle_plate: vPlate,
            vehicle_type: v.vehicle_type,
            owner: v.sub_id ? (subMap[v.sub_id] || 'รถร่วม') : 'รถบริษัท',
            fuel_cost: fuelTotal,
            maintenance_cost: maintTotal,
            extra_cost: extraCosts,
            total_cost: fuelTotal + maintTotal + extraCosts
          }
        })

        // Filter by Owner Type if status filter is used (re-using status as owner type filter for this report)
        let finalData = reportData
        if (filters.status === 'Company') finalData = reportData.filter(d => d.owner === 'รถบริษัท')
        if (filters.status === 'Subcontractor') finalData = reportData.filter(d => d.owner !== 'รถบริษัท')

        return {
          data: finalData,
          columns: ['vehicle_plate', 'owner', 'vehicle_type', 'fuel_cost', 'maintenance_cost', 'extra_cost', 'total_cost']
        }
      }

      default:
        return { data: [], columns: [] }
    }
  } catch (error) {
    console.error('Error fetching filtered report data:', error)
    return { data: [], columns: [] }
  }
}

// Get available status options for each report type
export async function getReportStatusOptions(reportType: string): Promise<string[]> {
  switch (reportType) {
    case 'jobs':
      return ['New', 'Assigned', 'In Transit', 'Completed', 'Delivered', 'Failed', 'Cancelled']
    case 'drivers':
      return ['Active', 'OnJob', 'Inactive', 'Suspended']
    case 'vehicles':
      return ['Active', 'Maintenance', 'Inactive']
    case 'maintenance':
      return ['pending', 'in_progress', 'completed', 'cancelled']
    case 'vehicle_expenses':
      return ['All', 'Company', 'Subcontractor']
    default:
      return []
  }
}
