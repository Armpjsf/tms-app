"use client"

import { motion } from "framer-motion"
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Gauge,
  DollarSign,
  Droplets,
  Activity,
  Target
} from "lucide-react"
import type { FuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { PremiumCard } from "@/components/ui/premium-card"
import { cn } from "@/lib/utils"

export function FuelAnalyticsDashboard({ analytics }: { analytics: FuelAnalytics }) {
  const maxCost = Math.max(...analytics.vehicleBreakdown.map(v => v.totalCost), 1)
  const maxMonthCost = Math.max(...analytics.monthlyTrends.map(m => m.totalCost), 1)

  return (
    <div className="space-y-10">
      {/* Tactical KPI Hub */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <PremiumCard className="bg-background border-2 border-border/5 p-8 relative overflow-hidden group">
           <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest leading-none">Total Volume</span>
              <Droplets size={18} className="text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
           </div>
           <p className="text-4xl font-black text-accent italic tracking-tighter mb-1">{analytics.totalLiters.toLocaleString()} L</p>
           <p className="text-base font-bold text-primary font-black uppercase tracking-[0.2em]">{analytics.totalLogs} SYNC NODES</p>
           <div className="absolute bottom-0 left-0 h-1 bg-accent w-12 rounded-full shadow-[0_0_10px_rgba(182,9,0,0.5)]" />
        </PremiumCard>

        <PremiumCard className="bg-background border-2 border-border/5 p-8 relative overflow-hidden group">
           <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest leading-none">Net Expenditure</span>
              <DollarSign size={18} className="text-primary/80 opacity-30 group-hover:opacity-100 transition-opacity" />
           </div>
           <p className="text-4xl font-black text-accent italic tracking-tighter">฿{analytics.totalCost.toLocaleString()}</p>
           <div className="absolute bottom-0 left-0 h-1 bg-accent/50 w-8 rounded-full shadow-[0_0_10px_rgba(182,9,0,0.3)]" />
        </PremiumCard>

        <PremiumCard className="bg-background border-2 border-border/5 p-8 relative overflow-hidden group">
           <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest leading-none">Unit Valuation</span>
              <Fuel size={18} className="text-blue-400 opacity-30 group-hover:opacity-100 transition-opacity" />
           </div>
           <p className="text-4xl font-black text-accent italic tracking-tighter">฿{analytics.avgCostPerLiter.toFixed(2)}</p>
           <div className="absolute bottom-0 left-0 h-1 bg-accent w-8 rounded-full shadow-[0_0_10px_rgba(182,9,0,0.4)]" />
        </PremiumCard>

        <PremiumCard className="bg-background border-2 border-border/5 p-8 relative overflow-hidden group">
           <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest leading-none">Fleet Efficiency</span>
              <Gauge size={18} className="text-accent/80 opacity-30 group-hover:opacity-100 transition-opacity" />
           </div>
           <p className="text-4xl font-black text-accent italic tracking-tighter leading-none">{analytics.avgKmPerLiter || 'SECURE'}</p>
           <div className="mt-2">
              <span className={cn(
                 "text-base font-bold font-black px-3 py-1 rounded-full uppercase tracking-widest",
                 analytics.avgKmPerLiter >= 8 ? 'bg-emerald-500/10 text-emerald-400' : 
                 analytics.avgKmPerLiter >= 5 ? 'bg-amber-500/10 text-amber-400' : 
                 analytics.avgKmPerLiter > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-muted/50 text-muted-foreground'
              )}>
                 {analytics.avgKmPerLiter >= 8 ? 'Optimal' : analytics.avgKmPerLiter >= 5 ? 'Degraded' : analytics.avgKmPerLiter > 0 ? 'Critical' : 'N/A'}
              </span>
           </div>
        </PremiumCard>

        <PremiumCard className="bg-background/50 border-2 border-rose-500/20 p-8 shadow-[0_0_30px_rgba(244,63,94,0.1)] relative overflow-hidden group">
           <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold font-black text-rose-500 uppercase tracking-widest leading-none">Anomalies</span>
              <AlertTriangle size={18} className="text-rose-500 animate-pulse" />
           </div>
           <p className="text-4xl font-black text-rose-500 italic tracking-tighter">{analytics.anomalies.length}</p>
           <p className="text-base font-bold font-black uppercase text-rose-700 tracking-[0.2em] mt-1">Divergent Signals</p>
        </PremiumCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Temporal Trends */}
        <PremiumCard className="bg-background border-2 border-border/5 p-0 overflow-hidden rounded-[3rem]">
          <div className="p-8 border-b border-border/5 bg-black/40 flex items-center justify-between">
             <h3 className="text-xl font-black text-accent uppercase tracking-[0.4em] flex items-center gap-4 italic">
                <BarChart3 className="text-accent" size={18} />
                Temporal Drift
             </h3>
             <Activity className="text-primary/30" size={16} />
          </div>
          <div className="p-10 space-y-6">
            {analytics.monthlyTrends.length === 0 ? (
              <p className="text-lg font-bold font-black text-muted-foreground text-center py-12 uppercase tracking-widest">No temporal data detected</p>
            ) : (
              <div className="space-y-6">
                {analytics.monthlyTrends.map((month, i) => {
                  const prev = analytics.monthlyTrends[i - 1]
                  const change = prev ? ((month.totalCost - prev.totalCost) / prev.totalCost * 100) : 0
                  return (
                    <div key={month.month} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold font-black text-muted-foreground uppercase tracking-widest">{month.month}</span>
                        <div className="flex items-center gap-6">
                          <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">{month.totalLiters.toLocaleString()} L</span>
                          <span className="text-xl font-black text-foreground italic">฿{month.totalCost.toLocaleString()}</span>
                          {prev && (
                            <div className={cn(
                               "px-2 py-1 rounded-lg text-base font-bold font-black flex items-center gap-1",
                               change > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-400'
                            )}>
                              {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {Math.abs(change).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden border border-border/5 p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(month.totalCost / maxMonthCost) * 100}%` }}
                          className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full shadow-[0_0_10px_rgba(255,30,133,0.3)]"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </PremiumCard>

        {/* Asset Yield Ranking */}
        <PremiumCard className="bg-background border-2 border-border/5 p-0 overflow-hidden rounded-[3rem]">
          <div className="p-8 border-b border-border/5 bg-black/40 flex items-center justify-between">
             <h3 className="text-xl font-black text-accent uppercase tracking-[0.4em] flex items-center gap-4 italic">
                <Fuel className="text-accent" size={18} />
                Asset Consumption Hierarchy
             </h3>
             <Target className="text-primary/30" size={16} />
          </div>
          <div className="p-10 space-y-4">
            {analytics.vehicleBreakdown.length === 0 ? (
              <p className="text-lg font-bold font-black text-muted-foreground text-center py-12 uppercase tracking-widest">No Asset data clusters found</p>
            ) : (
              <div className="space-y-5">
                {analytics.vehicleBreakdown.slice(0, 10).map((v, i) => (
                  <div key={v.vehicle_plate} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-xl bg-muted/50 border border-border/10 flex items-center justify-center text-base font-bold text-primary font-black">
                          0{i + 1}
                        </span>
                        <span className="text-xl font-black text-foreground tracking-widest uppercase">{v.vehicle_plate}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">{v.totalLiters} L</span>
                        {v.avgEfficiency > 0 && (
                          <span className={cn(
                             "px-3 py-1 rounded-xl text-base font-bold font-black uppercase tracking-widest",
                             v.avgEfficiency >= 8 ? 'bg-emerald-500/10 text-emerald-400' :
                             v.avgEfficiency >= 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                          )}>
                            {v.avgEfficiency} km/L
                          </span>
                        )}
                        <span className="text-xl font-black text-accent italic">฿{v.totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(v.totalCost / maxCost) * 100}%` }}
                        className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PremiumCard>
      </div>

      {/* Anomalies Warning Console */}
      {analytics.anomalies.length > 0 && (
        <PremiumCard className="bg-rose-500/5 border-2 border-rose-500/30 rounded-[3rem] p-0 overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.1)]">
          <div className="p-8 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-4">
             <AlertTriangle className="text-rose-500 animate-bounce" size={24} />
             <h3 className="text-xl font-black text-foreground uppercase tracking-widest italic">Anomalous Consumptions Detected ({analytics.anomalies.length})</h3>
          </div>
          <div className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analytics.anomalies.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-background border-2 border-rose-500/20 hover:border-rose-500/50 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 border border-rose-500/30">
                       <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-foreground tracking-widest uppercase mb-1">{a.vehicle_plate}</p>
                      <p className="text-base font-bold font-black text-rose-400 uppercase tracking-widest opacity-80">{a.issue}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-lg font-black text-foreground italic">฿{a.cost.toLocaleString()}</p>
                    <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">{a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PremiumCard>
      )}
    </div>
  )
}

