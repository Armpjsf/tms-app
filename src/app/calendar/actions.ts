"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, getCustomerId, isSuperAdmin } from "@/lib/permissions"

export interface CalendarJob {
  Job_ID: string
  Plan_Date: string
  Job_Status: string
  Customer_Name: string | null
  Driver_Name: string | null
  Route_Name: string | null
  Vehicle_Plate: string | null
  Origin_Location: string | null
  Dest_Location: string | null
}

export async function getJobsForMonth(year: number, month: number) {
  const isAdmin = await isSuperAdmin()
  const supabase = isAdmin ? await createAdminClient() : await createClient()
  const customerId = await getCustomerId()
  const userBranchId = await getUserBranchId()

  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0)
  const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

  let query = supabase
    .from('Jobs_Main')
    .select('Job_ID, Plan_Date, Job_Status, Customer_Name, Driver_Name, Route_Name, Vehicle_Plate, Origin_Location, Dest_Location')
    .gte('Plan_Date', firstDay)
    .lte('Plan_Date', lastDayStr)
    .order('Plan_Date', { ascending: true })

  if (customerId) {
    query = query.eq('Customer_ID', customerId)
  } else if (userBranchId && userBranchId !== 'All') {
    query = query.eq('Branch_ID', userBranchId)
  }

  const { data, error } = await query
  if (error) return []
  
  return (data || []) as CalendarJob[]
}
