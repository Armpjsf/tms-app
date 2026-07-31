import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { getOverdueJobs } from '@/lib/actions/overdue-actions'
import { getUserBranchId, isAdmin } from '@/lib/permissions'

/**
 * Dashboard banner: warns admins about jobs whose delivery date has passed
 * while the job is still not delivered/closed. Renders nothing when there
 * are none, or for non-admin (customer/driver) views.
 */
export async function OverdueAlertBanner() {
    const admin = await isAdmin()
    if (!admin) return null

    const branchId = await getUserBranchId()
    const { count, jobs } = await getOverdueJobs(branchId && branchId !== 'All' ? branchId : undefined)
    if (!count) return null

    const preview = jobs.slice(0, 4)

    return (
        <Link
            href="/planning"
            className="group flex items-center gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 mb-4 transition-all hover:bg-rose-500/15 hover:border-rose-500/50"
        >
            <div className="shrink-0 w-11 h-11 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center animate-pulse">
                <AlertTriangle size={22} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                    มีงานเลยกำหนดส่งแต่ยังไม่เสร็จ {count.toLocaleString()} รายการ
                </p>
                <p className="text-xs font-medium text-muted-foreground truncate">
                    {preview.map(j => `${j.Job_ID}${j.Customer_Name ? ` (${j.Customer_Name})` : ''}`).join(' · ')}
                    {count > preview.length ? ` และอีก ${count - preview.length} รายการ` : ''}
                </p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-rose-500/60 group-hover:translate-x-0.5 transition-transform" />
        </Link>
    )
}
