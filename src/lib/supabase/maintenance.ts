"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

export type RepairTicket = {
  Ticket_ID: string
  Date_Report: string | null
  Driver_ID: string | null
  Vehicle_Plate: string | null
  Issue_Type: string | null
  Description: string | null
  Priority: string | null
  Photo_Url: string | null
  Status: string | null
  Approver: string | null
  Cost_Total: number | null
  Date_Finish: string | null
  Remark: string | null
}

// ดึง Repair Tickets ทั้งหมด (pagination + search + filters)
export async function getAllRepairTickets(
  page = 1, 
  limit = 20, 
  query = '',
  startDate?: string,
  endDate?: string,
  status?: string
): Promise<{ data: RepairTicket[], count: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    
    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    
    let dbQuery = supabase
      .from('Repair_Tickets')
      .select('*', { count: 'exact' })
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { data: [], count: 0 }
    }

    dbQuery = dbQuery.order('Date_Report', { ascending: false })

    if (query) {
      dbQuery = dbQuery.or(`Ticket_ID.ilike.%${query}%,Vehicle_Plate.ilike.%${query}%`)
    }

    if (startDate) {
      dbQuery = dbQuery.gte('Date_Report', `${startDate}T00:00:00`)
    }

    if (endDate) {
      dbQuery = dbQuery.lte('Date_Report', `${endDate}T23:59:59`)
    }

    if (status && status !== 'All') {
      dbQuery = dbQuery.eq('Status', status)
    }

    const { data, error, count } = await dbQuery.range(offset, offset + limit - 1)
  
    if (error) {
      console.error('Error fetching repair tickets:', error)
      return { data: [], count: 0 }
    }
  
    return { data: data || [], count: count || 0 }
  } catch (e) {
    console.error('Exception fetching repair tickets:', e)
    return { data: [], count: 0 }
  }
}

// ดึง Tickets ที่รอดำเนินการ
export async function getPendingRepairTickets(): Promise<RepairTicket[]> {
  try {
    const supabase = await createClient()
    
    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    
    let query = supabase
      .from('Repair_Tickets')
      .select('*')
      .in('Status', ['Pending', 'In Progress', 'รอดำเนินการ', 'กำลังซ่อม'])

    if (branchId && branchId !== 'All') {
        query = query.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return []
    }

    const { data, error } = await query
      .order('Date_Report', { ascending: false })
    
    if (error) {
      console.error('Error fetching pending tickets:', error)
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching pending tickets:', e)
    return []
  }
}

// นับสถิติ Repair Tickets
export async function getRepairTicketStats() {
  try {
    const supabase = await createClient()
    
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    
    let query = supabase.from('Repair_Tickets').select('Status')

    if (branchId && branchId !== 'All') {
        query = query.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { total: 0, pending: 0, inProgress: 0, completed: 0 }
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching repair stats:', error)
      return { total: 0, pending: 0, inProgress: 0, completed: 0 }
    }
    
    const tickets = data || []
    return {
      total: tickets.length,
      pending: tickets.filter(t => t.Status === 'Pending' || t.Status === 'รอดำเนินการ').length,
      inProgress: tickets.filter(t => t.Status === 'In Progress' || t.Status === 'กำลังซ่อม').length,
      completed: tickets.filter(t => t.Status === 'Completed' || t.Status === 'เสร็จสิ้น').length,
    }
  } catch (e) {
    console.error('Exception fetching repair stats:', e)
    return { total: 0, pending: 0, inProgress: 0, completed: 0 }
  }
}
