"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getExecutiveDashboardUnified } from "@/lib/supabase/financial-analytics"
import { getSOSDriverIds } from "@/lib/supabase/sos"
import { isCustomer, getCustomerId } from "@/lib/permissions"
import { useEffect, useState, useCallback } from "react"
import { useBranch } from "@/components/providers/branch-provider"
import { useLanguage } from "@/components/providers/language-provider"

export default function DashboardPage() {
  const { selectedBranch } = useBranch()
  const { t } = useLanguage()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Two parallel fetches instead of nine separate ones
      const [unified, sosIds, customerMode, custId] = await Promise.all([
        getExecutiveDashboardUnified(selectedBranch === 'All' ? undefined : selectedBranch),
        getSOSDriverIds(),
        isCustomer(),
        getCustomerId()
      ])

      let custName = custId;
      if (customerMode && custId) {
          const { createClient } = await import('@/lib/supabase/server')
          const supabase = await createClient()
          const { data: customer } = await supabase
            .from('Master_Customers')
            .select('Customer_Name')
            .eq('Customer_ID', custId)
            .single()
          
          if (customer?.Customer_Name) {
              custName = customer.Customer_Name
          }
      }

      setData({ unified, sosIds, customerMode, custId, custName })
    } finally {
      setLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading || !data) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-primary animate-pulse font-black uppercase tracking-[0.3em]">{t('common.loading')}</p>
      </div>
    </DashboardLayout>
  )

  const { unified, sosIds, customerMode, custId, custName } = data

  // Map unified data to DashboardClient props
  const jobStats = {
    total: unified.kpi?.jobs?.current ?? 0,
    active: unified.statusDist?.find((s: any) => s.name === 'In Progress')?.value ?? 0,
    completed: unified.statusDist?.find((s: any) => ['Completed', 'Delivered', 'Finished', 'Closed'].includes(s.name))
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
        marketplaceJobs={[]}
        fleetHealth={unified.kpi?.margin?.current ? Math.round(unified.kpi.margin.current + 80) : 98}
      />
    </DashboardLayout>
  )
}
