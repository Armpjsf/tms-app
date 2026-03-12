
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
import { cn } from "@/lib/utils"
import { BarChart3, TrendingUp, Truck, ShieldAlert, Layers, Trophy, Star, Zap, Building2, Activity } from "lucide-react"

interface DriverStats {
  name: string
  completedJobs: number
  onTimeRate: number
  revenue: number
}

export async function DashboardContent({ 
  startDate, 
  endDate, 
  branchId 
}: { 
  startDate?: string
  endDate?: string
  branchId: string 
}) {
  
  // Fetch all analytics data in parallel with filters
  const [
    financials, 
    revenueTrend, 
    topCustomers, 
    opStats, 
    statusDist, 
    branchPerf, 
    subPerf,
    exeKPIs,
    billing,
    fuel,
    maintenance,
    safety,
    workforce,
    routes,
    driverLeaderboard,
    vehicleProfitability
  ] = await Promise.all([
    getFinancialStats(startDate, endDate, branchId),
    getRevenueTrend(startDate, endDate, branchId),
    getTopCustomers(startDate, endDate, branchId),
    getOperationalStats(branchId, startDate, endDate),
    getJobStatusDistribution(startDate, endDate, branchId),
    getBranchPerformance(startDate, endDate),
    getSubcontractorPerformance(startDate, endDate, branchId),
    getExecutiveKPIs(startDate, endDate, branchId),
    getBillingAnalytics(startDate, endDate, branchId),
    getFuelAnalytics(startDate, endDate),
    getMaintenanceSchedule(),
    getSafetyAnalytics(startDate, endDate, branchId),
    getWorkforceAnalytics(startDate, endDate, branchId),
    getRouteEfficiency(startDate, endDate, branchId),
    getDriverLeaderboard(startDate, endDate, branchId),
    getVehicleProfitability(startDate, endDate, branchId)
  ])

  return (
    <div className="space-y-24">
        {/* Intelligence Data Utility Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 p-10 bg-slate-950 border border-slate-800 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-6 relative z-10">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                    <Zap size={24} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-[0.2em] italic leading-tight">Tactical Intelligence Feed</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1 italic">Fleet-wide data synchronization: ACTIVE // NOMINAL STATUS</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
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
                        routes
                    }} 
                />
            </div>
        </div>

        {/* Section 1: Financial Intelligence COMMAND */}
        <section className="space-y-12 relative">
          <div className="flex items-center gap-5 group/h">
              <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-2xl shadow-emerald-500/20 group-hover/h:scale-110 transition-transform duration-500 border border-white/10">
                  <TrendingUp size={28} />
              </div>
              <div>
                  <h2 className="text-4xl font-black text-slate-950 tracking-tighter italic uppercase">Financial Intelligence</h2>
                  <p className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.4em] mt-1 italic">Commercial Vector & Revenue Growth Monitoring // TIER-1 AUDIT</p>
              </div>
          </div>
          
          <FinancialSummaryCards data={exeKPIs} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <PremiumCard className="lg:col-span-2 overflow-hidden p-0 bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] rounded-br-[5rem] rounded-tl-[3rem]">
                  <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-3 relative z-10">
                          <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg">
                              <BarChart3 size={18} />
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-white tracking-tight italic uppercase">Market Yield Dynamics</h3>
                              <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-[0.2em]">Temporal performance & Gross realization Real-time Feed</p>
                          </div>
                      </div>
                  </div>
                  <div className="p-10 min-h-[450px]"><RevenueTrendChart data={revenueTrend} /></div>
              </PremiumCard>
              
              <div className="flex flex-col">
                 <PremiumCard className="overflow-hidden p-0 bg-slate-950 border-none shadow-2xl rounded-br-[4rem] rounded-tl-[21rem] group/leaderboard flex-1">
                    <div className="p-10 border-b border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-amber-600 rounded-2xl text-white shadow-2xl shadow-amber-500/40 border border-white/10">
                                <Trophy size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight italic uppercase">Operator ELITE</h3>
                                <p className="text-amber-400 text-[9px] font-bold uppercase tracking-[0.2em]">Top Asset performance Registry</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-0">
                        <div className="divide-y divide-white/5">
                            {driverLeaderboard.slice(0, 6).map((driver: DriverStats, idx: number) => (
                                <div key={driver.name} className="p-8 flex items-center justify-between group/driver transition-all hover:bg-white/5 border-l-4 border-transparent hover:border-amber-500">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-xs font-black text-white border border-white/10 group-hover/driver:border-amber-500/50 transition-colors uppercase italic">
                                                {driver.name.slice(0, 2)}
                                            </div>
                                            {idx < 3 && (
                                                <div className="absolute -top-2 -right-2 p-1.5 bg-amber-500 rounded-full shadow-2xl border-2 border-slate-950">
                                                    <Star size={10} className="fill-white text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white tracking-tight uppercase italic">{driver.name}</div>
                                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                                                {driver.completedJobs} OPS // <span className="text-amber-400">{driver.onTimeRate.toFixed(1)}% SYNC</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-emerald-400 italic bg-emerald-500/5 px-3 py-1 rounded-xl tracking-tighter border border-emerald-500/10 shadow-sm transition-all group-hover/driver:scale-105 group-hover/driver:bg-emerald-500/10">
                                            ฿{Math.round(driver.revenue / 1000)}K
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </PremiumCard>
              </div>
          </div>
          
          <PerformanceCharts data={revenueTrend} />
          <BillingSection data={billing} />
          <CustomerRouteSection customers={topCustomers} routes={routes} />
        </section>
        
        <div className="h-px bg-slate-100" />

        {/* Section 2: Fleet & Operations COMMAND */}
        <section className="space-y-12">
           <div className="flex items-center gap-5 group/h">
              <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-2xl shadow-blue-500/20 group-hover/h:scale-110 transition-transform duration-500 border border-white/10">
                  <Truck size={28} />
              </div>
              <div>
                  <h2 className="text-4xl font-black text-slate-950 tracking-tighter italic uppercase">Fleet Command</h2>
                  <p className="text-blue-600 text-[11px] font-black uppercase tracking-[0.4em] mt-1 italic">Operational Throughput & Asset Utilization Registry // REAL-TIME MONITOR</p>
              </div>
           </div>
           
           <FuelSection data={fuel} />
           <ProfitabilitySection data={vehicleProfitability} financials={financials} />
           <EfficiencyCharts data={revenueTrend} />
           <MaintenanceSection data={maintenance} />
        </section>

        <div className="h-px bg-slate-100" />

        {/* Section 3: Workforce & Safety COMMAND */}
        <section className="space-y-12">
           <div className="flex items-center gap-5 group/h">
              <div className="p-4 bg-rose-600 rounded-2xl text-white shadow-2xl shadow-rose-500/20 group-hover/h:scale-110 transition-transform duration-500 border border-white/10">
                  <ShieldAlert size={28} />
              </div>
              <div>
                  <h2 className="text-4xl font-black text-slate-950 tracking-tighter italic uppercase">Tactical Safety</h2>
                  <p className="text-rose-600 text-[11px] font-black uppercase tracking-[0.4em] mt-1 italic">Human Capital Efficiency & Safety Protocol Audit // CRITICAL VECTORS</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 space-y-12">
               <WorkforceSection data={workforce} />
               <SafetySection data={safety} />
           </div>
        </section>

        <div className="h-px bg-slate-100" />

        {/* Section 4: Sector Integrity COMMAND */}
        <section className="space-y-12">
          <div className="flex items-center gap-5 group/h">
              <div className="p-4 bg-slate-950 rounded-2xl text-white shadow-2xl shadow-slate-950/20 group-hover/h:scale-110 transition-transform duration-500 border border-white/10">
                  <Layers size={28} />
              </div>
              <div>
                  <h2 className="text-4xl font-black text-slate-950 tracking-tighter italic uppercase">Sector Integrity</h2>
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] mt-1 italic">Cross-Functional Operational Health Scorecards // AGGREGATE INDEX</p>
              </div>
          </div>
          
          <ExecutiveSectorHealth 
              sectors={[
                  {
                      title: "Tactical Operations",
                      icon: "layers",
                      href: "/admin/jobs",
                      metrics: [
                          { label: "Execution Success", value: `${opStats.fleet.onTimeDelivery.toFixed(1)}%`, status: opStats.fleet.onTimeDelivery > 90 ? 'good' : 'warning' },
                          { label: "Active Mission Pipeline", value: statusDist.reduce((a: number, b: { value: number }) => a + b.value, 0), status: 'good' }
                      ]
                  },
                  {
                      title: "Asset Readiness",
                      icon: "truck",
                      href: "/admin/vehicles/dashboard",
                      metrics: [
                          { label: "Fleet Utilization", value: `${opStats.fleet.utilization.toFixed(1)}%`, status: opStats.fleet.utilization > 70 ? 'good' : 'warning' },
                          { label: "Technical Integrity", value: "NOMINAL", status: 'good' }
                      ]
                  },
                  {
                      title: "Regional Intelligence",
                      icon: "building",
                      href: "/admin/analytics/regional",
                      metrics: [
                          { label: "Strategic Branches", value: branchPerf.length, status: 'good' },
                          { label: "Apex Branch", value: branchPerf[0]?.branchName || 'N/A', status: 'good' }
                      ]
                  }
              ]}
          />
        </section>

        {/* Strategic Footer Notice */}
        <div className="p-12 bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Activity size={24} className="text-slate-400" />
            </div>
            <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Industrial Elite Data Engine</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5 leading-relaxed">
                    Aggregate Intelligence synchronized across all operational vectors. <br />
                    Tactical data processing cycle complete.
                </p>
            </div>
        </div>
    </div>
  )
}
