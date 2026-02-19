"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'

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
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()
  
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Get all vehicles
  let vehicleQuery = supabase
    .from('master_vehicles')
    .select('vehicle_plate, vehicle_type, status, insurance_expiry, registration_expiry, last_service_date, last_service_odometer')

  if (branchId && !isAdmin) {
    vehicleQuery = vehicleQuery.eq('Branch_ID', branchId)
  }

  const { data: vehicles } = await vehicleQuery

  // Get active repair tickets (for active repairs count)
  let activeQuery = supabase
    .from('Repair_Tickets')
    .select('Ticket_ID, Vehicle_Plate, Status, Date_Report, Cost_Total, Date_Finish')
  
  if (branchId && !isAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeQuery = (activeQuery as any).eq('Branch_ID', branchId)
  }

  const { data: tickets } = await activeQuery

  const allTickets = tickets || []
  const allVehicles = vehicles || []

  // Active repairs
  const activeRepairs = allTickets.filter(t => 
    t.Status === 'Pending' || t.Status === 'In Progress' || 
    t.Status === 'รอดำเนินการ' || t.Status === 'กำลังซ่อม'
  ).length

  // Completed this month
  const monthTickets = allTickets.filter(t => 
    (t.Date_Finish || t.Date_Report || '') >= monthStart
  )
  const completedThisMonth = monthTickets.filter(t => 
    t.Status === 'Completed' || t.Status === 'เสร็จสิ้น'
  ).length
  const totalCostThisMonth = monthTickets
    .filter(t => t.Status === 'Completed' || t.Status === 'เสร็จสิ้น')
    .reduce((s, t) => s + (t.Cost_Total || 0), 0)

  // Build scheduled services from vehicle data
  const services: ScheduledService[] = []
  const dayMs = 86400000

  for (const v of allVehicles) {
    if (v.status === 'Inactive') continue

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

    // Registration expiry check
    if (v.registration_expiry) {
      const expiry = new Date(v.registration_expiry)
      const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / dayMs)
      if (daysUntil <= 30) {
        services.push({
          vehicle_plate: v.vehicle_plate,
          vehicle_type: v.vehicle_type || 'Unknown',
          service_type: 'ต่อทะเบียน',
          due_date: v.registration_expiry,
          days_until: daysUntil,
          status: daysUntil <= 0 ? 'overdue' : daysUntil <= 7 ? 'due_soon' : 'upcoming',
        })
      }
    }

    // Periodic service check (every 6 months from last service)
    if (v.last_service_date) {
      const lastService = new Date(v.last_service_date)
      const nextService = new Date(lastService.getTime() + 180 * dayMs) // ~6 months
      const daysUntil = Math.ceil((nextService.getTime() - now.getTime()) / dayMs)
      if (daysUntil <= 30) {
        services.push({
          vehicle_plate: v.vehicle_plate,
          vehicle_type: v.vehicle_type || 'Unknown',
          service_type: 'เซอร์วิสตามระยะ',
          due_date: nextService.toISOString().split('T')[0],
          days_until: daysUntil,
          status: daysUntil <= 0 ? 'overdue' : daysUntil <= 7 ? 'due_soon' : 'upcoming',
          last_service: v.last_service_date,
          odometer: v.last_service_odometer,
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
