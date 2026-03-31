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
  fleetStatus: any[]
  esgStats: {
    co2SavedKg: number
    treesSaved: number
    totalSavedKm: number
  }
}

export default function DashboardPage() {
  const { selectedBranch } = useBranch()
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsInitialLoading(true)
    else setIsRefreshing(true)
    
    try {
      const currentBranchId = selectedBranch === 'All' ? undefined : selectedBranch
      
      const { getESGStats } = await import("@/lib/supabase/esg-analytics")

      const [unified, sosIds, marketplaceJobs, customerMode, custId, dailyStats, driverStats, esgStats] = await Promise.all([
        getExecutiveDashboardUnified(currentBranchId),
        getSOSDriverIds(),
        getMarketplaceJobs(currentBranchId),
        isCustomer(),
        getCustomerId(),
        getTodayJobStats(currentBranchId),
        getDriverStats(currentBranchId),
        getESGStats(undefined, undefined, currentBranchId)
      ])

      let custName: string | null = custId;
      if (customerMode && custId) {
          custName = await getCustomerName(custId) || custId
      }

      // Fetch Live Fleet GPS Status
      const { getActiveFleetStatus } = await import("@/lib/supabase/gps")
      const fleetStatus = await getActiveFleetStatus(currentBranchId, customerMode ? custId : null)

      setData({ 
        unified, 
        sosIds, 
        marketplaceJobs, 
        customerMode, 
        custId: custId || null, 
        custName: custName || null, 
        dailyStats: dailyStats || { total: 0, delivered: 0, inProgress: 0, pending: 0, sos: 0 }, 
        driverStats: driverStats || { total: 0, active: 0, onJob: 0 },
        fleetStatus: fleetStatus || [],
        esgStats: esgStats || { co2SavedKg: 0, treesSaved: 0, totalSavedKm: 0 }
      })
    } catch (error) {
      console.error("Dashboard data fetch error:", error)
    } finally {
      setIsInitialLoading(false)
      setIsRefreshing(false)
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

  const { unified, sosIds, marketplaceJobs, customerMode, custName, dailyStats, driverStats, fleetStatus, esgStats } = data;

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
        fleetStatus={fleetStatus}
        marketplaceJobs={marketplaceJobs ?? []}
        fleetHealth={unified.kpi?.margin?.current ? Math.round(unified.kpi.margin.current + 80) : 98}
        esg={{
          co2Saved: esgStats.co2SavedKg,
          treesSaved: esgStats.treesSaved,
          fuelSaved: Math.round(esgStats.co2SavedKg / 2.68)
        }}
      />
    </DashboardLayout>
  )
}
