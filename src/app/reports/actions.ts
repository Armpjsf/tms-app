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
          .select('Job_ID, Plan_Date, Customer_Name, Route_Name, Driver_Name, Vehicle_Plate, Job_Status, Total_Cost, Extra_Costs, Branch_ID')
          .order('Plan_Date', { ascending: false })
          .limit(2000)

        if (filters.dateFrom) query = query.gte('Plan_Date', filters.dateFrom)
        if (filters.dateTo) query = query.lte('Plan_Date', filters.dateTo)
        if (filters.status && filters.status !== 'all') query = query.eq('Job_Status', filters.status)
        if (effectiveBranch && effectiveBranch !== 'All') query = query.eq('Branch_ID', effectiveBranch)

        const { data } = await query
        return { 
          data: data || [], 
          columns: ['Job_ID', 'Plan_Date', 'Customer_Name', 'Route_Name', 'Driver_Name', 'Vehicle_Plate', 'Job_Status', 'Total_Cost']
        }
      }

      case 'drivers': {
        let query = supabase
          .from('Drivers')
          .select('Driver_ID, Driver_Name, Mobile_No, License_No, License_Expiry, Status, Branch_ID, Vehicle_Plate')
          .order('Driver_Name')
          .limit(500)

        if (filters.status && filters.status !== 'all') query = query.eq('Status', filters.status)
        if (effectiveBranch && effectiveBranch !== 'All') query = query.eq('Branch_ID', effectiveBranch)

        const { data } = await query
        return { 
          data: data || [], 
          columns: ['Driver_ID', 'Driver_Name', 'Mobile_No', 'License_No', 'License_Expiry', 'Status', 'Vehicle_Plate']
        }
      }

      case 'vehicles': {
        let query = supabase
          .from('vehicles')
          .select('vehicle_plate, vehicle_type, status, fuel_type, insurance_expiry, registration_expiry, Branch_ID')
          .order('vehicle_plate')
          .limit(500)

        if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
        if (effectiveBranch && effectiveBranch !== 'All') query = query.eq('Branch_ID', effectiveBranch)

        const { data } = await query
        return { 
          data: data || [], 
          columns: ['vehicle_plate', 'vehicle_type', 'status', 'fuel_type', 'insurance_expiry', 'registration_expiry']
        }
      }

      case 'fuel': {
        let query = supabase
          .from('fuel_logs')
          .select('id, vehicle_plate, driver_name, fuel_date, fuel_type, liters, amount, station, Branch_ID')
          .order('fuel_date', { ascending: false })
          .limit(2000)

        if (filters.dateFrom) query = query.gte('fuel_date', filters.dateFrom)
        if (filters.dateTo) query = query.lte('fuel_date', filters.dateTo)
        if (effectiveBranch && effectiveBranch !== 'All') query = query.eq('Branch_ID', effectiveBranch)

        const { data } = await query
        return { 
          data: data || [], 
          columns: ['fuel_date', 'vehicle_plate', 'driver_name', 'fuel_type', 'liters', 'amount', 'station']
        }
      }

      case 'maintenance': {
        let query = supabase
          .from('vehicle_maintenance')
          .select('id, vehicle_plate, maintenance_type, description, status, priority, cost, created_at, resolved_at')
          .order('created_at', { ascending: false })
          .limit(1000)

        if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
        if (filters.dateTo) query = query.lte('created_at', filters.dateTo)
        if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)

        const { data } = await query
        return { 
          data: data || [], 
          columns: ['created_at', 'vehicle_plate', 'maintenance_type', 'status', 'priority', 'cost', 'description']
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
    default:
      return []
  }
}
