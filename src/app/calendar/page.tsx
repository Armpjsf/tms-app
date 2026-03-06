export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getJobsForMonth } from "./actions"
import { CalendarClient } from "./calendar-client"

export default async function CalendarPage() {
  const now = new Date()
  const jobs = await getJobsForMonth(now.getFullYear(), now.getMonth() + 1)

  return (
    <DashboardLayout>
      <CalendarClient 
        initialJobs={jobs} 
        initialYear={now.getFullYear()} 
        initialMonth={now.getMonth() + 1} 
      />
    </DashboardLayout>
  )
}
