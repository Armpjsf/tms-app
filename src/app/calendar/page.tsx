export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getJobsForMonth } from "./actions"
import { CalendarClient } from "./calendar-client"
import { getJobCreationData } from "../planning/actions"

export default async function CalendarPage() {
  const now = new Date()
  const [jobs, creationData] = await Promise.all([
    getJobsForMonth(now.getFullYear(), now.getMonth() + 1),
    getJobCreationData()
  ])

  return (
    <DashboardLayout>
      <CalendarClient 
        initialJobs={jobs} 
        initialYear={now.getFullYear()} 
        initialMonth={now.getMonth() + 1} 
        {...creationData}
      />
    </DashboardLayout>
  )
}
