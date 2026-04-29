import { getTodayJobStats, getTodayJobs, getRequestedJobs } from "@/lib/supabase/jobs"
import { getJobCreationData, createBulkJobs } from "@/app/planning/actions"
import { hasPermission, isAdmin, getUserBranchId } from "@/lib/permissions"
import { PlanningClient } from "@/components/planning/planning-client"
import { cookies } from "next/headers"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ 
    branch?: string; 
    date?: string;
  }>
}

async function PlanningContent({ branch, date }: { branch: string, date?: string }) {
  const currentBranchId = branch === 'All' ? undefined : branch
  const isAdminUser = await isAdmin()

  // Get stats, jobs and all requests for the target date
  const [stats, todayJobs, requestedJobs, jobCreationData, hasPriceView, hasDelete, hasCreate] = await Promise.all([
    getTodayJobStats(currentBranchId, date, date), // Reuse date for both start/end to get single day stats
    getTodayJobs(date, currentBranchId),
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
      selectedDate={date}
    />
  )
}

export default async function PlanningPage(props: PageProps) {
  const searchParams = await props.searchParams
  const userBranchId = await getUserBranchId()
  const branch = (userBranchId && userBranchId !== 'All') ? userBranchId : (searchParams.branch || 'All')
  const date = searchParams.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-primary animate-pulse font-black uppercase tracking-[0.3em] text-lg">
              INITIALIZING_LOGISTIC_PLANNER...
          </p>
      </div>
    }>
      <PlanningContent branch={branch} date={date} />
    </Suspense>
  )
}
