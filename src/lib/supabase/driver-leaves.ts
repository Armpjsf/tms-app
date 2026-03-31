"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId } from '@/lib/permissions'

export interface DriverLeave {
  id: string
  Driver_ID: string
  Driver_Name: string | null
  Leave_Type: string
  Start_Date: string
  End_Date: string
  Reason: string | null
  Status: string
  Approved_By: string | null
  Created_At: string
}

export async function getDriverLeaves(month?: number, year?: number): Promise<DriverLeave[]> {
  const supabase = await createClient()
  const now = new Date()
  const m = month || now.getMonth() + 1
  const y = year || now.getFullYear()

  const firstDay = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0)
  const lastDayStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

  try {
    const { data, error } = await supabase
      .from('Driver_Leaves')
      .select('*')
      .or(`Start_Date.lte.${lastDayStr},End_Date.gte.${firstDay}`)
      .order('Start_Date', { ascending: true })

    if (error) return []
    return (data || []) as DriverLeave[]
  } catch {
    return []
  }
}

export async function getMyLeaves(driverId: string): Promise<DriverLeave[]> {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from('Driver_Leaves')
      .select('*')
      .eq('Driver_ID', driverId)
      .order('Start_Date', { ascending: false })
      .limit(50)

    if (error) return []
    return (data || []) as DriverLeave[]
  } catch {
    return []
  }
}

export async function createLeaveRequest(data: {
  Driver_ID: string
  Driver_Name: string
  Leave_Type: string
  Start_Date: string
  End_Date: string
  Reason?: string
}) {
  const supabase = await createClient()
  try {
    const { error } = await supabase.from('Driver_Leaves').insert({
      Driver_ID: data.Driver_ID,
      Driver_Name: data.Driver_Name,
      Leave_Type: data.Leave_Type,
      Start_Date: data.Start_Date,
      End_Date: data.End_Date,
      Reason: data.Reason || null,
      Status: 'Pending',
    })
    if (error) return { success: false, error: error.message }

    // Trigger Admin Alert (Push & Toast)
    try {
        const { sendPushToAdmins } = await import('@/lib/actions/push-actions')
        
        // Fetch driver's branch for filtering
        const { data: driver } = await supabase
            .from('Master_Drivers')
            .select('Branch_ID')
            .eq('Driver_ID', data.Driver_ID)
            .single()

        await sendPushToAdmins({
            title: `📅 แจ้งลางานใหม่: ${data.Driver_Name}`,
            body: `ประเภท: ${data.Leave_Type} (${data.Start_Date} ถึง ${data.End_Date})`,
            url: '/drivers',
            type: 'standard'
        }, driver?.Branch_ID)
    } catch (e) {
        console.error("Push broadcast failed:", e)
    }

    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: String(e) }
  }
}

export async function updateLeaveStatus(leaveId: string, status: 'Approved' | 'Rejected', approvedBy: string) {
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('Driver_Leaves')
      .update({ Status: status, Approved_By: approvedBy, Updated_At: new Date().toISOString() })
      .eq('id', leaveId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: String(e) }
  }
}
