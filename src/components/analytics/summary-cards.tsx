"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { DollarSign, TrendingUp, Percent, ArrowUpRight, ArrowDownRight, Target, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

type KPIData = {
  current: number;
  previous: number;
  growth: number;
  target?: number;
  attainment?: number;
}

type ExecutiveKPIs = {
  revenue: KPIData;
  profit: KPIData;
  margin: KPIData;
}

const GrowthIndicator = ({ value, isPoints = false }: { value: number, isPoints?: boolean }) => {
  const { t } = useLanguage()
  const isPositive = value >= 0
  return (
    <div className={cn(
        "flex items-center gap-2 px-4 py-1.5 rounded-xl text-base font-bold font-black uppercase italic transition-all group-hover:scale-105",
        isPositive ? 'bg-emerald-500/10 text-emerald-400 border-2 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 text-rose-500 border-2 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
    )}>
      {isPositive ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
      {Math.abs(value).toFixed(1)}{isPoints ? ` ${t('common.pts_unit')}` : '%'}
    </div>
  )
}

export function FinancialSummaryCards({ data }: { data: ExecutiveKPIs }) {
  const { t } = useLanguage()
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount || 0)
  }

  if (!data) return null;

  const revenue = data.revenue || { current: 0, growth: 0 }
  const profit = data.profit || { current: 0, previous: 0, growth: 0 }
  const margin = data.margin || { current: 0, growth: 0, target: 0 }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {/* Revenue COMMAND */}
      <PremiumCard className="bg-muted/50 border border-border/10 shadow-3xl relative overflow-hidden group p-0 rounded-br-[4rem] rounded-tl-[2rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent pointer-events-none" />
        <div className="p-10 border-b border-border/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent backdrop-blur-md">
           <div className="space-y-1">
              <h3 className="text-base font-bold font-black text-primary uppercase italic">{t('dashboard.gross_yield')}</h3>
              <p className="text-base font-bold text-muted-foreground font-black uppercase italic">{t('dashboard.temporal_revenue')}</p>
           </div>
           <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-[0_0_20px_rgba(255,30,133,0.3)] border border-primary/30">
              <DollarSign size={20} strokeWidth={2.5} />
           </div>
        </div>
        <div className="p-10">
          <div className="flex flex-col gap-4">
            <div className="text-5xl font-black text-foreground italic">{formatCurrency(revenue.current)}</div>
            <div className="flex items-center justify-between mt-2">
                <GrowthIndicator value={revenue.growth} />
                <span className="text-base font-bold font-black text-muted-foreground uppercase italic border-l-2 border-border/5 pl-4">{t('common.sync_active')}</span>
            </div>
          </div>
          {revenue.target && (
            <div className="mt-10 space-y-3">
              <div className="flex justify-between text-base font-bold uppercase text-muted-foreground font-black italic">
                <span>{t('dashboard.mission_threshold')}</span>
                <span className="text-primary">{revenue.attainment?.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden border border-border/10 p-0.5">
                <div 
                    className="bg-gradient-to-r from-primary to-purple-600 h-full rounded-full shadow-[0_0_15px_rgba(255,30,133,0.5)]" 
                    style={{ width: `${Math.min(revenue.attainment || 0, 100)}%` }} 
                />
              </div>
            </div>
          )}
        </div>
      </PremiumCard>

      {/* Net Profit COMMAND */}
      <PremiumCard className="bg-muted/50 border border-border/10 shadow-3xl relative overflow-hidden group p-0 rounded-br-[4rem] rounded-tl-[2rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="p-10 border-b border-border/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent backdrop-blur-md">
           <div className="space-y-1">
              <h3 className="text-base font-bold font-black text-purple-400 uppercase italic">{t('dashboard.net_protocol')}</h3>
              <p className="text-base font-bold text-muted-foreground font-black uppercase italic">{t('dashboard.profit_registry')}</p>
           </div>
           <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-purple-500/30">
              <TrendingUp size={20} strokeWidth={2.5} />
           </div>
        </div>
        <div className="p-10">
          <div className="flex flex-col gap-4">
            <div className={cn("text-5xl font-black italic", profit.current >= 0 ? 'text-foreground' : 'text-rose-500')}>
              {formatCurrency(profit.current)}
            </div>
            <div className="flex items-center justify-between mt-2">
                <GrowthIndicator value={profit.growth} />
                <p className="text-base font-bold text-muted-foreground font-black uppercase italic border-l-2 border-border/5 pl-4">
                   {t('common.v_node_label')} {formatCurrency(profit.previous)}
                </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* Profit Margin COMMAND */}
      <PremiumCard className="bg-muted/50 border border-border/10 shadow-3xl relative overflow-hidden group p-0 rounded-br-[4rem] rounded-tl-[2rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent pointer-events-none" />
        <div className="p-10 border-b border-border/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent backdrop-blur-md">
           <div className="space-y-1">
              <h3 className="text-base font-bold font-black text-blue-400 uppercase italic">{t('dashboard.sector_efficiency')}</h3>
              <p className="text-base font-bold text-muted-foreground font-black uppercase italic">{t('dashboard.asset_utilization')}</p>
           </div>
           <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-500/30">
              <Percent size={20} strokeWidth={2.5} />
           </div>
        </div>
        <div className="p-10">
          <div className="flex flex-col gap-4">
            <div className="text-5xl font-black text-foreground italic">{(margin.current || 0).toFixed(1)}%</div>
            <div className="flex items-center justify-between mt-2">
                <GrowthIndicator value={margin.growth} isPoints />
                <div className="flex items-center gap-3 border-l-2 border-border/5 pl-4">
                    <Target size={12} className="text-blue-400" />
                    <span className="text-base font-bold font-black text-muted-foreground uppercase italic">{t('common.target_label')} {margin.target}%</span>
                </div>
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* INTELLIGENCE Health Score */}
      <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl relative overflow-hidden group p-10 rounded-br-[4rem] rounded-tl-[2rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] group-hover:bg-emerald-500/30 transition-all duration-700" />
        
        <div className="flex items-center justify-between mb-10 relative z-10">
           <div className="space-y-1">
              <h3 className="text-[12px] font-black text-emerald-600 uppercase italic">{t('dashboard.network_integrity')}</h3>
              <p className="text-base font-bold text-muted-foreground font-black uppercase italic">{t('dashboard.autonomous_audit')}</p>
           </div>
           <div className="w-5 h-5 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] border-4 border-white animate-pulse" />
        </div>

        <div className="flex flex-col items-start gap-2 relative z-10">
            <div className="text-5xl font-black text-emerald-400 tracking-tighter italic flex items-center gap-4 group-hover:scale-105 transition-transform origin-left">
                {t('dashboard.health_nominal')} <ShieldCheck className="text-emerald-400 shadow-sm" size={40} />
            </div>
            <p className="text-base font-bold text-muted-foreground font-black uppercase mt-4 italic bg-emerald-500/5 px-4 py-2 rounded-2xl border-2 border-emerald-500/10">{t('dashboard.performance_vector')}: {t('dashboard.optimal_sync')}</p>
        </div>

        <div className="flex gap-2 mt-10 relative z-10">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <div key={i} className={cn(
                    "h-2 flex-1 rounded-full transition-all duration-700",
                    i <= 9 ? 'bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800'
                )} />
            ))}
        </div>
      </PremiumCard>
    </div>
  )
}

