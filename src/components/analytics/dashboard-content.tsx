"use client"

import { 
  getFinancialStats, 
  getRevenueTrend, 
  getTopCustomers,
  getOperationalStats,
  getJobStatusDistribution,
  getBranchPerformance,
  getSubcontractorPerformance,
  getExecutiveKPIs,
  getRouteEfficiency,
  getDriverLeaderboard,
  getVehicleProfitability 
} from "@/lib/supabase/analytics"
import { getBillingAnalytics } from "@/lib/supabase/billing-analytics"
import { getFuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { getMaintenanceSchedule } from "@/lib/supabase/maintenance-schedule"
import { getSafetyAnalytics } from "@/lib/supabase/safety-analytics"
import { getWorkforceAnalytics } from "@/lib/supabase/workforce-analytics"
import { getESGStats } from "@/lib/supabase/esg-analytics"
import { ESGSection } from "@/components/analytics/esg-section"

import { FinancialSummaryCards } from "@/components/analytics/summary-cards"
import { RevenueTrendChart } from "@/components/analytics/revenue-chart"
import { PerformanceCharts } from "@/components/analytics/performance-charts"
import { EfficiencyCharts } from "@/components/analytics/efficiency-charts"
import { ExecutiveSectorHealth } from "@/components/analytics/health-scorecards"
import { BillingSection } from "@/components/analytics/billing-section"
import { FuelSection } from "@/components/analytics/fuel-section"
import { MaintenanceSection } from "@/components/analytics/maintenance-section"
import { SafetySection } from "@/components/analytics/safety-section"
import { WorkforceSection } from "@/components/analytics/workforce-section"
import { CustomerRouteSection } from "@/components/analytics/customer-route-section"
import { ExportAllButton } from "@/components/analytics/export-all-button"
import { ProfitabilitySection } from "@/components/analytics/profitability-section"

import { PremiumCard } from "@/components/ui/premium-card"
import { BarChart3, TrendingUp, Truck, ShieldAlert, Layers, Trophy, Star, Zap, Activity } from "lucide-react"

interface DriverStats {
  name: string
  completedJobs: number
  onTimeRate: number
  revenue: number
}

import { useState, useEffect, useCallback } from "react"
import { useLanguage } from "@/components/providers/language-provider"

interface DashboardContentProps {
  startDate?: string
  endDate?: string
  branchId?: string
}

// Split state into two priority layers
interface PriorityData {
  financials: any
  revenueTrend: any[]
  exeKPIs: any
  opStats: any
  statusDist: any[]
  driverLeaderboard: any[]
  vehicleProfitability: any[]
  branchPerf: any[]
}

interface SecondaryData {
  topCustomers: any[]
  subPerf: any[]
  routes: any[]
  billing: any
  fuel: any
  maintenance: any
  safety: any
  workforce: any
  esgStats: any
}

export function DashboardContent({ 
  startDate,
  endDate,
  branchId,
}: DashboardContentProps) {
  const { t } = useLanguage()

  const [priority, setPriority] = useState<PriorityData | null>(null)
  const [secondary, setSecondary] = useState<SecondaryData | null>(null)
  const [loadingPrimary, setLoadingPrimary] = useState(true)
  const [loadingSecondary, setLoadingSecondary] = useState(true)

  const loadData = useCallback(async () => {
    setLoadingPrimary(true)
    setLoadingSecondary(true)
    setPriority(null)
    setSecondary(null)

    // === PRIORITY GROUP 1: Critical above-the-fold data ===
    // These 3 query groups are the most important — fetch in parallel
    const [financials, revenueTrend, exeKPIs, opStats, statusDist, driverLeaderboard, vehicleProfitability, branchPerf] = await Promise.all([
      getFinancialStats(startDate, endDate, branchId),
      getRevenueTrend(startDate, endDate, branchId),
      getExecutiveKPIs(startDate, endDate, branchId),
      getOperationalStats(branchId, startDate, endDate),
      getJobStatusDistribution(startDate, endDate, branchId),
      getDriverLeaderboard(startDate, endDate, branchId),
      getVehicleProfitability(startDate, endDate, branchId),
      getBranchPerformance(startDate, endDate),
    ])

    setPriority({ financials, revenueTrend, exeKPIs, opStats, statusDist, driverLeaderboard, vehicleProfitability, branchPerf })
    setLoadingPrimary(false)

    // === PRIORITY GROUP 2: Below-the-fold secondary data ===
    // Loads after primary is rendered — users see content faster
    const [topCustomers, subPerf, routes, billing, fuel, maintenance, safety, workforce, esgStats] = await Promise.all([
      getTopCustomers(startDate, endDate, branchId),
      getSubcontractorPerformance(startDate, endDate, branchId),
      getRouteEfficiency(startDate, endDate, branchId),
      getBillingAnalytics(startDate, endDate, branchId),
      getFuelAnalytics(startDate, endDate),
      getMaintenanceSchedule(),
      getSafetyAnalytics(startDate, endDate, branchId),
      getWorkforceAnalytics(startDate, endDate, branchId),
      getESGStats(startDate, endDate, branchId),
    ])

    setSecondary({ topCustomers, subPerf, routes, billing, fuel, maintenance, safety, workforce, esgStats })
    setLoadingSecondary(false)
  }, [startDate, endDate, branchId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Primary skeleton while initial load
  if (loadingPrimary) {
    return (
      <div className="space-y-12 animate-pulse">
        <div className="h-24 bg-[#0a0518] rounded-[2rem] border border-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 bg-[#0a0518] rounded-br-[4rem] rounded-tl-[2rem] border border-white/5" />
          ))}
        </div>
        <div className="h-[600px] bg-[#0a0518] rounded-br-[6rem] rounded-tl-[3rem] border border-white/5" />
      </div>
    )
  }

  const {
    financials,
    revenueTrend = [],
    exeKPIs = {},
    opStats = { fleet: { onTimeDelivery: 0, utilization: 0, health: 0 } } as any,
    statusDist = [],
    driverLeaderboard = [],
    vehicleProfitability = [],
    branchPerf = [],
  } = priority!

  const {
    topCustomers = [],
    subPerf = [],
    routes = [],
    billing = {},
    fuel = {},
    maintenance = { overdue: [] },
    safety = {},
    workforce = {},
    esgStats = {},
  } = secondary ?? {}

  const allData = {
    financials, revenueTrend, topCustomers, statusDist,
    branchPerf, subPerf, billing, fuel, maintenance,
    safety, workforce, routes, driverLeaderboard, vehicleProfitability,
    esgStats, opStats
  }

  return (
    <div className="space-y-32">
        {/* Hub Utility Matrix */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 p-12 bg-[#0a0518] border-2 border-white/5 rounded-[4rem] shadow-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-8 relative z-10">
                <div className="w-16 h-16 bg-primary/20 rounded-[2rem] flex items-center justify-center text-primary shadow-[0_0_30px_rgba(255,30,133,0.3)] border-2 border-primary/30 group-hover:scale-110 transition-transform duration-500">
                    <Zap size={28} strokeWidth={2.5} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] italic leading-none mb-3">{t('common.tactical_cluster')}</h3>
                    <p className="text-base font-bold font-black text-slate-500 uppercase tracking-[0.6em] italic">{t('common.network_stable')}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
                <ExportAllButton data={allData} />
            </div>
        </div>

        {/* Section 1: Financial Intelligence HUB */}
        <section className="space-y-16">
          <div className="flex items-center gap-8 group/h">
              <div className="p-5 bg-emerald-500/20 rounded-3xl text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] border-2 border-emerald-500/30 group-hover/h:scale-110 transition-transform duration-500">
                  <TrendingUp size={36} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                  <h2 className="text-5xl font-black text-white tracking-widest italic uppercase">{t('common.financial_node')}</h2>
                  <p className="text-emerald-500 text-base font-bold font-black uppercase tracking-[0.6em] italic">{t('analytics.commercial_monitoring')}</p>
              </div>
          </div>
          
          <FinancialSummaryCards data={exeKPIs} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <PremiumCard className="lg:col-span-2 overflow-hidden p-0 bg-[#0a0518] border-2 border-white/5 shadow-3xl rounded-br-[6rem] rounded-tl-[3rem]">
                  <div className="p-10 border-b border-white/5 bg-black/40 relative overflow-hidden flex items-center justify-between">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-transparent" />
                      <div className="flex items-center gap-5 relative z-10">
                          <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/30 shadow-[0_0_20px_rgba(255,30,133,0.2)]">
                              <BarChart3 size={24} />
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">{t('common.revenue_dynamics')}</h3>
                              <p className="text-primary text-base font-bold font-black uppercase tracking-[0.4em]">{t('analytics.temporal_realization')}</p>
                          </div>
                      </div>
                  </div>
                  <div className="p-12 min-h-[500px]"><RevenueTrendChart data={revenueTrend} /></div>
              </PremiumCard>
              
              <div className="flex flex-col">
                 <PremiumCard className="overflow-hidden p-0 bg-[#0a0518] border-2 border-white/5 shadow-3xl rounded-br-[5rem] rounded-tl-[3rem] group/leaderboard flex-1 relative">
                    <div className="p-12 border-b border-white/5 relative overflow-hidden bg-black/40">
                        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover/leaderboard:opacity-100 transition-opacity">
                             <Trophy size={48} className="text-primary" />
                        </div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-4 bg-primary/20 rounded-3xl text-primary border-2 border-primary/30">
                                <Star size={24} className="animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">{t('common.elite_force')}</h3>
                                <p className="text-primary text-base font-bold font-black uppercase tracking-[0.4em]">{t('dashboard.top_tier_asset')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-2 space-y-2">
                        {((driverLeaderboard as any[]) || []).slice(0, 6).map((driver: DriverStats, idx: number) => (
                            <div key={driver.name} className="p-10 flex items-center justify-between group/driver transition-all hover:bg-white/5 rounded-3xl border-2 border-transparent hover:border-primary/20">
                                <div className="flex items-center gap-8">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center text-xl font-black text-white border-2 border-white/5 group-hover/driver:border-primary/50 transition-all uppercase italic">
                                            {driver.name?.slice(0, 2) || "???"}
                                        </div>
                                        {idx < 3 && (
                                            <div className="absolute -top-3 -right-3 p-2 bg-primary rounded-full shadow-2xl border-4 border-[#0a0518]">
                                                <Trophy size={12} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-lg font-black text-white tracking-widest uppercase italic leading-none">{driver.name}</div>
                                        <div className="flex items-center gap-4">
                                           <div className="text-base font-bold text-slate-500 font-black uppercase tracking-[0.4em] flex items-center gap-2">
                                              {driver.completedJobs} {t('dashboard.ops_label')}
                                           </div>
                                           <div className="h-1 w-1 rounded-full bg-slate-800" />
                                           <div className="text-base font-bold text-primary font-black uppercase tracking-[0.4em]">
                                              {(driver.onTimeRate || 0).toFixed(1)}% {t('dashboard.sync_label')}
                                           </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-white italic tracking-tighter bg-primary/10 px-6 py-2 rounded-2xl border-2 border-primary/20 group-hover/driver:scale-110 transition-transform">
                                        ฿{Math.round((driver.revenue || 0) / 1000)}K
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </PremiumCard>
              </div>
          </div>
          
          <PerformanceCharts data={revenueTrend} />
          {loadingSecondary ? <SectionSkeleton /> : <BillingSection data={billing} />}
          {loadingSecondary ? <SectionSkeleton /> : <CustomerRouteSection customers={topCustomers} routes={routes} />}
        </section>
        
        {/* Section 2: Fleet COMMAND */}
        <section className="space-y-16">
           <div className="flex items-center gap-8 group/h">
              <div className="p-5 bg-blue-500/20 rounded-3xl text-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] border-2 border-blue-500/30 group-hover/h:scale-110 transition-transform duration-500">
                  <Truck size={36} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                  <h2 className="text-5xl font-black text-white tracking-widest italic uppercase">{t('common.asset_tactical')}</h2>
                  <p className="text-blue-500 text-base font-bold font-black uppercase tracking-[0.6em] italic">{t('dashboard.operational_throughput')} &amp; {t('dashboard.tier_1_monitoring')}</p>
              </div>
           </div>
           
           {loadingSecondary ? <SectionSkeleton /> : <FuelSection data={fuel} />}
           <ProfitabilitySection data={vehicleProfitability} financials={financials} />
           <EfficiencyCharts data={revenueTrend} />
           {loadingSecondary ? <SectionSkeleton /> : <MaintenanceSection data={maintenance} />}
        </section>

        {/* Section 3: Safety HUB */}
        <section className="space-y-16">
           <div className="flex items-center gap-8 group/h">
              <div className="p-5 bg-rose-500/20 rounded-3xl text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)] border-2 border-rose-500/30 group-hover/h:scale-110 transition-transform duration-500">
                  <ShieldAlert size={36} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                  <h2 className="text-5xl font-black text-white tracking-widest italic uppercase">{t('common.protocol_integrity')}</h2>
                  <p className="text-rose-500 text-base font-bold font-black uppercase tracking-[0.6em] italic">{t('dashboard.human_capital_efficiency')} &amp; {t('dashboard.safety_protocol_audit')} {"//"} {t('dashboard.critical_vectors')}</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 space-y-16">
               {loadingSecondary ? <><SectionSkeleton /><SectionSkeleton /></> : (
                 <>
                   <WorkforceSection data={workforce} />
                   <SafetySection data={safety} />
                   <ESGSection data={esgStats} />
                 </>
               )}
           </div>
        </section>

        {/* Section 4: System Cluster COMMAND */}
        <section className="space-y-16">
          <div className="flex items-center gap-8 group/h">
              <div className="p-5 bg-primary/20 rounded-3xl text-primary shadow-[0_0_30px_rgba(255,30,133,0.2)] border-2 border-primary/30 group-hover/h:scale-110 transition-transform duration-500">
                  <Layers size={36} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                  <h2 className="text-5xl font-black text-white tracking-widest italic uppercase">{t('common.system_cluster')}</h2>
                  <p className="text-primary text-base font-bold font-black uppercase tracking-[0.6em] italic">{t('dashboard.health_index')} {"//"} {t('dashboard.aggregate_nodes')}</p>
              </div>
          </div>
          
          <ExecutiveSectorHealth 
              sectors={[
                  {
                      title: t('dashboard.tactical_flux'),
                      icon: "layers",
                      href: "/admin/jobs",
                      metrics: [
                          { label: t('dashboard.sync_success'), value: `${(opStats as any).fleet.onTimeDelivery.toFixed(1)}%`, status: (opStats as any).fleet.onTimeDelivery > 90 ? 'good' : 'warning' },
                          { label: t('dashboard.current_pipeline'), value: statusDist.reduce((a: number, b: any) => a + b.value, 0), status: 'good' }
                      ]
                  },
                  {
                      title: t('dashboard.asset_readiness'),
                      icon: "truck",
                      href: "/admin/vehicles/dashboard",
                      metrics: [
                          { label: t('dashboard.fleet_capacity'), value: `${(opStats as any).fleet.utilization.toFixed(1)}%`, status: (opStats as any).fleet.utilization > 70 ? 'good' : 'warning' },
                          { 
                            label: t('dashboard.technical_status'), 
                            value: (opStats as any).fleet.health >= 90 ? t('dashboard.status_optimal') : (opStats as any).fleet.health >= 50 ? t('dashboard.status_degraded') : t('dashboard.status_critical'), 
                            status: (opStats as any).fleet.health >= 90 ? 'good' : (opStats as any).fleet.health >= 50 ? 'warning' : 'critical' 
                          }
                      ]
                  },
                  {
                      title: t('dashboard.regional_node_index'),
                      icon: "building",
                      href: "/admin/analytics/regional",
                      metrics: [
                          { label: t('dashboard.active_branches'), value: branchPerf.length, status: 'good' },
                          { label: t('dashboard.apex_vector'), value: (branchPerf[0] as any)?.branchName || 'N/A', status: 'good' }
                      ]
                  }
              ]}
          />
        </section>

        {/* Tactical Footer */}
        <div className="p-20 bg-[#0a0518] rounded-[6rem] border-2 border-white/5 flex flex-col items-center text-center space-y-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="p-6 bg-primary/20 rounded-[2.5rem] shadow-[0_0_40px_rgba(255,30,133,0.2)] border-2 border-primary/30 group-hover:scale-110 transition-all duration-700">
                <Activity size={40} className="text-primary" />
            </div>
            <div className="space-y-4">
                <h4 className="text-2xl font-black text-white uppercase tracking-[0.4em] italic">{t('common.intel_engine')}</h4>
                <p className="text-lg font-bold text-slate-500 font-black uppercase tracking-[0.2em] max-w-2xl leading-relaxed">
                    {t('dashboard.intel_sync_warning')} <br />
                    {t('dashboard.system_cycle_complete')}
                </p>
            </div>
            <div className="flex items-center gap-4 py-2 px-6 bg-white/5 rounded-full border border-white/10">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">{t('common.sync_complete')}</span>
            </div>
        </div>
    </div>
  )
}

const SectionSkeleton = () => (
    <div className="h-96 bg-[#0a0518] rounded-br-[4rem] rounded-tl-[2rem] border border-white/5 animate-pulse" />
)

