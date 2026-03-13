"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { FuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { Fuel, Droplets, GaugeCircle, TrendingUp, AlertTriangle, Zap, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

export function FuelSection({ data }: { data: FuelAnalytics }) {
  const { totalLiters, totalCost, avgCostPerLiter, avgKmPerLiter, monthlyTrends, vehicleBreakdown, anomalies } = data

  // Max value for trend bars
  const maxTrendCost = Math.max(...monthlyTrends.map(m => m.totalCost), 1)

  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-950 rounded-xl text-orange-400 shadow-lg border border-slate-800">
          <Fuel size={18} />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight uppercase premium-text-gradient">Fuel & Energy Dynamics</h3>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Cost */}
        <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Energy Expenditure</span>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest italic">Operational Fuel Matrix</p>
              </div>
              <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400 shadow-lg shadow-orange-500/10">
                <Zap size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tighter relative z-10">฿{totalCost.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-4 opacity-50 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">{totalLiters.toLocaleString()} LITERS DISPENSED</p>
            </div>
        </PremiumCard>

        {/* Avg Cost / Liter */}
        <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Unit Market Cost</span>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest italic">Weighted Fuel Average</p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500 shadow-lg shadow-yellow-500/10">
                <Droplets size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tighter relative z-10">฿{avgCostPerLiter.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-4 opacity-50 relative z-10">
                <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-white/5">
                    <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(avgCostPerLiter / 50) * 100}%` }} />
                </div>
            </div>
        </PremiumCard>

        {/* Efficiency */}
        <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Asset Efficiency</span>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest italic">KM / Liter Strategic Yield</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-lg shadow-emerald-500/10">
                <GaugeCircle size={16} />
              </div>
            </div>
            <div className="text-4xl font-black text-white tracking-tighter relative z-10 italic">{avgKmPerLiter.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest italic flex items-center gap-2">
                    <Activity size={10} strokeWidth={3} /> SYSTEM OPTIMAL
                </p>
            </div>
        </PremiumCard>

        {/* Anomalies */}
        <PremiumCard className={cn(
            "border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem] transition-all duration-500",
            anomalies.length > 0 ? "bg-red-600 text-white" : "bg-slate-950"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] italic", anomalies.length > 0 ? "text-red-100" : "text-slate-400")}>
                    Integrity Alerts
                </span>
                <p className={cn("text-[8px] font-bold uppercase tracking-widest italic", anomalies.length > 0 ? "text-red-200" : "text-slate-500")}>
                    Consumption Divergence
                </p>
              </div>
              <div className={cn("p-2 rounded-xl shadow-lg", anomalies.length > 0 ? "bg-white/10 text-white" : "bg-red-500/10 text-red-500")}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className={cn("text-4xl font-black tracking-tighter relative z-10 italic", anomalies.length > 0 ? "text-white" : "text-white/20")}>
                {anomalies.length}
            </div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className={cn("text-[10px] font-black uppercase tracking-widest italic", anomalies.length > 0 ? "text-white animate-pulse" : "text-slate-600")}>
                    {anomalies.length > 0 ? "CRITICAL REVIEW REQUIRED" : "NO ANOMALIES DETECTED"}
                </p>
            </div>
        </PremiumCard>
      </div>

      {/* Fuel Intelligence Elite Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fuel Dynamics Trend */}
        <PremiumCard className="bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-orange-600 rounded-xl text-white shadow-lg shadow-orange-500/20">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight italic">Temporal Burn Registry</h3>
                  <p className="text-orange-400 text-[9px] font-bold uppercase tracking-[0.2em]">6-Month Expenditure Volatility</p>
                </div>
              </div>
           </div>
           <div className="p-10">
              <div className="flex items-end justify-between gap-4 h-56 relative">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03]">
                    {[1,2,3,4].map(i => <div key={i} className="w-full h-px bg-slate-950" />)}
                </div>

                {monthlyTrends.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-4 group relative z-10">
                        <div className="w-full bg-slate-50 rounded-2xl relative flex items-end justify-center group-hover:bg-slate-100 transition-all duration-500 p-1" style={{ height: '100%' }}>
                            <div 
                                className="w-full bg-gradient-to-t from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 transition-all duration-500 rounded-xl relative shadow-lg shadow-orange-500/10 group-hover:shadow-orange-500/30"
                                style={{ height: `${(m.totalCost / maxTrendCost) * 100}%` }}
                            >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-black text-white bg-slate-950 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap border border-slate-800 shadow-2xl scale-75 group-hover:scale-100 italic">
                                    ฿{m.totalCost.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{m.month}</span>
                    </div>
                ))}
                {monthlyTrends.length === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                        <Activity size={32} strokeWidth={1} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest italic opacity-50">Trend Data Unavailable</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>

        {/* Elite Asset Consumption Registry */}
        <PremiumCard className="bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-yellow-600 rounded-xl text-white shadow-lg shadow-yellow-500/20">
                  <Fuel size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight italic">Asset Consumption MATRIX</h3>
                  <p className="text-yellow-400 text-[9px] font-bold uppercase tracking-[0.2em]">High-Utility Asset Registry</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-slate-50">
                {vehicleBreakdown.slice(0, 6).map((v) => (
                    <div key={v.vehicle_plate} className="p-8 flex items-center justify-between group/v hover:bg-slate-100/50 transition-all border-l-4 border-transparent hover:border-orange-500">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[12px] font-black text-white shadow-xl italic group-hover/v:scale-110 transition-transform duration-500">
                                {v.vehicle_plate.slice(0, 2)}
                            </div>
                            <div>
                                <div className="text-slate-900 font-black text-lg tracking-tighter group-hover/v:text-orange-600 transition-colors uppercase italic">{v.vehicle_plate}</div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                       {v.logCount} TRANSACTIONS
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-black text-slate-950 tracking-tighter italic">฿{v.totalCost.toLocaleString()}</div>
                             <div className="text-[10px] text-emerald-600 font-black mt-1 uppercase tracking-widest italic bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 w-fit ml-auto">
                                Efficiency: {v.avgEfficiency.toFixed(1)} KM/L
                             </div>
                        </div>
                    </div>
                ))}
                 {vehicleBreakdown.length === 0 && (
                    <div className="p-24 text-center">
                        <Droplets size={48} strokeWidth={1} className="mx-auto mb-4 text-slate-200" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset Register Empty</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>
      </div>
    </div>
  )
}
