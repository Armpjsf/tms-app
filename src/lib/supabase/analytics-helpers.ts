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

// Revenue-generating statuses used across all analytics
export const REVENUE_STATUSES = [
    'Completed', 'Delivered', 'Finished', 'Closed', 
    'เสร็จสิ้น', 'เรียบร้อย', 'ส่งสำเร็จ', 'ปิดงาน'
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
        .from('master_vehicles')
        .select('vehicle_plate')
        .eq('branch_id', branchId)
    return data?.map(v => v.vehicle_plate) || []
}

// Common helper to resolve branch filtering
export async function getEffectiveBranchId(branchId?: string) {
    const userBranchId = await getUserBranchId()
    const targetBranchId = (branchId && branchId !== 'All') ? branchId : userBranchId
    return targetBranchId === 'All' ? null : targetBranchId
}
