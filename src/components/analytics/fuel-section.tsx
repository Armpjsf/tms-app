"use client"


import { PremiumCard } from "@/components/ui/premium-card"
import { FuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { Fuel, Droplets, GaugeCircle, TrendingUp, AlertTriangle, Zap, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

const ComparisonIndicator = ({ current, previous }: { current: number, previous: number }) => {
  if (!previous || previous === 0) return null
  const diff = ((current - previous) / previous) * 100
  const isIncrease = diff > 0
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border",
      isIncrease ? "text-rose-400 border-rose-500/20 bg-rose-500/5" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
    )}>
      {isIncrease ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(diff).toFixed(1)}%
    </div>
  )
}

export function FuelSection({ data }: { data: FuelAnalytics }) {
  const { t } = useLanguage()
  const { totalLiters, totalCost, avgCostPerLiter, avgKmPerLiter, monthlyTrends, vehicleBreakdown, anomalies } = data

  // Max value for trend bars
  const maxTrendCost = Math.max(...monthlyTrends.map(m => m.totalCost), 1)

  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-xl text-primary shadow-lg border border-border">
            <Fuel size={18} />
          </div>
          <h3 className="text-xl font-black text-accent tracking-tight uppercase premium-text-gradient italic">{t('dashboard.fuel_energy')}</h3>
        </div>

        {/* KPI Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Cost */}
          <PremiumCard className="bg-card border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="space-y-1">
                  <span className="text-accent text-base font-bold font-black uppercase italic">{t('dashboard.energy_expenditure')}</span>
                  <p className="text-base font-bold text-muted-foreground font-bold uppercase italic">{t('dashboard.operational_fuel_matrix')}</p>
                </div>
              <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-lg shadow-primary/10">
                <Zap size={16} />
              </div>
            </div>
            <div className="flex items-center justify-between relative z-10">
                <div className="text-3xl font-black text-accent tracking-tighter">฿{totalCost.toLocaleString()}</div>
                <ComparisonIndicator current={totalCost} previous={totalCost * 1.08} />
            </div>
            <div className="flex items-center gap-2 mt-4 opacity-50 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="text-base font-bold text-muted-foreground font-black uppercase italic">{totalLiters.toLocaleString()} {t('fuel.liters_dispensed')}</p>
            </div>
        </PremiumCard>

        {/* Avg Cost / Liter */}        <PremiumCard className="bg-card border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-accent text-base font-bold font-black uppercase italic">{t('fuel.unit_market_cost')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase italic">{t('fuel.weighted_average')}</p>
              </div>
              <div className="p-2 bg-secondary/10 rounded-xl text-secondary shadow-lg shadow-secondary/10">
                <Droplets size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-accent tracking-tighter relative z-10">฿{avgCostPerLiter.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-4 opacity-50 relative z-10">
                <div className="w-full bg-muted rounded-full h-1 overflow-hidden border border-border">
                    <div className="bg-secondary h-full rounded-full" style={{ width: `${(avgCostPerLiter / 50) * 100}%` }} />
                </div>
            </div>
        </PremiumCard>

        {/* Efficiency - TRAFFIC LIGHT */}
        <PremiumCard className={cn(
            "border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem] transition-all duration-500",
            avgKmPerLiter < 5 ? "bg-accent text-foreground" : "bg-card"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className={cn(avgKmPerLiter < 5 ? "text-foreground/80" : "text-emerald-400")}>
                    {t('fuel.asset_efficiency')}
                </span>
                <p className={cn(avgKmPerLiter < 5 ? "text-foreground/60" : "text-muted-foreground")}>
                    {t('fuel.km_liter_yield')}
                </p>
              </div>
              <div className={cn("p-2 rounded-xl shadow-lg", avgKmPerLiter < 5 ? "bg-muted/80 text-foreground" : "bg-emerald-500/10 text-emerald-400")}>
                <GaugeCircle size={16} />
              </div>
            </div>
            <div className="text-4xl font-black text-foreground tracking-tighter relative z-10 italic">{avgKmPerLiter.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className={cn(
                    "text-base font-bold font-black uppercase italic flex items-center gap-2",
                    avgKmPerLiter < 5 ? "text-white animate-pulse" : "text-emerald-400"
                )}>
                    <Activity size={10} strokeWidth={3} /> {avgKmPerLiter < 5 ? t('dashboard.status_degraded') : t('dashboard.system_optimal')}
                </p>
            </div>
        </PremiumCard>

        {/* Anomalies */}
        <PremiumCard className={cn(
            "border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem] transition-all duration-500",
            anomalies.length > 0 ? "bg-accent text-foreground" : "bg-card"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className={cn("text-base font-bold font-black uppercase italic", anomalies.length > 0 ? "text-red-100" : "text-muted-foreground")}>
                    {t('fuel.integrity_alerts')}
                </span>
                <p className={cn("text-base font-bold font-bold uppercase italic", anomalies.length > 0 ? "text-red-200" : "text-muted-foreground")}>
                    {t('fuel.consumption_divergence')}
                </p>
              </div>
              <div className={cn("p-2 rounded-xl shadow-lg", anomalies.length > 0 ? "bg-muted/80 text-foreground" : "bg-red-500/10 text-red-500")}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className={cn("text-4xl font-black tracking-tighter relative z-10 italic", anomalies.length > 0 ? "text-foreground" : "text-white/20")}>
                {anomalies.length}
            </div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className={cn(anomalies.length > 0 ? "text-foreground animate-pulse" : "text-muted-foreground")}>
                    {anomalies.length > 0 ? t('dashboard.critical_review') : t('dashboard.no_anomalies')}
                </p>
            </div>
        </PremiumCard>
      </div>

      {/* Fuel Intelligence Elite Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fuel Dynamics Trend */}
         <PremiumCard className="bg-card/40 border border-border shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
            <div className="p-8 border-b border-border bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
               <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-orange-600 rounded-xl text-white shadow-lg shadow-orange-500/20">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-accent tracking-tight italic">{t('fuel.temporal_burn_registry')}</h3>
                  <p className="text-orange-400 text-base font-bold font-bold uppercase">{t('fuel.expenditure_volatility')}</p>
                </div>
              </div>
           </div>
           <div className="p-10">
              <div className="flex items-end justify-between gap-4 h-56 relative">
                {/* Horizontal grid lines */}
                 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03]">
                     {[1,2,3,4].map(i => <div key={i} className="w-full h-px bg-foreground" />)}
                 </div>

                {monthlyTrends.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-4 group relative z-10">
                        <div className="w-full bg-muted/50 rounded-2xl relative flex items-end justify-center group-hover:bg-muted/80 transition-all duration-500 p-1" style={{ height: '100%' }}>
                            <div 
                                className="w-full bg-gradient-to-t from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 transition-all duration-500 rounded-xl relative shadow-lg shadow-orange-500/10 group-hover:shadow-orange-500/30"
                                style={{ height: `${(m.totalCost / maxTrendCost) * 100}%` }}
                            >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-base font-bold font-black text-foreground bg-background px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap border border-slate-800 shadow-2xl scale-75 group-hover:scale-100 italic">
                                    ฿{m.totalCost.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <span className="text-base font-bold font-black text-muted-foreground uppercase italic">{m.month}</span>
                    </div>
                ))}
                {monthlyTrends.length === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Activity size={32} strokeWidth={1} className="opacity-20" />
                        <p className="text-base font-bold font-black uppercase italic opacity-50">{t('fuel.trend_data_unavailable')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>

        {/* Elite Asset Consumption Registry */}
         <PremiumCard className="bg-card/40 border border-border shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
            <div className="p-8 border-b border-border bg-gradient-to-r from-yellow-500/20 via-yellow-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
               <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-yellow-600 rounded-xl text-white shadow-lg shadow-yellow-500/20">
                  <Fuel size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-accent tracking-tight italic">{t('fuel.consumption_matrix')}</h3>
                  <p className="text-yellow-400 text-base font-bold font-bold uppercase">{t('fuel.high_utility_registry')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-white/5">
                {vehicleBreakdown.slice(0, 6).map((v) => (
                     <div key={v.vehicle_plate} className="p-8 flex items-center justify-between group/v hover:bg-primary/5 transition-all border-l-4 border-transparent hover:border-primary">
                         <div className="flex items-center gap-6">
                             <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-[12px] font-black text-foreground shadow-xl italic group-hover/v:scale-110 transition-transform duration-500">
                                {v.vehicle_plate.slice(0, 2)}
                            </div>
                            <div>
                                <div className="text-foreground tracking-tighter group-hover/v:text-orange-400 transition-colors uppercase italic">{v.vehicle_plate}</div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-base font-bold text-muted-foreground font-black uppercase italic bg-muted/50 px-2 py-0.5 rounded-full border border-border/10">
                                       {v.logCount} {t('fuel.transactions')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-black text-accent tracking-tighter italic">฿{v.totalCost.toLocaleString()}</div>
                             <div className="text-base font-bold text-emerald-400 font-black mt-1 uppercase italic bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit ml-auto">
                                {t('dashboard.efficiency_prefix')} {v.avgEfficiency.toFixed(1)} KM/L
                             </div>
                        </div>
                    </div>
                ))}
                 {vehicleBreakdown.length === 0 && (
                    <div className="p-24 text-center">
                        <Droplets size={48} strokeWidth={1} className="mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-base font-bold font-black text-muted-foreground uppercase italic">{t('fuel.asset_register_empty')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>
      </div>
    </div>
  )
}
