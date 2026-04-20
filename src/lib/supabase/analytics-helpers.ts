// Analytics shared helpers, types, and constants
// Note: No "use server" here — this is consumed by server action files

import { createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId } from "@/lib/permissions"

export type FinancialJob = {
    Price_Cust_Total: number;
    Cost_Driver_Total: number;
    Price_Cust_Extra?: number | null;
    Cost_Driver_Extra?: number | null;
}

// Revenue-generating completed statuses
export const REVENUE_STATUSES = [
    'Completed', 'Delivered', 'Finished', 'Closed', 'Complete', 'Success', 'Done', 'Finish', 'Arrived', 'Arrived Destination',
    'completed', 'delivered', 'finished', 'closed', 'complete', 'success', 'done', 'finish', 'arrived',
    'เสร็จสิ้น', 'เรียบร้อย', 'ส่งสำเร็จ', 'ปิดงาน', 'สำเร็จ', 'ถึงที่หมาย', 'ถึงจุดหมาย', 'ถึงที่ส่ง', 'จบงาน',
    'Verified', 'Verified Jobs', 'Verified Success', 'ยืนยันแล้ว', 'ตรวจสอบแล้ว'
]

// "In-progress" statuses for pipeline revenue
export const PIPELINE_STATUSES = [
    'Requested', 'Pending', 'Confirmed', 'Picked Up', 'In Transit', 'Ongoing', 'On Route', 'Assigned',
    'requested', 'pending', 'confirmed', 'picked up', 'in transit', 'ongoing', 'on route', 'assigned',
    'ร้องขอ', 'รอพิจารณา', 'รอยืนยัน', 'รับสินค้าแล้ว', 'กำลังเดินทาง', 'กำลังดำเนินการ', 'รับงานแล้ว', 'มอบหมายแล้ว'
]

// Date helpers to avoid extra dependencies
export const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
export const differenceInDays = (d1: Date, d2: Date) => Math.floor(Math.abs(d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000))

// Safety helper for ISO date strings - uses local time to avoid UTC shifts
export const formatDateSafe = (dateInput: string | Date | null | undefined) => {
    try {
        if (!dateInput) return null
        const d = new Date(dateInput)
        if (isNaN(d.getTime())) return null
        
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    } catch {
        return null
    }
}

// Helper to get vehicle plates for a branch
export async function getBranchPlates(branchId: string) {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('Master_Vehicles')
        .select('Vehicle_Plate')
        .eq('Branch_ID', branchId)
    return (data || []).map(v => v.Vehicle_Plate).filter(Boolean) as string[]
}

// Common helper to resolve branch filtering
export async function getEffectiveBranchId(branchId?: string) {
    // If 'All' is explicitly requested, we return null (no filter) immediately
    if (branchId === 'All') return null

    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    return (targetBranchId === 'All' || !targetBranchId) ? null : targetBranchId
}
