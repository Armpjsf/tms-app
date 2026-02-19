"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'
import { cookies } from 'next/headers'

export interface AppNotification {
  id: string
  type: 'sos' | 'job_status' | 'maintenance' | 'system'
  title: string
  message: string
  timestamp: string
  read: boolean
  href?: string
  severity: 'critical' | 'warning' | 'info'
}

// Generate notifications from existing data sources
export async function getNotifications(): Promise<AppNotification[]> {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()
  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get('selectedBranch')?.value
  
  const notifications: AppNotification[] = []
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  try {
    // 1. SOS Alerts (Critical) — last 24 hours
    const sosQuery = supabase
      .from('sos_alerts')
      .select('id, driver_name, message, created_at, status, location_name')
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: sosAlerts } = await sosQuery

    if (sosAlerts) {
      sosAlerts.forEach(sos => {
        notifications.push({
          id: `sos-${sos.id}`,
          type: 'sos',
          title: '🚨 SOS Alert',
          message: `${sos.driver_name}: ${sos.message || 'ขอความช่วยเหลือ'} ${sos.location_name ? `@ ${sos.location_name}` : ''}`,
          timestamp: sos.created_at,
          read: sos.status === 'resolved',
          href: '/sos',
          severity: 'critical'
        })
      })
    }
  } catch {
    // SOS table may not exist
  }

  try {
    // 2. Recent Job Status Changes — jobs updated today
    let jobQuery = supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Driver_Name, Customer_Name, updated_at')
      .eq('Plan_Date', today)
      .in('Job_Status', ['Failed', 'Cancelled', 'Completed', 'Delivered'])
      .order('updated_at', { ascending: false })
      .limit(10)

    if (isAdmin && selectedBranch && selectedBranch !== 'All') {
      jobQuery = jobQuery.eq('Branch_ID', selectedBranch)
    } else if (branchId && !isAdmin) {
      jobQuery = jobQuery.eq('Branch_ID', branchId)
    }

    const { data: statusJobs } = await jobQuery

    if (statusJobs) {
      // Only show failures prominently
      statusJobs.filter(j => j.Job_Status === 'Failed' || j.Job_Status === 'Cancelled').forEach(job => {
        notifications.push({
          id: `job-fail-${job.Job_ID}`,
          type: 'job_status',
          title: job.Job_Status === 'Failed' ? '❌ งานล้มเหลว' : '⚠️ งานถูกยกเลิก',
          message: `${job.Job_ID} • ${job.Customer_Name || 'ลูกค้า'} (${job.Driver_Name || 'ไม่ระบุคนขับ'})`,
          timestamp: job.updated_at || now.toISOString(),
          read: false,
          href: '/jobs/history',
          severity: job.Job_Status === 'Failed' ? 'critical' : 'warning'
        })
      })

      // Show completed count as info
      const completedCount = statusJobs.filter(j => j.Job_Status === 'Completed' || j.Job_Status === 'Delivered').length
      if (completedCount > 0) {
        notifications.push({
          id: `job-completed-${today}`,
          type: 'job_status',
          title: '✅ งานเสร็จวันนี้',
          message: `${completedCount} งานเสร็จสิ้นเรียบร้อย`,
          timestamp: now.toISOString(),
          read: true,
          href: '/jobs/history',
          severity: 'info'
        })
      }
    }
  } catch {
    // Jobs table query error
  }

  try {
    // 3. Maintenance Due Soon (within 7 days)
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: maintenanceDue } = await supabase
      .from('vehicle_maintenance')
      .select('id, vehicle_plate, maintenance_type, next_maintenance_date')
      .lte('next_maintenance_date', weekFromNow)
      .gte('next_maintenance_date', today)
      .limit(5)

    if (maintenanceDue) {
      maintenanceDue.forEach(m => {
        notifications.push({
          id: `maint-${m.id}`,
          type: 'maintenance',
          title: '🔧 ซ่อมบำรุงใกล้ถึง',
          message: `${m.vehicle_plate} — ${m.maintenance_type} (${m.next_maintenance_date})`,
          timestamp: now.toISOString(),
          read: false,
          href: '/maintenance',
          severity: 'warning'
        })
      })
    }
  } catch {
    // Maintenance table may not have next_maintenance_date
  }

  // Sort: critical first, then by timestamp
  return notifications.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

export async function getUnreadCount(): Promise<number> {
  const notifications = await getNotifications()
  return notifications.filter(n => !n.read).length
}
