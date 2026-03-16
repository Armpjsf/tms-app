"use server"

import { createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'
import { cookies } from 'next/headers'

export interface ScheduledService {
  vehicle_plate: string
  vehicle_type: string
  service_type: string
  due_date: string
  days_until: number
  status: 'overdue' | 'due_soon' | 'upcoming'
  last_service?: string | null
  odometer?: number | null
}

export interface MaintenanceScheduleData {
  overdue: ScheduledService[]
  dueSoon: ScheduledService[]   // within 7 days
  upcoming: ScheduledService[]   // 8-30 days
  activeRepairs: number
  completedThisMonth: number
  totalCostThisMonth: number
  vehicleHealthSummary: {
    vehicle_plate: string
    openTickets: number
    totalCost: number
    lastRepair: string | null
  }[]
}

export async function getMaintenanceSchedule(): Promise<MaintenanceScheduleData> {
  const supabase = await createAdminClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()
  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get('selectedBranch')?.value
  
  const now = new Date()
  // Use a true 30-day sliding window for "Mission Ready" as per UI description
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Get all vehicles
  // SCHEMA FIX: status -> active_status, registration_expiry -> tax_expiry
  let vehicleQuery = supabase
    .from('master_vehicles')
    .select('vehicle_plate, vehicle_type, active_status, insurance_expiry, tax_expiry, last_service_date, last_service_odometer, next_service_mileage, current_mileage')

  // SCHEMA FIX: Branch filtering on vehicles uses 'branch_id' (lowercase)
  if (isAdmin) {
    if (selectedBranch && selectedBranch !== 'All') {
      vehicleQuery = vehicleQuery.eq('branch_id', selectedBranch)
    }
  } else if (branchId) {
    vehicleQuery = vehicleQuery.eq('branch_id', branchId)
  }

  const { data: vehicles } = await vehicleQuery

  // Get active repair tickets
  let activeQuery = supabase
    .from('Repair_Tickets')
    .select('Ticket_ID, Vehicle_Plate, Status, Date_Report, Cost_Total, Date_Finish')
  
  if (isAdmin) {
    if (selectedBranch && selectedBranch !== 'All') {
      // Repair_Tickets uses 'Branch_ID' (uppercase)
      activeQuery = activeQuery.eq('Branch_ID', selectedBranch)
    }
  } else if (branchId) {
    activeQuery = activeQuery.eq('Branch_ID', branchId)
  }

  const { data: tickets } = await activeQuery

  const allTickets = tickets || []
  const allVehicles = vehicles || []

  // Active repairs
  const activeRepairs = allTickets.filter(t => 
    t.Status === 'Pending' || t.Status === 'In Progress' || 
    t.Status === 'รอดำเนินการ' || t.Status === 'กำลังซ่อม'
  ).length

  // Completed in last 30 days (Sliding Window)
  const recentTickets = allTickets.filter(t => 
    (t.Date_Finish || t.Date_Report || '') >= thirtyDaysAgo
  )
  const completedThisMonth = recentTickets.filter(t => 
    t.Status === 'Completed' || t.Status === 'เสร็จสิ้น'
  ).length
  const totalCostThisMonth = recentTickets
    .filter(t => t.Status === 'Completed' || t.Status === 'เสร็จสิ้น')
    .reduce((s, t) => s + (t.Cost_Total || 0), 0)

  // Build scheduled services from vehicle data
  const services: ScheduledService[] = []
  const dayMs = 86400000

  for (const v of allVehicles) {
    // SCHEMA FIX: active_status
    if (v.active_status === 'Inactive') continue

    // Insurance expiry check
    if (v.insurance_expiry) {
      const expiry = new Date(v.insurance_expiry)
      const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / dayMs)
      if (daysUntil <= 30) {
        services.push({
          vehicle_plate: v.vehicle_plate,
          vehicle_type: v.vehicle_type || 'Unknown',
          service_type: 'ต่อประกันภัย',
          due_date: v.insurance_expiry,
          days_until: daysUntil,
          status: daysUntil <= 0 ? 'overdue' : daysUntil <= 7 ? 'due_soon' : 'upcoming',
        })
      }
    }

    // Registration expiry check (SCHEMA FIX: tax_expiry)
    if (v.tax_expiry) {
      const expiry = new Date(v.tax_expiry)
      const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / dayMs)
      if (daysUntil <= 30) {
        services.push({
          vehicle_plate: v.vehicle_plate,
          vehicle_type: v.vehicle_type || 'Unknown',
          service_type: 'ต่อทะเบียน',
          due_date: v.tax_expiry,
          days_until: daysUntil,
          status: daysUntil <= 0 ? 'overdue' : daysUntil <= 7 ? 'due_soon' : 'upcoming',
        })
      }
    }

    // Periodic service check (every 6 months or based on mileage)
    if (v.last_service_date) {
      const lastService = new Date(v.last_service_date)
      const nextService = new Date(lastService.getTime() + 180 * dayMs) // ~6 months
      const daysUntil = Math.ceil((nextService.getTime() - now.getTime()) / dayMs)
      
      // Mileage check: If current_mileage > next_service_mileage OR within 1000km
      const isMileageOverdue = v.next_service_mileage && v.current_mileage && v.current_mileage >= v.next_service_mileage
      const isMileageSoon = v.next_service_mileage && v.current_mileage && (v.next_service_mileage - v.current_mileage) <= 1000

      if (daysUntil <= 30 || isMileageSoon || isMileageOverdue) {
        let status: 'overdue' | 'due_soon' | 'upcoming' = 'upcoming'
        if (daysUntil <= 0 || isMileageOverdue) status = 'overdue'
        else if (daysUntil <= 7 || isMileageSoon) status = 'due_soon'

        services.push({
          vehicle_plate: v.vehicle_plate,
          vehicle_type: v.vehicle_type || 'Unknown',
          service_type: isMileageOverdue ? 'เซอร์วิส (ไมล์เกินกำหนด)' : isMileageSoon ? 'เซอร์วิส (ใกล้ถึงระยะ)' : 'เซอร์วิสตามระยะ',
          due_date: nextService.toISOString().split('T')[0],
          days_until: daysUntil,
          status,
          last_service: v.last_service_date,
          odometer: v.current_mileage,
        })
      }
    }
  }

  // Vehicle health summary
  const vehicleTicketMap = new Map<string, { openTickets: number; totalCost: number; lastRepair: string | null }>()
  for (const t of allTickets) {
    const plate = t.Vehicle_Plate || 'Unknown'
    const entry = vehicleTicketMap.get(plate) || { openTickets: 0, totalCost: 0, lastRepair: null }
    if (t.Status === 'Pending' || t.Status === 'In Progress' || t.Status === 'รอดำเนินการ' || t.Status === 'กำลังซ่อม') {
      entry.openTickets++
    }
    entry.totalCost += t.Cost_Total || 0
    if (!entry.lastRepair || (t.Date_Report && t.Date_Report > entry.lastRepair)) {
      entry.lastRepair = t.Date_Report
    }
    vehicleTicketMap.set(plate, entry)
  }

  const vehicleHealthSummary = Array.from(vehicleTicketMap.entries())
    .map(([plate, data]) => ({
      vehicle_plate: plate,
      ...data,
    }))
    .sort((a, b) => b.openTickets - a.openTickets || b.totalCost - a.totalCost)
    .slice(0, 10)

  return {
    overdue: services.filter(s => s.status === 'overdue').sort((a, b) => a.days_until - b.days_until),
    dueSoon: services.filter(s => s.status === 'due_soon').sort((a, b) => a.days_until - b.days_until),
    upcoming: services.filter(s => s.status === 'upcoming').sort((a, b) => a.days_until - b.days_until),
    activeRepairs,
    completedThisMonth,
    totalCostThisMonth,
    vehicleHealthSummary,
  }
}
