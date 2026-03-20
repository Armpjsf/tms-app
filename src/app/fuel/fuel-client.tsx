"use client"

import { 
  Fuel, 
  Plus,
  TrendingUp,
  Droplets,
  DollarSign,
  Hash,
  Activity,
  Zap,
  Target,
  ArrowRight
} from "lucide-react"
import { FuelDialog } from "@/components/fuel/fuel-dialog"
import { FuelActions } from "@/components/fuel/fuel-actions"
import { FuelAnalyticsDashboard } from "@/components/fuel/fuel-analytics-dashboard"
import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import NextImage from "next/image"

export function FuelClient({ 
  logs, 
  count, 
  drivers, 
  vehicles, 
  analytics, 
  limit,
  startDate,
  endDate
}: any) {
  return (
    <div className="space-y-12 pb-20">
      {/* Tactical Energy Header */}
      <div className="bg-[#0a0518] p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div>
            <div className="flex items-center gap-6 mb-4">
               <div className="p-4 bg-primary/20 rounded-[2rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                  <Fuel size={40} strokeWidth={2.5} />
               </div>
               <div>
                  <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none mb-2 italic">Energy Hub</h1>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] opacity-80 italic italic">Resource Consumption & Propulsion Matrix // FUEL_V3</p>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <FuelDialog 
                drivers={drivers}
                vehicles={vehicles}
                trigger={
                    <PremiumButton className="h-16 px-10 rounded-2xl shadow-[0_15px_30px_rgba(255,30,133,0.3)] gap-3 bg-primary hover:bg-primary/90">
                        <Plus size={24} strokeWidth={3} />
                        LOG REFUELING
                    </PremiumButton>
                }
            />
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Node */}
      <section className="space-y-10">
         <div className="flex items-center gap-6 mb-8 group/h">
            <div className="p-4 bg-primary/20 rounded-[1.5rem] text-primary border-2 border-primary/30 shadow-[0_0_30px_rgba(255,30,133,0.2)] group-hover/h:scale-110 transition-transform">
                <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-[0.2em] uppercase italic">Propulsion Intelligence</h2>
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.6em] opacity-60">Fleet Efficiency & Cost Variable Audit</p>
            </div>
         </div>
         <FuelAnalyticsDashboard analytics={analytics} />
      </section>

      {/* Signal Filtering Matrix */}
      <div className="space-y-8">
        <div className="flex items-center gap-6 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500 border-2 border-blue-500/30">
                <Activity size={20} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] italic">Signal Registry Filter</h3>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
              <SearchInput 
                placeholder="Plate ID, Operator Name, OP_KEY..." 
                className="h-16 bg-[#0a0518] border-2 border-white/5 rounded-2xl text-white placeholder:text-slate-600 focus:border-primary/50 transition-all font-black"
              />
          </div>
          <form className="flex flex-wrap lg:flex-nowrap gap-4 items-center">
              <div className="flex items-center gap-4 bg-[#0a0518] border-2 border-white/5 p-2 rounded-2xl">
                <Input 
                    type="date" 
                    name="startDate"
                    defaultValue={startDate}
                    className="h-12 bg-transparent border-none text-white focus:ring-0 uppercase font-black text-xs"
                />
                <ArrowRight size={16} className="text-slate-700" />
                <Input 
                    type="date" 
                    name="endDate"
                    defaultValue={endDate}
                    className="h-12 bg-transparent border-none text-white focus:ring-0 uppercase font-black text-xs"
                />
              </div>
              <PremiumButton type="submit" variant="secondary" className="h-16 px-10 rounded-2xl border-2 border-white/5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest italic">
                  SYNC DATA
              </PremiumButton>
          </form>
        </div>
      </div>

      {/* Fuel Log Ledger */}
      <PremiumCard className="bg-[#0a0518] border-2 border-white/5 p-0 overflow-hidden shadow-3xl rounded-br-[5rem] rounded-tl-[3rem]">
          <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-transparent" />
            <div className="flex items-center gap-6 relative z-10">
                <div className="p-4 bg-primary/20 rounded-3xl text-primary border-2 border-primary/30 shadow-[0_0_20px_rgba(255,30,133,0.3)]">
                    <Hash size={24} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-widest uppercase italic leading-none mb-1">Log Registry</h2>
                    <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Historical Propulsion Feed // NODE_PERSISTENCE</p>
                </div>
            </div>
            <div className="hidden lg:flex items-center gap-3 py-2 px-5 bg-white/5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">REALTIME_SIGNAL_ACTIVE</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {logs.length === 0 ? (
                <div className="p-32 text-center space-y-6">
                    <Droplets className="w-20 h-20 text-white/5 mx-auto animate-pulse" />
                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">No Propulsion Logs Detected in the Current Sphere</p>
                </div>
            ) : (
                <table className="w-full border-collapse">
                  <thead className="text-[10px] uppercase bg-black/60 text-slate-500 border-b border-white/5 font-black tracking-[0.3em] italic">
                    <tr>
                      <th className="text-left p-8">TIMESTAMP // ID</th>
                      <th className="text-left p-8">OPERATOR</th>
                      <th className="text-left p-8">PLATE</th>
                      <th className="text-left p-8">FACILITY // STATUS</th>
                      <th className="text-center p-8">ARTIFACT</th>
                      <th className="text-right p-8">VOL (L)</th>
                      <th className="text-right p-8">UNIT P</th>
                      <th className="text-right p-8">GROSS</th>
                      <th className="text-right p-8">ODOMETER</th>
                      <th className="text-right p-8">KM/L METRIC</th>
                      <th className="p-8 w-[100px]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log: any) => (
                  <tr 
                    key={log.Log_ID} 
                    className="hover:bg-white/[0.03] transition-all group/row"
                  >
                    <td className="p-8">
                      <span className="text-white font-black text-sm tracking-widest uppercase italic opacity-90">
                        {log.Date_Time ? new Date(log.Date_Time).toLocaleString('th-TH', { 
                          timeZone: 'Asia/Bangkok',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : "VOID"}
                      </span>
                    </td>
                    <td className="p-8 text-white font-black text-sm tracking-widest uppercase">{log.Driver_Name || "UNASSIGNED"}</td>
                    <td className="p-8">
                       <span className="px-4 py-1.5 bg-white/5 rounded-xl border border-white/10 text-white font-black text-xs tracking-widest uppercase">{log.Vehicle_Plate || "VOID_ID"}</span>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col gap-2">
                          <span className="text-white font-black text-xs tracking-widest uppercase">{log.Station_Name || "DEFAULT_HUB"}</span>
                          <span className={cn(
                             "text-[9px] px-3 py-1 rounded-full w-fit font-black uppercase tracking-widest",
                             log.Status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                             log.Status === 'Rejected' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/20' :
                             'bg-white/5 text-slate-500 border border-white/10'
                          )}>
                              {log.Status === 'Approved' ? 'SYNCHRONIZED' : 
                               log.Status === 'Rejected' ? 'DENIED' : 'PENDING'}
                          </span>
                      </div>
                    </td>
                    <td className="p-8 text-center text-center">
                      {log.Photo_Url ? (
                          <div className="relative w-12 h-12 mx-auto rounded-2xl overflow-hidden border-2 border-white/10 bg-slate-900 group cursor-pointer shadow-2xl hover:border-primary/50 transition-all">
                              <NextImage 
                                  src={log.Photo_Url} 
                                  alt="Receipt" 
                                  fill 
                                  className="object-cover group-hover:scale-110 transition-transform duration-500" 
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a href={log.Photo_Url} target="_blank" rel="noreferrer">
                                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-md border border-primary/30">
                                          <span className="text-[10px] text-primary">👁️</span>
                                      </div>
                                  </a>
                              </div>
                          </div>
                      ) : (
                          <span className="text-slate-800 text-xs font-black">N/A</span>
                      )}
                    </td>
                    <td className="p-8 text-right">
                       <div className="flex flex-col items-end gap-1">
                           <span className={cn(
                             "text-base font-black italic tracking-tighter",
                             log.Capacity_Status === 'Overflow' ? 'text-rose-500' : 'text-white'
                           )}>
                               {log.Liters?.toFixed(2)}
                           </span>
                           {log.Capacity_Status === 'Overflow' && (
                               <span className="text-[8px] text-white bg-rose-600 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest animate-pulse">
                                   OVERFLOW ALERT
                               </span>
                           )}
                       </div>
                    </td>
                    <td className="p-8 text-right text-slate-500 font-black text-xs tracking-tighter italic">
                        ฿{(log.Price_Total && log.Liters) ? (log.Price_Total / log.Liters).toFixed(2) : "0.00"}
                    </td>
                    <td className="p-8 text-right">
                      <span className="text-xl font-black text-white italic tracking-tighter bg-primary/10 px-6 py-2 rounded-2xl border-2 border-primary/20 group-hover/row:scale-110 transition-transform block w-fit ml-auto shadow-[0_5px_15px_rgba(255,30,133,0.1)]">
                        ฿{log.Price_Total?.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-8 text-right text-white font-black italic text-base tracking-tighter opacity-80">{log.Odometer?.toLocaleString() || "VOID"}</td>
                    <td className="p-8 text-right">
                       {log.Km_Per_Liter && log.Km_Per_Liter > 0 ? (
                           <div className="flex flex-col items-end gap-1">
                               <div className={cn(
                                   "flex items-center justify-end gap-2",
                                   log.Efficiency_Status === 'Normal' ? 'text-emerald-400' : 
                                   log.Efficiency_Status === 'Warning' ? 'text-amber-400' : 'text-rose-500'
                               )}>
                                   <span className="font-black text-base italic">{log.Km_Per_Liter.toFixed(1)}</span>
                                   <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Km/L</span>
                               </div>
                               {log.Efficiency_Status !== 'Normal' && (
                                   <span className={cn(
                                       "text-[8px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest",
                                       log.Efficiency_Status === 'Warning' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-rose-500 bg-rose-500/10 border border-rose-500/20'
                                   )}>
                                       {log.Efficiency_Status === 'Warning' ? 'Low Output' : 'Critical Drift'}
                                   </span>
                               )}
                           </div>
                       ) : (
                           <span className="text-slate-800 font-black text-xs">NO_METRIC</span>
                       )}
                    </td>
                    <td className="p-8">
                      <FuelActions 
                          log={log} 
                          drivers={drivers}
                          vehicles={vehicles}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>

          <div className="p-10 border-t border-white/5 bg-black/40 flex justify-center">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
      </PremiumCard>
    </div>
  )
}
