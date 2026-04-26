import { Suspense } from "react"
import { isSuperAdmin } from "@/lib/permissions"
import { cookies } from "next/headers"
import { DashboardContent } from "@/components/analytics/dashboard-content"
import { getMaintenanceSchedule } from "@/lib/supabase/maintenance-schedule"
import { AnalyticsClient } from "./analytics-client"

export const dynamic = 'force-dynamic' as const;

export default async function AnalyticsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams.branch || cookieStore.get("selectedBranch")?.value || 'All'
  const superAdmin = await isSuperAdmin()
  const maintenance = await getMaintenanceSchedule()

  return (
    <div className="space-y-12 pb-20 p-4 lg:p-10 bg-background">
        <AnalyticsClient 
            overdueCount={maintenance.overdue.length} 
            isSuperAdmin={superAdmin} 
        />

        {/* Main Intelligence Grid */}
        <Suspense fallback={<AnalyticsContentSkeleton />}>
            <DashboardContent 
                startDate={searchParams.startDate} 
                endDate={searchParams.endDate} 
                branchId={branchId} 
            />
        </Suspense>
    </div>
  )
}

function AnalyticsContentSkeleton() {
  return (
    <div className="space-y-12 animate-pulse p-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-56 bg-background rounded-br-[4rem] rounded-tl-[2rem] border border-border/5 shadow-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 h-[600px] bg-background rounded-br-[6rem] rounded-tl-[3rem] shadow-3xl border border-border/5" />
        <div className="h-[600px] bg-background rounded-br-[6rem] rounded-tl-[3rem] shadow-3xl border border-border/5" />
      </div>
    </div>
  )
}
