

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getTodayJobStats, getWeeklyJobStats, getMarketplaceJobs, getTodayFinancials } from "@/lib/supabase/jobs"
import { createClient } from "@/utils/supabase/server"
import { isCustomer, isSuperAdmin, getCustomerId } from "@/lib/permissions"
import { getJobStatusDistribution, getFinancialStats, getProvincialMileageStats, getFleetComplianceMetrics, getFleetHealthScore } from "@/lib/supabase/analytics"
import { cookies } from "next/headers"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getSession } from "@/lib/session"




import { getFleetGPSStatus } from "@/lib/supabase/gps"
import { getUserBranchId } from "@/lib/permissions"

export default async function DashboardPage(props: {
  searchParams: Promise<{ branchId?: string; branch?: string }>
}) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams?.branchId || searchParams?.branch || cookieStore.get("selectedBranch")?.value || 'All'
  
  const [customerMode, session] = await Promise.all([
    isCustomer(),
    getSession()
  ])


  // Helper to run query safely
  const safeQuery = async <T,>(promise: Promise<T>, defaultValue: T): Promise<T> => {
    try {
      return await promise
    } catch (error) {
      console.error("Dashboard Query Error:", error)
      return defaultValue
    }
  }

  // ดึงข้อมูลจาก Supabase (Pass branchId if SuperAdmin)
  const [
    jobStats, 
    sosCount, 
    weeklyStats, 
    statusDist, 
    financials, 
    financialStats, 
    fleetStatus, 
    marketplaceJobs,
    zoneData,
    complianceData,
    fleetHealth
  ] = await Promise.all([
    safeQuery(getTodayJobStats(branchId), { total: 0, pending: 0, inProgress: 0, delivered: 0 }),
    safeQuery(getSosCount(branchId), 0),
    safeQuery(getWeeklyJobStats(branchId), []),
    safeQuery(getJobStatusDistribution(undefined, undefined, branchId), []),
    safeQuery(getTodayFinancials(branchId), { revenue: 0 }),
    safeQuery(getFinancialStats(undefined, undefined, branchId), { 
      revenue: 0, 
      netProfit: 0, 
      cost: { total: 0, driver: 0, fuel: 0, maintenance: 0, secondary: 0 },
      profitMargin: 0,
      fuelCost: 0,
      maintenanceCost: 0,
      secondaryCosts: 0
    } as never),
    safeQuery(getFleetGPSStatus(), []),
    safeQuery(getMarketplaceJobs(branchId), []),
    safeQuery(getProvincialMileageStats(branchId), []),
    safeQuery(getFleetComplianceMetrics(branchId), []),
    safeQuery(getFleetHealthScore(branchId), 100),
  ])

  // Map statusDist to include fill colors for compatibility with DashboardClient
  const statusColors: Record<string, string> = {
    'Draft': '#94a3b8',
    'Pending': '#fbbf24',
    'Confirmed': '#3b82f6',
    'In Progress': '#8b5cf6',
    'Delivered': '#10b981',
    'Completed': '#059669',
    'Cancelled': '#ef4444'
  }
  
  const statusDistWithColors = (statusDist || []).map(item => ({
    ...item,
    fill: statusColors[item.name] || '#94a3b8'
  }))


  return (
    <DashboardLayout>
      <DashboardClient 
        branchId={branchId || 'All'}
        customerMode={customerMode}
        userName={session?.username || null}
        jobStats={jobStats}
        sosCount={sosCount}
        weeklyStats={weeklyStats}
        statusDist={statusDistWithColors}
        financials={financials}
        financialStats={financialStats}
        fleetStatus={fleetStatus}
        marketplaceJobs={marketplaceJobs}
        zoneData={zoneData}
        complianceData={complianceData}
        fleetHealth={fleetHealth}
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

    if (error) {
        console.error("SOS Count Error:", error)
        return 0
    }
    return count || 0
  } catch (err) {
    console.error("SOS Count Exception:", err)
    return 0
  }
}
