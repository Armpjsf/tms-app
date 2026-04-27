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
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
        if (isNaN(d.getTime())) return null
        
        // Always use Thai timezone for date strings if possible
        const thaiStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) // YYYY-MM-DD
        return thaiStr
    } catch {
        return null
    }
}

/**
 * Get Thailand-local date components
 */
export const getThaiNow = () => {
    const now = new Date()
    const thaiStr = now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
    return new Date(thaiStr)
}

/**
 * Get Thailand-local month boundaries
 */
export const getThaiMonthBoundaries = () => {
    const now = getThaiNow()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { start, end }
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
    const userBranchId = await getUserBranchId()
    let target = (branchId && branchId.toLowerCase() !== 'all') ? branchId : userBranchId
    
    if (!target || target.toLowerCase() === 'all') return null

    // Safety: If the target looks like a full name (longer than 3-4 chars), 
    // it might be a name passed from a legacy UI component.
    if (target.length > 5) {
        try {
            const supabase = await createAdminClient()
            const { data } = await supabase.from('Master_Branches').select('Branch_ID').ilike('Branch_Name', target).maybeSingle()
            if (data?.Branch_ID) target = data.Branch_ID
        } catch {
            // Fallback to original target if lookup fails
        }
    }

    return target
}
