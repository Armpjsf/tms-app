export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getTodayJobStats, getTodayJobs, getRequestedJobs } from "@/lib/supabase/jobs"
import { getJobCreationData, createBulkJobs } from "@/app/planning/actions"
import { hasPermission } from "@/lib/permissions"
import { PlanningClient } from "@/components/planning/planning-client"
// ...

export default async function PlanningPage() {
  // Get today's stats, jobs and all requests
  const [stats, todayJobs, requestedJobs, jobCreationData, canViewPrice, canDelete, canCreate] = await Promise.all([
    getTodayJobStats(),
    getTodayJobs(),
    getRequestedJobs(),
    getJobCreationData(),
    hasPermission('job_price_view'),
    hasPermission('job_delete'),
    hasPermission('job_create')
  ])

  return (
    <DashboardLayout>
      <PlanningClient 
        stats={stats}
        todayJobs={todayJobs}
        requestedJobs={requestedJobs}
        jobCreationData={jobCreationData}
        canViewPrice={canViewPrice}
        canDelete={canDelete}
        canCreate={canCreate}
        createBulkJobs={createBulkJobs}
      />
    </DashboardLayout>
  )
}
