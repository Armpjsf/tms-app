export const dynamic = 'force-dynamic'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  getOperationalStats,
  getSubcontractorPerformance,
  getDriverLeaderboard,
} from "@/lib/supabase/analytics"
import { DriverLeaderboard } from "@/components/analytics/driver-leaderboard"
import { SubcontractorPerformance } from "@/components/analytics/subcontractor-performance"
import { Truck, Users, Fuel, TrendingUp, ArrowLeft, Activity, Zap, ShieldCheck, Target, Sparkles, Cpu } from "lucide-react"
import { MonthFilter } from "@/components/analytics/month-filter"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"

import { isSuperAdmin } from "@/lib/permissions"

export default async function FleetDashboardPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const startDate = searchParams.startDate
  const endDate = searchParams.endDate
  const branchId = searchParams.branch
  await isSuperAdmin()

  const [opStats, subPerf, driverRank] = await Promise.all([
    getOperationalStats(branchId, startDate, endDate),
    getSubcontractorPerformance(startDate, endDate, branchId),
    getDriverLeaderboard(startDate, endDate, branchId)
  ])

  return (
    <div className="space-y-12 pb-20 p-4 lg:p-10 bg-[#050110]">
      {/* Tactical Fleet Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
          
          <div className="relative z-10 space-y-8">
              <Link href="/admin/analytics" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-500 transition-all font-black uppercase tracking-[0.4em] text-base font-bold group/back italic">
                  <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                  Strategic Intelligence
              </Link>
              <div className="flex items-center gap-6">
                  <div className="p-4 bg-emerald-500/20 rounded-[2.5rem] border-2 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-emerald-400 group-hover:scale-110 transition-all duration-500">
                      <Truck size={42} strokeWidth={2.5} />
                  </div>
                  <div>
                      <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">
                          Fleet Nexus
                      </h1>
                      <p className="text-base font-bold font-black text-emerald-500 uppercase tracking-[0.6em] mt-2 opacity-80 italic">Asset Optimization & Tactical Performance Matrix</p>
                  </div>
              </div>
          </div>

          <div className="flex flex-col items-end gap-6 relative z-10">
              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                  <span className="text-base font-bold font-black text-slate-400 uppercase tracking-widest italic">FLEET_STATE: OPTIMIZED</span>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-2 rounded-3xl backdrop-blur-3xl">
                  <MonthFilter />
              </div>
          </div>
      </div>

      {/* Fleet Utilization Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <PremiumCard className="lg:col-span-2 bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/util relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] pointer-events-none" />
              <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between relative overflow-hidden">
                  <div className="flex items-center gap-5 relative z-10">
                      <Activity size={24} className="text-emerald-500 animate-pulse" />
                      <h2 className="text-2xl font-black text-white tracking-widest uppercase italic border-l-4 border-emerald-500 pl-6">Utilization Health Matrix</h2>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 relative z-10">
                      <Zap size={14} className="text-emerald-400" />
                      <span className="text-base font-bold font-black text-emerald-400 uppercase tracking-widest italic">REALTIME_FLOW</span>
                  </div>
              </div>
              <CardContent className="p-12 space-y-12 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                      <div className="space-y-6">
                          <p className="text-base font-bold font-black text-slate-500 uppercase tracking-[0.4em] italic mb-2">ACTIVE_RATIO_SYNC</p>
                          <div className="flex items-baseline gap-4">
                              <span className="text-7xl font-black text-white italic premium-text-gradient">{opStats.fleet.utilization.toFixed(1)}%</span>
                              <span className="text-base font-bold text-emerald-400 font-black flex items-center gap-1 uppercase tracking-widest italic animate-pulse">
                                  <TrendingUp size={14} /> TGT_85%
                              </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5 shadow-inner">
                              <div 
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                                  style={{ width: `${opStats.fleet.utilization}%` }} 
                              />
                          </div>
                      </div>
                      <div className="space-y-6 md:border-l md:border-white/5 md:pl-10">
                          <p className="text-base font-bold font-black text-slate-500 uppercase tracking-[0.4em] italic mb-2">ON_TIME_PRECISION</p>
                          <p className="text-7xl font-black text-emerald-500 leading-none italic">{opStats.fleet.onTimeDelivery.toFixed(1)}%</p>
                          <div className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-base font-bold font-black text-slate-400 uppercase tracking-widest italic w-fit">
                            // ACTUAL_VS_PLAN_DELTA
                          </div>
                      </div>
                      <div className="space-y-6 md:border-l md:border-white/5 md:pl-10">
                          <p className="text-base font-bold font-black text-slate-500 uppercase tracking-[0.4em] italic mb-2">TRANSIT_NODES</p>
                          <p className="text-7xl font-black text-white leading-none italic">{opStats.fleet.active}</p>
                          <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                             <p className="text-base font-bold font-black text-slate-400 uppercase tracking-widest italic">IN_FIELD_OPERATIONS: {opStats.fleet.active}</p>
                          </div>
                      </div>
                  </div>
              </CardContent>
          </PremiumCard>

          <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/sub relative">
              <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between">
                  <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] flex items-center gap-3 italic">
                      <Truck size={18} className="text-orange-500" /> Crew Mix Synthesis
                  </h3>
                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)]" />
              </div>
              <CardContent className="p-8">
                  <SubcontractorPerformance data={subPerf} />
              </CardContent>
          </PremiumCard>
      </div>

      {/* Driver Performance & Fuel Optimization */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <PremiumCard className="lg:col-span-3 bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/rank relative">
              <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 blur-[120px] pointer-events-none" />
              <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between">
                  <div className="flex items-center gap-4 font-black">
                    <Users className="text-primary" size={24} strokeWidth={2.5} /> 
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest italic">Personnel Yield Matrix</h2>
                  </div>
                  <span className="text-base font-bold text-slate-600 font-black uppercase tracking-widest italic bg-white/5 px-5 py-2 rounded-full border border-white/10">Top Tier Operators</span>
              </div>
              <CardContent className="p-8">
                  <DriverLeaderboard data={driverRank} />
              </CardContent>
          </PremiumCard>

          <PremiumCard className="lg:col-span-2 bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/fuel relative self-start">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
              <div className="p-10 border-b border-white/5 bg-black/40 flex items-center gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500 border border-amber-500/30">
                     <Fuel size={24} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Energy Efficiency</h3>
              </div>
              <CardContent className="flex flex-col items-center justify-center py-20 px-12">
                  <div className="relative group/score">
                      <div className="absolute inset-0 bg-amber-500/20 blur-[60px] rounded-full group-hover/score:blur-[80px] transition-all" />
                      <div className="relative z-10 flex flex-col items-center">
                          <div className="text-[120px] font-black text-white leading-none tracking-tighter italic premium-text-gradient drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                            {opStats.fleet.fuelEfficiency.toFixed(1)}
                          </div>
                          <div className="text-2xl font-black text-amber-500 uppercase tracking-[0.4em] italic mt-2">KM / LTR</div>
                      </div>
                  </div>
                  
                  <div className="mt-16 flex gap-2 w-full max-w-[300px] h-3">
                      {[1,2,3,4,5,6,7,8,9,10].map(i => (
                          <div 
                              key={i} 
                              className={cn(
                                "flex-1 rounded-full transition-all duration-1000",
                                i <= (opStats.fleet.fuelEfficiency / 1.5) 
                                    ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                                    : 'bg-white/5'
                              )} 
                          />
                      ))}
                  </div>
                  
                  <div className="mt-12 p-8 rounded-[2.5rem] bg-amber-500/5 border-2 border-amber-500/10 w-full relative overflow-hidden group/intel">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Activity size={40} className="text-amber-500" />
                      </div>
                      <p className="text-base font-bold font-black text-amber-500/60 uppercase tracking-[0.4em] text-center italic relative z-10">
                          EFFICIENCY_RATING: {opStats.fleet.fuelEfficiency > 10 ? 'EXCEPTIONAL_YIELD' : 'NOMINAL_FLOW'}
                      </p>
                  </div>
              </CardContent>
          </PremiumCard>
      </div>
      
      {/* Global Tactical Advisory */}
      <div className="mt-20 p-12 rounded-[3.5rem] bg-primary/5 border-2 border-primary/10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
          <div className="p-6 rounded-[2rem] bg-primary/20 text-primary border-2 border-primary/30 shadow-2xl animate-pulse">
              <Cpu size={32} />
          </div>
          <div className="space-y-4 text-center md:text-left flex-1">
              <p className="text-xl font-black text-primary italic uppercase tracking-widest">FLEET_OPTIMIZATION_ADVISORY</p>
              <p className="text-xl font-bold text-slate-600 leading-relaxed uppercase tracking-wider italic">
                  Fleet telemetry is updated every orbital cycle. Strategic diversions and energy fluctuations are flagged in real-time. <br />
                  For granular asset control, initiate a deep-scan of the specific transport node.
              </p>
          </div>
          <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-white/10 text-white gap-3 uppercase font-black text-base font-bold tracking-[0.3em] ml-auto italic">
              <Target size={18} /> SYNC_FLEET_STATE
          </PremiumButton>
      </div>
    </div>
  )
}

