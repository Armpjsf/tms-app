import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getExecutiveDashboardUnified } from "@/lib/supabase/financial-analytics"
import { getSOSDriverIds } from "@/lib/supabase/sos"
import { getCustomerName } from "@/lib/supabase/customers"
import { getMarketplaceJobs, getTodayJobStats } from "@/lib/supabase/jobs"
import { getDriverStats } from "@/lib/supabase/drivers"
import { isCustomer, getCustomerId } from "@/lib/permissions"
import { getActiveFleetStatus } from "@/lib/supabase/gps"
import { getActiveFleetAlerts } from "@/lib/actions/fleet-intelligence-actions"
import { getESGStats } from "@/lib/supabase/esg-analytics"
import { cookies } from "next/headers"
import { Suspense } from "react"
import { Loader2, AlertTriangle } from "lucide-react"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ 
    branch?: string; 
    start?: string; 
    end?: string;
  }>
}

async function DashboardContent({ branch, start, end }: { branch?: string, start?: string, end?: string }) {
  const currentBranchId = branch === 'All' ? undefined : branch
  
  // Parallel Fetching - Server Side (Ultra Fast)
  const [
    unified, 
    sosIds, 
    marketplaceJobs, 
    customerMode, 
    custId, 
    dailyStats, 
    driverStats, 
    esgStats, 
    fleetAlerts
  ] = await Promise.all([
    getExecutiveDashboardUnified(currentBranchId, start || undefined, end || undefined),
    getSOSDriverIds(),
    getMarketplaceJobs(currentBranchId),
    isCustomer(),
    getCustomerId(),
    getTodayJobStats(currentBranchId, start || undefined, end || undefined),
    getDriverStats(currentBranchId),
    getESGStats(start || undefined, end || undefined, currentBranchId),
    getActiveFleetAlerts()
  ])

  let custName: string | null = custId;
  if (customerMode && custId) {
      custName = await getCustomerName(custId) || custId
  }

  // Fetch Live Fleet GPS Status
  const fleetStatus = await getActiveFleetStatus(currentBranchId, customerMode ? custId : null)

  // Handle Missing Customer Profile Error
  if (customerMode && (!custId || custId === 'FORCED_RESTRICTION')) {
    return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10 bg-background/50 backdrop-blur-3xl rounded-[3rem] border border-border/10 shadow-2xl">
            <div className="w-24 h-24 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-8 animate-bounce">
                <AlertTriangle size={48} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase mb-4 italic">ACCESS_RESTRICTED</h1>
            <p className="text-xl font-bold font-black text-muted-foreground uppercase tracking-widest max-w-lg leading-relaxed mb-10">
                Your account is currently not linked to a tactical customer profile. Please contact Mission Control or your administrator to initialize your mission vector.
            </p>
            <div className="flex items-center gap-4">
                <a 
                  href="/login"
                  className="px-10 h-14 bg-primary text-black flex items-center justify-center font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20"
                >
                  Return to Base
                </a>
            </div>
         </div>
    )
  }

  return (
    <DashboardClient 
      branchId={branch || 'All'}
      customerMode={customerMode}
      userName={custName as string}
      jobStats={dailyStats || { total: 0, delivered: 0, inProgress: 0, pending: 0, sos: 0 }}
      driverStats={driverStats || { total: 0, active: 0, onJob: 0 }}
      sosCount={sosIds.length}
      fleetAlertsCount={fleetAlerts?.length || 0}
      weeklyStats={unified.trend ?? []}
      fleetStatus={fleetStatus || []}
      marketplaceJobs={marketplaceJobs ?? []}
      fleetHealth={unified.kpi?.margin?.current ? Math.round(unified.kpi.margin.current + 80) : 98}
      esg={unified.esg || {
        co2Saved: esgStats?.co2SavedKg || 0,
        treesSaved: esgStats?.treesSaved || 0,
        fuelSaved: Math.round((esgStats?.co2SavedKg || 0) / 2.68)
      }}
      // Initial dates for hydration if needed
      initialStart={start}
      initialEnd={end}
    />
  )
}

export default async function DashboardPage(props: PageProps) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  
  // Resolve branch: URL priority, then Cookie, then 'All'
  const branch = searchParams.branch || cookieStore.get('selectedBranch')?.value || 'All'
  const start = searchParams.start
  const end = searchParams.end

  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-primary animate-pulse font-black uppercase tracking-[0.3em] text-lg">
                INITIALIZING_NEURAL_GRID...
            </p>
        </div>
      }>
        <DashboardContent branch={branch} start={start} end={end} />
      </Suspense>
    </DashboardLayout>
  )
}
