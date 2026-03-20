import { Suspense } from "react"
import { getDetailedDriverAnalytics } from "@/lib/supabase/analytics"
import { cookies } from "next/headers"
import { isSuperAdmin } from "@/lib/permissions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Medal, Star, TrendingUp, Package, Clock, ShieldCheck, MapPin, Search, Zap, Target, Cpu, Activity, User } from "lucide-react"
import { MonthFilter } from "@/components/analytics/month-filter"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function DriverLeaderboardPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams.branch || cookieStore.get("selectedBranch")?.value || "All"
  const isAdmin = await isSuperAdmin()

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 bg-[#050110]">
        <PremiumCard className="bg-rose-500/10 border-rose-500/30 max-w-md p-12 text-center space-y-8 rounded-[3rem]">
            <ShieldCheck size={64} className="mx-auto text-rose-500 animate-pulse" />
            <div className="space-y-2">
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Access Denied</h1>
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] leading-relaxed italic">Strategic clearance insufficient. Terminal locked for security protocol.</p>
            </div>
            <Link href="/dashboard" className="block">
                <PremiumButton variant="outline" className="w-full h-14 rounded-2xl border-white/10 text-white font-black uppercase tracking-[0.2em] italic">
                    RETURN_SAFE_ZONE
                </PremiumButton>
            </Link>
        </PremiumCard>
      </div>
    )
  }

  const startDate = searchParams.startDate
  const endDate = searchParams.endDate

  const drivers = await getDetailedDriverAnalytics(startDate, endDate, branchId)

  const topThree = drivers.slice(0, 3)
  const rest = drivers.slice(3)

  return (
    <div className="space-y-12 pb-32 p-4 lg:p-10 bg-[#050110]">
      {/* Tactical Header */}
      <div className="bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div className="space-y-6">
            <Link href="/admin/analytics" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-[10px] group/back italic">
              <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
              STRATEGIC_INTELLIGENCE
            </Link>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary">
                <Trophy size={40} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">Operator Matrix</h1>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">Performance Intelligence & Rewards {branchId !== 'All' ? `// ${branchId}` : ''}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-xl">
            <MonthFilter />
          </div>
        </div>
      </div>

      {/* Podium Module (Top 3 Operators) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 px-4">
        {topThree.map((driver, idx) => (
          <PremiumCard key={driver.driverId} className={cn(
            "relative p-10 overflow-hidden group border-2 bg-[#0a0518]/60 rounded-[3.5rem] transition-all duration-700 hover:scale-[1.05]",
            idx === 0 ? "border-primary/50 shadow-[0_0_50px_rgba(255,30,133,0.2)] md:-translate-y-4 z-10" : 
            idx === 1 ? "border-slate-300/30" : "border-amber-700/30"
          )}>
            {/* Rank Designation */}
            <div className={cn(
                "absolute top-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl border-2 transition-transform group-hover:rotate-12",
                idx === 0 ? "bg-primary text-white border-primary/40 shadow-primary/20" :
                idx === 1 ? "bg-slate-300 text-black border-slate-200/40" : "bg-amber-700 text-white border-amber-600/40"
            )}>
                {idx === 0 ? <Trophy size={24} /> : <Medal size={24} />}
            </div>

            <div className="flex flex-col items-center text-center mt-6">
                <div className="w-28 h-28 rounded-[2.5rem] bg-white/5 mb-8 flex items-center justify-center text-4xl font-black text-white italic border-4 border-white/10 shadow-3xl relative group/avatar overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent group-hover/avatar:opacity-0 transition-opacity" />
                    {driver.name.slice(0, 1)}
                    <Badge className="absolute -bottom-2 bg-emerald-500 text-white border-4 border-[#0a0518] h-10 px-6 font-black italic tracking-widest text-xs shadow-xl">
                        RANK_{idx + 1}
                    </Badge>
                </div>
                
                <h3 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">{driver.name}</h3>
                <p className="text-primary text-[10px] uppercase font-black tracking-[0.4em] mb-10 italic opacity-70">{driver.plate} // {driver.type}</p>

                <div className="grid grid-cols-2 gap-6 w-full">
                    <div className="bg-black/40 rounded-3xl p-6 border border-white/5 group-hover:border-primary/20 transition-all shadow-inner">
                        <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest italic">On-Time_Rate</p>
                        <p className="text-2xl font-black text-emerald-500 italic">{driver.onTimeRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-black/40 rounded-3xl p-6 border border-white/5 group-hover:border-amber-500/20 transition-all shadow-inner">
                        <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest italic">Global_Rank</p>
                        <p className="text-2xl font-black text-amber-500 italic">#{driver.rank_pos || idx + 1}</p>
                    </div>
                </div>

                <div className="mt-10 w-full pt-8 border-t border-white/5">
                     <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Mission Integrity</span>
                        <span className="text-[10px] font-black text-white italic">{driver.completionRate.toFixed(1)}%</span>
                     </div>
                     <div className="h-3 w-full bg-[#050110] rounded-full overflow-hidden border border-white/5 p-0.5">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-600 to-green-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                            style={{ width: `${driver.completionRate}%` }}
                        />
                     </div>
                </div>
            </div>
            
            {/* Background Grid Accent */}
            <div className="absolute bottom-0 left-0 w-32 h-32 opacity-5 pointer-events-none translate-x-[-50%] translate-y-[50%]">
                <Target size={120} className="text-white" />
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Registry Table Module */}
      <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/registry">
          <div className="p-12 border-b border-white/5 bg-black/40 flex flex-col md:flex-row justify-between items-center gap-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-80 h-full bg-primary/[0.03] blur-3xl pointer-events-none" />
              <div className="relative z-10 flex items-center gap-6">
                <div className="p-4 bg-white/5 rounded-2xl text-primary border border-white/10 shadow-inner group-hover/registry:rotate-12 transition-transform duration-500">
                    <Activity size={28} />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-white tracking-[0.2em] uppercase italic">Operator Telemetry</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2 italic">Full operational stream for current epoch</p>
                </div>
              </div>
              <div className="relative z-10 w-full md:w-96 group/search">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/search:text-primary transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="SCAN_OPERATOR_SIGNATURE..." 
                    className="w-full h-18 bg-[#0a0518] border-white/5 rounded-3xl pl-16 pr-8 text-xs font-black uppercase tracking-[0.2em] focus:border-primary/30 transition-all text-white placeholder:text-slate-700 italic shadow-inner"
                  />
              </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-b border-white/5 bg-white/[0.02] hover:bg-transparent">
                        <TableHead className="w-[120px] p-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic text-center">Node_Rank</TableHead>
                        <TableHead className="p-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Operator_Entity</TableHead>
                        <TableHead className="p-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic text-center">Mission_Efficiency</TableHead>
                        <TableHead className="p-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic text-center">Time_Sync</TableHead>
                        <TableHead className="p-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic text-center">Sentiment</TableHead>
                        <TableHead className="p-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic text-center">Yield_Return</TableHead>
                        <TableHead className="p-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic text-right">Auth_Tier</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/[0.02]">
                    {drivers.map((driver, idx) => (
                        <TableRow key={driver.driverId} className="group/row hover:bg-white/[0.03] transition-all duration-300 border-none">
                            <TableCell className="p-10 text-center">
                               <div className={cn(
                                   "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm italic mx-auto shadow-inner border transition-all duration-500 group-hover/row:scale-110",
                                   idx < 3 ? "bg-primary/20 text-primary border-primary/30 shadow-primary/20" : "bg-white/5 text-slate-600 border-white/5"
                               )}>
                                  {idx + 1}
                               </div>
                            </TableCell>
                            <TableCell className="p-10">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-[#050110] flex items-center justify-center font-black text-primary border border-white/5 group-hover/row:border-primary/40 transition-all duration-500 shadow-xl overflow-hidden relative">
                                        <div className="absolute inset-0 bg-primary/5" />
                                        <span className="relative z-10 italic">{(driver.name || "A").charAt(0)}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-white text-base tracking-widest uppercase italic leading-none group-hover/row:text-primary transition-colors">{driver.name}</p>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{driver.plate}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="p-10">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="font-black text-white text-sm italic">{driver.completedJobs} / {driver.totalJobs}</span>
                                    <div className="w-32 h-2 bg-[#050110] rounded-full overflow-hidden border border-white/5 p-0.5">
                                        <div 
                                          className="h-full bg-primary shadow-[0_0_10px_rgba(255,30,133,0.5)] transition-all duration-1000" 
                                          style={{ width: `${(driver.completedJobs / (driver.totalJobs || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="p-10 text-center">
                                <div className={cn(
                                    "inline-flex items-center gap-3 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest italic shadow-lg transition-all group-hover/row:-translate-y-1",
                                    driver.onTimeRate >= 90 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : 
                                    driver.onTimeRate >= 70 ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                                )}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                    {driver.onTimeRate.toFixed(1)}%
                                </div>
                            </TableCell>
                            <TableCell className="p-10 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Star size={14} className={cn("transition-transform group-hover/row:rotate-12", driver.avgRating > 0 ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-white/5")} />
                                    <span className="font-black text-white italic text-sm">{driver.avgRating > 0 ? driver.avgRating.toFixed(1) : '-'}</span>
                                </div>
                            </TableCell>
                            <TableCell className="p-10 text-center">
                                <div className="flex flex-col">
                                    <span className="font-black text-emerald-500 italic text-sm tracking-widest">฿{driver.totalEarnings.toLocaleString()}</span>
                                    <span className="text-[8px] font-black text-emerald-900 uppercase tracking-widest leading-none mt-1">TOTAL_YIELD</span>
                                </div>
                            </TableCell>
                            <TableCell className="p-10 text-right">
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-[10px] font-black text-white italic tracking-[0.2em] uppercase">{driver.points} PTS</span>
                                    <Badge className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-4 py-1.5 border-none shadow-2xl rounded-xl italic",
                                        driver.rank.toLowerCase() === 'platinum' ? "bg-white text-black font-black" :
                                        driver.rank.toLowerCase() === 'gold' ? "bg-amber-500 text-black" :
                                        driver.rank.toLowerCase() === 'silver' ? "bg-slate-300 text-black" : "bg-amber-800 text-white"
                                    )}>
                                        {driver.rank}
                                    </Badge>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>

          {drivers.length === 0 && (
              <div className="p-40 text-center flex flex-col items-center justify-center gap-8 bg-black/40">
                   <User size={80} strokeWidth={1} className="text-slate-800 opacity-20" />
                   <p className="text-xl font-black text-slate-700 uppercase tracking-widest">Operator Registry Empty</p>
                   <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.5em] italic">No performance packets detected for this epoch.</p>
              </div>
          )}

          <div className="p-10 bg-white/[0.02] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] italic">
                 <Clock size={14} /> SEC_TIMESTAMP: {new Date().toISOString()}
              </div>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase italic tracking-widest">
                    <ShieldCheck size={14} /> AUDIT_VERIFIED
                  </div>
                  <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">v.6.4.2_TERMINAL</div>
              </div>
          </div>
      </PremiumCard>
    </div>
  )
}
