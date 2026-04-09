import { getTodayJobStats, getTodayJobs, getRequestedJobs } from "@/lib/supabase/jobs"
import { getJobCreationData, createBulkJobs } from "@/app/planning/actions"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { PlanningClient } from "@/components/planning/planning-client"
import { cookies } from "next/headers"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ 
    branch?: string; 
  }>
}

async function PlanningContent({ branch }: { branch: string }) {
  const currentBranchId = branch === 'All' ? undefined : branch
  const isAdminUser = await isAdmin()

  // Get today's stats, jobs and all requests
  const [stats, todayJobs, requestedJobs, jobCreationData, hasPriceView, hasDelete, hasCreate] = await Promise.all([
    getTodayJobStats(currentBranchId),
    getTodayJobs(currentBranchId),
    getRequestedJobs(currentBranchId),
    getJobCreationData(),
    hasPermission('job_price_view'),
    hasPermission('job_delete'),
    hasPermission('job_create')
  ])

  // Grant access if either have explicit permission OR is an admin
  const canViewPrice = isAdminUser || hasPriceView
  const canDelete = isAdminUser || hasDelete
  const canCreate = isAdminUser || hasCreate

  return (
    <PlanningClient 
      stats={stats}
      todayJobs={todayJobs}
      requestedJobs={requestedJobs}
      jobCreationData={jobCreationData}
      canViewPrice={canViewPrice}
      canDelete={canDelete}
      canCreate={canCreate}
      createBulkJobs={createBulkJobs}
      branchId={branch}
    />
  )
}

export default async function PlanningPage(props: PageProps) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branch = searchParams.branch || cookieStore.get('selectedBranch')?.value || 'All'

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-primary animate-pulse font-black uppercase tracking-[0.3em] text-lg">
              INITIALIZING_LOGISTIC_PLANNER...
          </p>
      </div>
    }>
      <PlanningContent branch={branch} />
    </Suspense>
  )
}
