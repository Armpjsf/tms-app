"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getExecutiveDashboardUnified } from "@/lib/supabase/financial-analytics"
import { getSOSDriverIds } from "@/lib/supabase/sos"
import { getCustomerName } from "@/lib/supabase/customers"
import { getMarketplaceJobs, getTodayJobStats } from "@/lib/supabase/jobs"
import { getDriverStats } from "@/lib/supabase/drivers"
import { isCustomer, getCustomerId } from "@/lib/permissions"
import { useEffect, useState, useCallback } from "react"
import { useBranch } from "@/components/providers/branch-provider"
import { useLanguage } from "@/components/providers/language-provider"

interface DashboardData {
  unified: any
  sosIds: string[]
  marketplaceJobs: any[]
  customerMode: boolean
  custId: string | null
  custName: string | null
  dailyStats: any
  driverStats: any
}

export default function DashboardPage() {
  const { selectedBranch } = useBranch()
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsInitialLoading(true)
    
    try {
      const currentBranchId = selectedBranch === 'All' ? undefined : selectedBranch
      
      const [unified, sosIds, marketplaceJobs, customerMode, custId, dailyStats, driverStats] = await Promise.all([
        getExecutiveDashboardUnified(currentBranchId),
        getSOSDriverIds(),
        getMarketplaceJobs(currentBranchId),
        isCustomer(),
        getCustomerId(),
        getTodayJobStats(currentBranchId),
        getDriverStats(currentBranchId)
      ])

      let custName: string | null = custId;
      if (customerMode && custId) {
          custName = await getCustomerName(custId) || custId
      }

      setData({ 
        unified, 
        sosIds, 
        marketplaceJobs, 
        customerMode, 
        custId: custId || null, 
        custName: custName || null, 
        dailyStats: dailyStats || { total: 0, delivered: 0, inProgress: 0, pending: 0 }, 
        driverStats: driverStats || { total: 0, active: 0, onJob: 0 } 
      })
    } catch (error) {
      console.error("Dashboard data fetch error:", error)
    } finally {
      setIsInitialLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    loadData(true)
  }, [selectedBranch, loadData])

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

  if (!data) return null;

  const { unified, sosIds, marketplaceJobs, customerMode, custName, dailyStats, driverStats } = data;

  return (
    <DashboardLayout>
      <DashboardClient 
        branchId={selectedBranch}
        customerMode={customerMode}
        userName={custName as string}
        jobStats={dailyStats}
        driverStats={driverStats}
        sosCount={sosIds.length}
        weeklyStats={unified.trend ?? []}
        fleetStatus={[]}
        marketplaceJobs={marketplaceJobs ?? []}
        fleetHealth={unified.kpi?.margin?.current ? Math.round(unified.kpi.margin.current + 80) : 98}
      />
    </DashboardLayout>
  )
}
