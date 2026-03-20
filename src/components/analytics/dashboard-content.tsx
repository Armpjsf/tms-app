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

import { useState, useEffect } from "react"
import { useLanguage } from "@/components/providers/language-provider"

interface DashboardContentProps {
  startDate?: string
  endDate?: string
  branchId?: string
  financials?: unknown
  revenueTrend?: unknown[]
  topCustomers?: unknown[]
  opStats?: unknown
  statusDist?: unknown[]
  branchPerf?: unknown[]
  subPerf?: unknown[]
  exeKPIs?: unknown
  billing?: unknown
  fuel?: unknown
  maintenance?: unknown
  safety?: unknown
  workforce?: unknown
  routes?: unknown[]
  driverLeaderboard?: unknown[]
  vehicleProfitability?: unknown[]
  esgStats?: unknown
}

export function DashboardContent({ 
  startDate,
  endDate,
  branchId,
  financials: initialFinancials,
  revenueTrend: initialRevenueTrend,
  topCustomers: initialTopCustomers,
  opStats: initialOpStats,
  statusDist: initialStatusDist,
  branchPerf: initialBranchPerf,
  subPerf: initialSubPerf,
  exeKPIs: initialExeKPIs,
  billing: initialBilling,
  fuel: initialFuel,
  maintenance: initialMaintenance,
  safety: initialSafety,
  workforce: initialWorkforce,
  routes: initialRoutes,
  driverLeaderboard: initialDriverLeaderboard,
  vehicleProfitability: initialVehicleProfitability,
  esgStats: initialEsgStats
}: DashboardContentProps) {
  const { t } = useLanguage()
  const [data, setData] = useState({
    financials: initialFinancials,
    revenueTrend: initialRevenueTrend,
    topCustomers: initialTopCustomers,
    opStats: initialOpStats,
    statusDist: initialStatusDist,
    branchPerf: initialBranchPerf,
    subPerf: initialSubPerf,
    exeKPIs: initialExeKPIs,
    billing: initialBilling,
    fuel: initialFuel,
    maintenance: initialMaintenance,
    safety: initialSafety,
    workforce: initialWorkforce,
    routes: initialRoutes,
    driverLeaderboard: initialDriverLeaderboard,
    vehicleProfitability: initialVehicleProfitability,
    esgStats: initialEsgStats,
    loading: true
  })

  useEffect(() => {
    async function loadStats() {
      setData(prev => ({ ...prev, loading: true }))
      try {
        const [
          financials,
          revenueTrend,
          topCustomers,
          opStats,
          statusDist,
          branchPerf,
          subPerf,
          exeKPIs,
          routes,
          driverLeaderboard,
          vehicleProfitability,
          billing,
          fuel,
          maintenance,
          safety,
          workforce,
          esgStats
        ] = await Promise.all([
          getFinancialStats(startDate, endDate, branchId),
          getRevenueTrend(startDate, endDate, branchId),
          getTopCustomers(startDate, endDate, branchId),
          getOperationalStats(startDate, endDate, branchId),
          getJobStatusDistribution(startDate, endDate, branchId),
          getBranchPerformance(startDate, endDate),
          getSubcontractorPerformance(startDate, endDate, branchId),
          getExecutiveKPIs(startDate, endDate, branchId),
          getRouteEfficiency(startDate, endDate, branchId),
          getDriverLeaderboard(startDate, endDate, branchId),
          getVehicleProfitability(startDate, endDate, branchId),
          getBillingAnalytics(startDate, endDate, branchId),
          getFuelAnalytics(startDate, endDate),
          getMaintenanceSchedule(),
          getSafetyAnalytics(startDate, endDate, branchId),
          getWorkforceAnalytics(startDate, endDate, branchId),
          getESGStats(startDate, endDate, branchId)
        ])

        setData({
          financials: financials as any,
          revenueTrend: revenueTrend as any[],
          topCustomers: topCustomers as any[],
          opStats: opStats as any,
          statusDist: statusDist as any[],
          branchPerf: branchPerf as any[],
          subPerf: subPerf as any[],
          exeKPIs: exeKPIs as any,
          routes: routes as any[],
          driverLeaderboard: driverLeaderboard as any[],
          vehicleProfitability: vehicleProfitability as any[],
          billing: billing as any,
          fuel: fuel as any,
          maintenance: maintenance as any,
          safety: safety as any,
          workforce: workforce as any,
          esgStats: esgStats as any,
          loading: false
        })
      } catch (error) {
        console.error("Dashboard Intelligence Error:", error)
        setData(prev => ({ ...prev, loading: false }))
      }
    }

    loadStats()
  }, [startDate, endDate, branchId])

  const {
    financials,
    revenueTrend = [],
    topCustomers = [],
    opStats = { fleet: { onTimeDelivery: 0, utilization: 0, health: 0 } } as any,
    statusDist = [],
    branchPerf = [],
    subPerf = [],
    exeKPIs = {},
    billing = {},
    fuel = {},
    maintenance = { overdue: [] },
    safety = {},
    workforce = {},
    routes = [],
    driverLeaderboard = [],
    vehicleProfitability = [],
    esgStats = {},
    loading
  } = data

  if (loading) {
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
                    <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] italic italic leading-none mb-3">{t('common.tactical_cluster')}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] italic">{t('common.network_stable')}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
                <ExportAllButton 
                    data={{
                        financials,
                        revenueTrend,
                        topCustomers,
                        statusDist,
                        branchPerf,
                        subPerf,
                        billing,
                        fuel,
                        maintenance,
                        safety,
                        workforce,
                        routes,
                        driverLeaderboard,
                        vehicleProfitability,
                        esgStats,
                        opStats
                    }} 
                />
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
                  <p className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.6em] italic">Commercial realization & Fiscal liquidity monitoring // Q1-S1</p>
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
                              <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Temporal realization across fleet vectors</p>
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
                                <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">{t('dashboard.top_tier_asset')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-2 space-y-2">
                        {((driverLeaderboard as any[]) || []).slice(0, 6).map((driver: DriverStats, idx: number) => (
                            <div key={driver.name} className="p-10 flex items-center justify-between group/driver transition-all hover:bg-white/5 rounded-3xl border-2 border-transparent hover:border-primary/20">
                                <div className="flex items-center gap-8">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center text-sm font-black text-white border-2 border-white/5 group-hover/driver:border-primary/50 transition-all uppercase italic">
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
                                           <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] flex items-center gap-2">
                                              {driver.completedJobs} OPS
                                           </div>
                                           <div className="h-1 w-1 rounded-full bg-slate-800" />
                                           <div className="text-[10px] text-primary font-black uppercase tracking-[0.4em]">
                                              {(driver.onTimeRate || 0).toFixed(1)}% SYNC
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
          <BillingSection data={billing} />
          <CustomerRouteSection customers={topCustomers} routes={routes} />
        </section>
        
        {/* Section 2: Fleet COMMAND */}
        <section className="space-y-16">
           <div className="flex items-center gap-8 group/h">
              <div className="p-5 bg-blue-500/20 rounded-3xl text-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] border-2 border-blue-500/30 group-hover/h:scale-110 transition-transform duration-500">
                  <Truck size={36} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                  <h2 className="text-5xl font-black text-white tracking-widest italic uppercase">{t('common.asset_tactical')}</h2>
                  <p className="text-blue-500 text-[11px] font-black uppercase tracking-[0.6em] italic">{t('dashboard.operational_throughput')} & {t('dashboard.tier_1_monitoring')}</p>
              </div>
           </div>
           
           <FuelSection data={fuel} />
           <ProfitabilitySection data={vehicleProfitability} financials={financials} />
           <EfficiencyCharts data={revenueTrend} />
           <MaintenanceSection data={maintenance} />
        </section>

        {/* Section 3: Safety HUB */}
        <section className="space-y-16">
           <div className="flex items-center gap-8 group/h">
              <div className="p-5 bg-rose-500/20 rounded-3xl text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)] border-2 border-rose-500/30 group-hover/h:scale-110 transition-transform duration-500">
                  <ShieldAlert size={36} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                  <h2 className="text-5xl font-black text-white tracking-widest italic uppercase">{t('common.protocol_integrity')}</h2>
                  <p className="text-rose-500 text-[11px] font-black uppercase tracking-[0.6em] italic">{t('dashboard.human_capital_efficiency')} & {t('dashboard.safety_protocol_audit')} {"//"} {t('dashboard.critical_vectors')}</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 space-y-16">
               <WorkforceSection data={workforce} />
               <SafetySection data={safety} />
               <ESGSection data={esgStats} />
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
                  <p className="text-primary text-[11px] font-black uppercase tracking-[0.6em] italic">{t('dashboard.health_index')} {"//"} {t('dashboard.aggregate_nodes')}</p>
              </div>
          </div>
          
          <ExecutiveSectorHealth 
              sectors={[
                  {
                      title: t('dashboard.tactical_flux'),
                      icon: "layers",
                      href: "/admin/jobs",
                      metrics: [
                          { label: t('dashboard.sync_success'), value: `${opStats.fleet.onTimeDelivery.toFixed(1)}%`, status: opStats.fleet.onTimeDelivery > 90 ? 'good' : 'warning' },
                          { label: t('dashboard.current_pipeline'), value: statusDist.reduce((a: number, b: any) => a + b.value, 0), status: 'good' }
                      ]
                  },
                  {
                      title: t('dashboard.asset_readiness'),
                      icon: "truck",
                      href: "/admin/vehicles/dashboard",
                      metrics: [
                          { label: t('dashboard.fleet_capacity'), value: `${opStats.fleet.utilization.toFixed(1)}%`, status: opStats.fleet.utilization > 70 ? 'good' : 'warning' },
                          { 
                            label: t('dashboard.technical_status'), 
                            value: opStats.fleet.health >= 90 ? "OPTIMAL" : opStats.fleet.health >= 50 ? "DEGRADED" : "CRITICAL", 
                            status: opStats.fleet.health >= 90 ? 'good' : opStats.fleet.health >= 50 ? 'warning' : 'critical' 
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
                <p className="text-xs text-slate-500 font-black uppercase tracking-[0.2em] max-w-2xl leading-relaxed">
                    {t('dashboard.intel_sync_warning')} <br />
                    {t('dashboard.system_cycle_complete')}
                </p>
            </div>
            <div className="flex items-center gap-4 py-2 px-6 bg-white/5 rounded-full border border-white/10">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('common.sync_complete')}</span>
            </div>
        </div>
    </div>
  )
}
