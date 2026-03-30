"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getExecutiveDashboardUnified } from "@/lib/supabase/financial-analytics"
import { getSOSDriverIds } from "@/lib/supabase/sos"
import { getCustomerName } from "@/lib/supabase/customers"
import { getMarketplaceJobs } from "@/lib/supabase/jobs"
import { getSystemLogs } from "@/lib/supabase/logs"
import { isCustomer, getCustomerId } from "@/lib/permissions"
import { useEffect, useState, useCallback } from "react"
import { useBranch } from "@/components/providers/branch-provider"
import { useLanguage } from "@/components/providers/language-provider"

export default function DashboardPage() {
  const { selectedBranch } = useBranch()
  const { t } = useLanguage()
  const [data, setData] = useState<any | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsInitialLoading(true)
    else setIsRefreshing(true)
    
    try {
      const currentBranchId = selectedBranch === 'All' ? undefined : selectedBranch
      
      // Basic permissions can be fetched once or kept in Promise.all if they are fast
      const [unified, sosIds, marketplaceJobs, logs, customerMode, custId] = await Promise.all([
        getExecutiveDashboardUnified(currentBranchId),
        getSOSDriverIds(),
        getMarketplaceJobs(currentBranchId),
        getSystemLogs({ branchId: currentBranchId, limit: 10 }),
        isCustomer(),
        getCustomerId()
      ])

      let custName = custId;
      if (customerMode && custId) {
          custName = await getCustomerName(custId) || custId
      }

      setData({ unified, sosIds, marketplaceJobs, logs, customerMode, custId, custName })
    } catch (error) {
      console.error("Dashboard data fetch error:", error)
    } finally {
      setIsInitialLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    loadData(true)
  }, [selectedBranch]) // Only trigger on branch change, loadData handles the rest

  if (isInitialLoading && !data) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-primary animate-pulse font-black uppercase tracking-[0.3em]">{t('common.loading')}</p>
        </div>
      </div>
    </DashboardLayout>
  )

  // Fallback if data is still null after loading
  if (!data) return null;

  const jobStats = {
    total: unified.kpi?.jobs?.current ?? 0,
    pending: unified.statusDist?.find((s: any) => ['New', 'Requested', 'Assigned', 'Pending'].includes(s.name))
                ? unified.statusDist.filter((s: any) => ['New', 'Requested', 'Assigned', 'Pending'].includes(s.name)).reduce((a: number, b: any) => a + b.value, 0)
                : 0,
    inProgress: unified.statusDist?.find((s: any) => ['In Progress', 'In Transit', 'Active'].includes(s.name))
                 ? unified.statusDist.filter((s: any) => ['In Progress', 'In Transit', 'Active'].includes(s.name)).reduce((a: number, b: any) => a + b.value, 0)
                 : 0,
    delivered: unified.statusDist?.find((s: any) => ['Completed', 'Delivered', 'Finished', 'Closed'].includes(s.name))
                  ? unified.statusDist.filter((s: any) => ['Completed', 'Delivered', 'Finished', 'Closed'].includes(s.name)).reduce((a: number, b: any) => a + b.value, 0)
                  : 0
  }

  return (
    <DashboardLayout>
      <DashboardClient 
        branchId={selectedBranch}
        customerMode={customerMode}
        userName={custName as string}
        jobStats={jobStats}
        sosCount={sosIds.length}
        weeklyStats={unified.trend ?? []}
        fleetStatus={[]}
        marketplaceJobs={marketplaceJobs ?? []}
        logs={logs ?? []}
        fleetHealth={unified.kpi?.margin?.current ? Math.round(unified.kpi.margin.current + 80) : 98}
      />
    </DashboardLayout>
  )
}
