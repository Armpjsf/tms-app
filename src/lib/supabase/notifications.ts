"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getChatSchema } from './chat'
import { getUserBranchId, isAdmin as isAnyAdmin } from '@/lib/permissions'
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
  const isAdmin = await isAnyAdmin()
  const supabase = isAdmin ? createAdminClient() : await createClient()
  const branchId = await getUserBranchId()
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
    // 3. New Shipment Requests (Pending)
    let requestQuery = supabase
      .from('Jobs_Main')
      .select('Job_ID, Customer_Name, Created_At, Job_Status, Plan_Date')
      .eq('Job_Status', 'Requested')
      .order('Created_At', { ascending: false })
      .limit(5)

    if (isAdmin && selectedBranch && selectedBranch !== 'All') {
      requestQuery = requestQuery.eq('Branch_ID', selectedBranch)
    } else if (branchId && !isAdmin) {
      requestQuery = requestQuery.eq('Branch_ID', branchId)
    }

    const { data: requests } = await requestQuery

    if (requests) {
      requests.forEach((req: { Job_ID: string, Customer_Name?: string, Created_At?: string, Plan_Date?: string }) => {
        notifications.push({
          id: `request-${req.Job_ID}`,
          type: 'system',
          title: '🆕 คำขอส่งสินค้าใหม่',
          message: `${req.Customer_Name || 'ลูกค้า'} ขอรถสำหรับวันที่ ${req.Plan_Date || 'ไม่ระบุ'}`,
          timestamp: req.Created_At || now.toISOString(),
          read: false,
          href: '/planning',
          severity: 'info'
        })
      })
    }
  } catch {
    // Request query error
  }

  try {
    // 4. Maintenance Due Soon (within 7 days)
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

  try {
    // 4. Unread Chat Messages from Drivers
    // Detect correct schema resilience
    const { tableName: chatTableName, columns: chatCols } = await getChatSchema(supabase)

    const chatQuery = supabase
      .from(chatTableName)
      .select('*')
      .eq(chatCols.receiver_id, 'admin')
      .eq(chatCols.is_read, false)
      .order(chatCols.created_at, { ascending: false })
      .limit(10)

    const { data: unreadMsgs } = await chatQuery

    if (unreadMsgs && unreadMsgs.length > 0) {
      // Get driver names for better display
      const { data: drivers } = await supabase
        .from('Master_Drivers')
        .select('Driver_ID, Driver_Name, Branch_ID')
        .in('Driver_ID', (unreadMsgs as Record<string, string>[]).map(m => m[chatCols.sender_id]))

      const driverMap = new Map<string, Record<string, string>>()
      if (drivers) {
        drivers.forEach(d => driverMap.set(d.Driver_ID, d))
      }

      (unreadMsgs as Record<string, string>[]).forEach((msg: Record<string, string>) => {
        const senderId = msg[chatCols.sender_id]
        const driver = driverMap.get(senderId)
        
        // Filter by branch if needed
        if (isAdmin && selectedBranch && selectedBranch !== 'All') {
            if (driver?.Branch_ID !== selectedBranch) return
        } else if (branchId && !isAdmin) {
            if (driver?.Branch_ID !== branchId) return
        }

        notifications.push({
          id: `chat-${msg[chatCols.id]}`,
          type: 'system',
          title: `💬 ข้อความใหม่จาก ${driver?.Driver_Name || senderId}`,
          message: msg[chatCols.message],
          timestamp: msg[chatCols.created_at],
          read: false,
          href: `/monitoring?driver=${senderId}&openChat=true`,
          severity: 'info'
        })
      })
    }
  } catch {
    // Chat notification error
  }

  try {
    // 5. Idle Detection (Smart Alert)
    // Find jobs that are active (In Transit/Progress) but haven't sent a GPS update or moved for 30 mins
    const { data: activeJobs } = await supabase
      .from('Jobs_Main')
      .select('Job_ID, Driver_ID, Driver_Name, Vehicle_Plate, updated_at')
      .in('Job_Status', ['In Transit', 'In Progress', 'Arrived Pickup', 'Arrived Dropoff'])

    if (activeJobs && activeJobs.length > 0) {
      for (const job of activeJobs) {
        if (!job.Driver_ID) continue

        // Get last 2 logs to check movement
        const { data: recentLogs } = await supabase
          .from('gps_logs')
          .select('latitude, longitude, timestamp')
          .eq('driver_id', job.Driver_ID)
          .order('timestamp', { ascending: false })
          .limit(2)

        if (recentLogs && recentLogs.length > 0) {
          const latest = recentLogs[0]
          const lastUpdate = new Date(latest.timestamp)
          const idleMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

          if (idleMinutes > 30) {
            // Check if they are actually moving (if 2 logs exist)
            let isMoving = true
            if (recentLogs.length === 2) {
               const prev = recentLogs[1]
               // If distance < 10 meters, consider stopped
               const dist = Math.sqrt(Math.pow(latest.latitude - prev.latitude, 2) + Math.pow(latest.longitude - prev.longitude, 2))
               if (dist < 0.0001) isMoving = false
            }

            if (!isMoving || idleMinutes > 60) {
                notifications.push({
                    id: `idle-${job.Job_ID}`,
                    type: 'system',
                    title: '🐢 รถจอดแช่นานผิดปกติ',
                    message: `${job.Driver_Name || 'คนขับ'} (${job.Vehicle_Plate || job.Job_ID}) จอดนิ่งเกิน ${Math.round(idleMinutes)} นาที`,
                    timestamp: latest.timestamp,
                    read: false,
                    href: `/monitoring?driver=${job.Driver_ID}`,
                    severity: idleMinutes > 60 ? 'critical' : 'warning'
                })
            }
          }
        }
      }
    }
  } catch {
    // Idle detection error
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
