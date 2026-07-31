import { createAdminClient } from '@/utils/supabase/server'
import { todayTH } from '@/lib/utils/date-th'
import { COMPLETED_STATUSES, SETTLED_STATUSES } from '@/lib/constants/job-status'

export type OverdueJob = {
    Job_ID: string
    Customer_Name: string | null
    Driver_Name: string | null
    Vehicle_Plate: string | null
    Delivery_Date: string | null
    Plan_Date: string | null
    Job_Status: string | null
    Branch_ID: string | null
}

// Statuses that mean the job no longer needs delivery attention.
// Draft/Requested aren't live commitments yet, so they're excluded too.
const NOT_OVERDUE_STATUSES = [
    ...COMPLETED_STATUSES,
    ...SETTLED_STATUSES,
    'Cancelled', 'Failed', 'Draft', 'Requested',
]

/**
 * Jobs whose Delivery_Date is before today (Asia/Bangkok) but which are not
 * yet delivered/closed. Branch-scoped when branchId is given.
 */
export async function getOverdueJobs(branchId?: string): Promise<{ count: number; jobs: OverdueJob[] }> {
    try {
        const supabase = await createAdminClient()
        const today = todayTH()
        const excluded = `(${NOT_OVERDUE_STATUSES.map(s => `"${s}"`).join(',')})`

        let query = supabase
            .from('Jobs_Main')
            .select('Job_ID, Customer_Name, Driver_Name, Vehicle_Plate, Delivery_Date, Plan_Date, Job_Status, Branch_ID')
            .lt('Delivery_Date', today)
            .not('Job_Status', 'in', excluded)
            .order('Delivery_Date', { ascending: true })
            .limit(200)

        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        }

        const { data, error } = await query
        if (error || !data) return { count: 0, jobs: [] }
        return { count: data.length, jobs: data as OverdueJob[] }
    } catch {
        return { count: 0, jobs: [] }
    }
}
