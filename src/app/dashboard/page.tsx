"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getFinancialStats, getRevenueTrend, getExecutiveKPIs } from "@/lib/supabase/financial-analytics"
import { getActiveFleetStatus } from "@/lib/supabase/gps"
import { getTodayJobs, getTodayJobStats } from "@/lib/supabase/jobs"
import { getSOSDriverIds } from "@/lib/supabase/sos"
import { isCustomer, getCustomerId } from "@/lib/permissions"
import { useEffect, useState } from "react"
import { useBranch } from "@/components/providers/branch-provider"
import { useLanguage } from "@/components/providers/language-provider"

export default function DashboardPage() {
  const { selectedBranch } = useBranch()
  const { t } = useLanguage()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [financial, trend, kpis, fleet, jobs, sosIds, stats, customerMode, custId] = await Promise.all([
          getFinancialStats(undefined, undefined, selectedBranch),
          getRevenueTrend(undefined, undefined, selectedBranch),
          getExecutiveKPIs(undefined, undefined, selectedBranch),
          getActiveFleetStatus(selectedBranch),
          getTodayJobs(selectedBranch),
          getSOSDriverIds(),
          getTodayJobStats(selectedBranch),
          isCustomer(),
          getCustomerId()
        ])
        setData({ financial, trend, kpis, fleet, jobs, sosIds, stats, customerMode, custId })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedBranch])

  if (loading || !data) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-primary animate-pulse font-black uppercase tracking-[0.3em]">{t('common.loading')}</p>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <DashboardClient 
        branchId={selectedBranch}
        customerMode={data.customerMode}
        userName={data.custId as string} // Using custId as placeholder for name if not available
        jobStats={data.stats}
        sosCount={data.sosIds.length}
        weeklyStats={data.trend}
        fleetStatus={data.fleet}
        marketplaceJobs={data.jobs.filter((j: any) => j.Job_Status === 'New' && !j.Driver_ID)}
        fleetHealth={data.kpis?.margin?.current ? Math.round(data.kpis.margin.current + 80) : 98}
      />
    </DashboardLayout>
  )
}
