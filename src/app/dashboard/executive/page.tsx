import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ExecutiveDashboardClient } from "@/components/dashboard/executive-dashboard-client"
import { 
    getExecutiveDashboardUnified,
    getFuelAnomalyAlerts
} from "@/lib/supabase/financial-analytics"
import { getSetting } from "@/lib/supabase/settings"
import { cookies } from "next/headers"
import { Suspense } from "react"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ 
    branch?: string; 
  }>
}

async function ExecutiveContent({ branch }: { branch: string }) {
    const currentMonth = new Date().toISOString().slice(0, 7)
    
    // Parallel Fetching - Server Side
    const [
        unifiedData,
        fuelAlerts,
        savedRemark
    ] = await Promise.all([
        getExecutiveDashboardUnified(branch),
        getFuelAnomalyAlerts(branch),
        getSetting(`exec_remark_${currentMonth}_${branch}`, "")
    ])

    // Mock/Constant data for now as per original
    const compliance = { score: 94, status: 'Excellent', details: [{ label: 'Insurance', value: 100 }, { label: 'Registration', value: 88 }, { label: 'Maintenance', value: 92 }] }
    const health = { score: 88, status: 'Healthy', metrics: [{ label: 'Uptime', value: 98 }, { label: 'Utilization', value: 76 }, { label: 'Breakdowns', value: 2 }] }

    return (
        <ExecutiveDashboardClient 
            initialData={{ ...unifiedData, fuelAlerts, compliance, health }}
            initialRemark={savedRemark}
            branchId={branch}
            currentMonth={currentMonth}
        />
    )
}

export default async function ExecutiveDashboardPage(props: PageProps) {
    const searchParams = await props.searchParams
    const cookieStore = await cookies()
    const branch = searchParams.branch || cookieStore.get('selectedBranch')?.value || 'All'

    return (
        <DashboardLayout>
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-primary animate-pulse font-black uppercase tracking-[0.3em] text-lg">
                        LOADING_EXECUTIVE_INTELLIGENCE...
                    </p>
                </div>
            }>
                <ExecutiveContent branch={branch} />
            </Suspense>
        </DashboardLayout>
    )
}
