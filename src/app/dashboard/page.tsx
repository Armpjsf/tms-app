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
import { Calendar, Filter, X, AlertTriangle } from "lucide-react"
import { getActiveFleetStatus } from "@/lib/supabase/gps"

interface DashboardData {
  unified: {
    trend: Array<{ date: string; total: number; completed: number }>
    kpi: {
      margin: {
        current: number
      }
    }
    esg?: {
      co2Saved: number
      treesSaved: number
      fuelSaved: number
    }
  }
  sosIds: string[]
  marketplaceJobs: any[] // Complex job object
  customerMode: boolean
  custId: string | null
  custName: string | null
  dailyStats: {
    total: number
    delivered: number
    inProgress: number
    pending: number
    sos: number
  }
  driverStats: {
    total: number
    active: number
    onJob: number
  }
  fleetStatus: Array<{
    Driver_ID: string
    Driver_Name: string
    Vehicle_Plate: string
    Latitude: number | null
    Longitude: number | null
    Last_Update: string | null
  }>
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
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  
  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsInitialLoading(true)
    
    try {
      const currentBranchId = selectedBranch === 'All' ? undefined : selectedBranch
      
      const { getESGStats } = await import("@/lib/supabase/esg-analytics")

      const [unified, sosIds, marketplaceJobs, customerMode, custId, dailyStats, driverStats, esgStats] = await Promise.all([
        getExecutiveDashboardUnified(currentBranchId, startDate || undefined, endDate || undefined),
        getSOSDriverIds(),
        getMarketplaceJobs(currentBranchId),
        isCustomer(),
        getCustomerId(),
        getTodayJobStats(currentBranchId, startDate || undefined, endDate || undefined),
        getDriverStats(currentBranchId),
        getESGStats(startDate || undefined, endDate || undefined, currentBranchId)
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
    }
  }, [selectedBranch, startDate, endDate])

  useEffect(() => {
    loadData(true)
  }, [selectedBranch, loadData, startDate, endDate])

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

  const { unified, sosIds, marketplaceJobs, customerMode, custId, custName, dailyStats, driverStats, fleetStatus, esgStats } = data;

  // Handle Missing Customer Profile Error
  if (customerMode && (!custId || custId === 'FORCED_RESTRICTION')) {
    return (
      <DashboardLayout>
         <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10 bg-background/50 backdrop-blur-3xl rounded-[3rem] border border-border/10 shadow-2xl">
            <div className="w-24 h-24 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-8 animate-bounce">
                <AlertTriangle size={48} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase mb-4 italic">ACCESS_RESTRICTED</h1>
            <p className="text-xl font-bold font-black text-muted-foreground uppercase tracking-widest max-w-lg leading-relaxed mb-10">
                Your account is currently not linked to a tactical customer profile. Please contact Mission Control or your administrator to initialize your mission vector.
            </p>
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="px-10 h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20"
                >
                  Return to Base
                </button>
            </div>
         </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Tactical Date Range Selection Bar */}
      <div className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6 bg-background/50 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-border/5 shadow-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30 text-primary">
                  <Calendar size={20} />
              </div>
              <div>
                  <h3 className="text-lg font-black text-foreground tracking-widest uppercase italic">Tactical Range</h3>
                  <p className="text-xs font-bold font-black text-muted-foreground uppercase tracking-[0.2em] italic">Analyze Historical Vectors</p>
              </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full md:w-auto">
              <div className="flex items-center gap-3 w-full sm:w-64 bg-background/50 border border-border/10 rounded-2xl px-4 h-12 hover:border-primary/30 transition-all group/input">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic whitespace-nowrap">START:</span>
                  <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-black uppercase text-foreground w-full cursor-pointer"
                  />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-64 bg-background/50 border border-border/10 rounded-2xl px-4 h-12 hover:border-primary/30 transition-all group/input">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic whitespace-nowrap">END:</span>
                  <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-black uppercase text-foreground w-full cursor-pointer"
                  />
              </div>
              
              {(startDate || endDate) && (
                  <button 
                      onClick={() => { setStartDate(""); setEndDate(""); }}
                      className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-500 hover:text-white transition-all group/reset"
                      title="Reset Range"
                  >
                      <X size={20} className="group-hover/reset:rotate-90 transition-transform" />
                  </button>
              )}
              
              <button 
                  onClick={() => loadData()}
                  className="px-6 h-12 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-primary/80 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,30,133,0.3)]"
              >
                  <Filter size={14} strokeWidth={3} />
                  SYNC_DATA
              </button>
          </div>
      </div>

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
        esg={unified.esg || {
          co2Saved: esgStats.co2SavedKg,
          treesSaved: esgStats.treesSaved,
          fuelSaved: Math.round(esgStats.co2SavedKg / 2.68)
        }}
      />
    </DashboardLayout>
  )
}
