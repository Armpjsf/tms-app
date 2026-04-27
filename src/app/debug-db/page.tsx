
import { createAdminClient } from '@/utils/supabase/server'
import { getEffectiveBranchId, REVENUE_STATUSES, getThaiMonthBoundaries, formatDateSafe } from '@/lib/supabase/analytics-helpers'
import { getUserBranchId, isAdmin, isSuperAdmin } from '@/lib/permissions'

export default async function DebugDBPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
    const params = await searchParams
    const supabase = await createAdminClient()
    
    const { start, end } = getThaiMonthBoundaries()
    const sDate = formatDateSafe(start)!
    const eDate = formatDateSafe(end)!

    const userBranch = await getUserBranchId()
    const superAdmin = await isSuperAdmin()
    const regularAdmin = await isAdmin()
    
    const branchInput = params.branch || 'SKN'
    const effective = await getEffectiveBranchId(branchInput)

    const { count: filteredCount } = await supabase
        .from('Jobs_Main')
        .select('*', { count: 'exact', head: true })
        .eq('Branch_ID', effective || 'MISSING')
        .gte('Plan_Date', sDate)
        .lte('Plan_Date', eDate)
        .in('Job_Status', REVENUE_STATUSES)

    const { count: allCount } = await supabase
        .from('Jobs_Main')
        .select('*', { count: 'exact', head: true })
        .gte('Plan_Date', sDate)
        .lte('Plan_Date', eDate)
        .in('Job_Status', REVENUE_STATUSES)

    return (
        <div className="p-10 bg-slate-900 text-white font-mono">
            <h1 className="text-2xl font-bold mb-4 text-primary">Full Context Debugger</h1>
            
            <section className="mb-8 p-4 bg-slate-800 rounded-xl">
                <h2 className="text-xl font-bold text-emerald-400">User Identity</h2>
                <p>Is Super Admin: {String(superAdmin)}</p>
                <p>Is Admin/Manager: {String(regularAdmin)}</p>
                <p>User Default Branch (from Cookie/Session): <span className="text-amber-400">"{userBranch}"</span></p>
            </section>

            <section className="mb-8 p-4 bg-slate-800 rounded-xl">
                <h2 className="text-xl font-bold text-blue-400">Branch Resolution</h2>
                <p>Input from URL: <span className="text-amber-400">"{params.branch}"</span></p>
                <p>Resolved Effective ID: <span className="text-emerald-400">"{effective}"</span></p>
            </section>

            <section className="mb-8 p-4 bg-slate-800 rounded-xl">
                <h2 className="text-xl font-bold text-purple-400">Counts</h2>
                <p>All Branches: {allCount}</p>
                <p>Filtered by "{effective}": {filteredCount}</p>
            </section>
        </div>
    )
}
