

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getTodayJobStats, getWeeklyJobStats, getJobStatusDistribution, getTodayFinancials } from "@/lib/supabase/jobs"
import { createClient } from "@/utils/supabase/server"
import { isCustomer, isSuperAdmin, getCustomerId } from "@/lib/permissions"
import { getFinancialStats } from "@/lib/supabase/analytics"
import { cookies } from "next/headers"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getUserBranchId } from "@/lib/permissions"

export default async function DashboardPage(props: {
  searchParams: Promise<{ branch?: string }>
}) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams?.branch || cookieStore.get("selectedBranch")?.value || 'All'
  
  const customerMode = await isCustomer()

  // ดึงข้อมูลจาก Supabase (Pass branchId if SuperAdmin)
  const [jobStats, sosCount, weeklyStats, statusDist, financials, financialStats] = await Promise.all([
    getTodayJobStats(branchId),
    getSosCount(branchId),
    getWeeklyJobStats(branchId),
    getJobStatusDistribution(branchId),
    getTodayFinancials(branchId),
    getFinancialStats(undefined, undefined, branchId), // New Financial Stats (Month to date)
  ])

  return (
    <DashboardLayout>
      <DashboardClient 
        branchId={branchId}
        customerMode={customerMode}
        jobStats={jobStats}
        sosCount={sosCount}
        weeklyStats={weeklyStats}
        statusDist={statusDist}
        financials={financials}
        financialStats={financialStats}
      />
    </DashboardLayout>
  )
}


async function getSosCount(providedBranchId?: string): Promise<number> {
  try {
    const supabase = await createClient()
    const customerId = await getCustomerId()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*', { count: 'exact', head: true })
      .eq('Job_Status', 'SOS')
    
    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    }

    const branchId = providedBranchId || await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    
    if (branchId && branchId !== 'All') {
        dbQuery = dbQuery.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return 0
    }

    const { count, error } = await dbQuery

    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}
