"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { DollarSign, TrendingUp, Percent, ArrowUpRight, ArrowDownRight, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

// Smart compact number formatter — never clips mid-digit
function formatCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}฿${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}฿${(abs / 1_000).toFixed(0)}K`
  return `${sign}฿${Math.round(abs).toLocaleString('th-TH')}`
}

type KPIData = {
  current: number
  previous?: number
  growth: number
  target?: number
  attainment?: number
}

type ExecutiveKPIs = {
  revenue: KPIData
  profit: KPIData
  margin: KPIData
  revenue_pipeline?: number
}

function GrowthBadge({ value, isPoints = false }: { value: number, isPoints?: boolean }) {
  const isPositive = value >= 0
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0",
      isPositive
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
        : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
    )}>
      {isPositive
        ? <ArrowUpRight size={9} strokeWidth={3} />
        : <ArrowDownRight size={9} strokeWidth={3} />}
      {Math.abs(value).toFixed(1)}{isPoints ? 'pt' : '%'}
    </span>
  )
}

export function FinancialSummaryCards({ data }: { data: ExecutiveKPIs }) {
  const { t } = useLanguage()
  if (!data) return null

  const revenue = data.revenue || { current: 0, growth: 0 }
  const profit  = data.profit  || { current: 0, previous: 0, growth: 0 }
  const margin  = data.margin  || { current: 0, growth: 0, target: 0 }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

      {/* ══ REVENUE ══ */}
      <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-primary bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_30px_rgba(255,30,133,0.12)] transition-shadow duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none" />
        <div className="p-4 flex flex-col gap-2.5 relative z-10">

          {/* Header */}
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/15 border border-primary/20 text-primary shrink-0 group-hover:scale-110 transition-transform duration-300">
              <DollarSign size={14} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-primary uppercase leading-tight truncate">{t('dashboard.gross_yield')}</p>
              <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.temporal_revenue')}</p>
            </div>
          </div>

          {/* Value */}
          <div className="flex items-end justify-between gap-2">
            <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
              {formatCompact(revenue.current)}
            </span>
            {revenue.growth !== undefined && <GrowthBadge value={revenue.growth} />}
          </div>

          {/* Pipeline badge */}
          {data.revenue_pipeline && data.revenue_pipeline > 0 && (
            <div className="flex items-center justify-between bg-primary/5 rounded-lg px-2.5 py-1.5 border border-primary/10">
              <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">Pipeline</span>
              <span className="text-[11px] font-black text-primary">{formatCompact(data.revenue_pipeline)}</span>
            </div>
          )}

          {/* Attainment bar */}
          {revenue.attainment !== undefined && revenue.attainment > 0 && (
            <div className="pt-0.5">
              <div className="flex justify-between mb-1">
                <span className="text-[8px] uppercase text-muted-foreground opacity-50 tracking-widest">Target</span>
                <span className="text-[8px] font-black text-primary">{revenue.attainment.toFixed(0)}%</span>
              </div>
              <div className="h-[3px] bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(revenue.attainment, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </PremiumCard>

      {/* ══ NET PROFIT ══ */}
      <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-purple-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] transition-shadow duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 to-transparent pointer-events-none" />
        <div className="p-4 flex flex-col gap-2.5 relative z-10">

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/20 text-purple-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp size={14} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-purple-400 uppercase leading-tight truncate">{t('dashboard.net_protocol')}</p>
              <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.profit_registry')}</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <span className={cn(
              "text-[1.65rem] font-black tracking-tight leading-none",
              profit.current < 0 ? 'text-rose-400' : 'text-foreground'
            )}>
              {formatCompact(profit.current)}
            </span>
            {profit.growth !== undefined && <GrowthBadge value={profit.growth} />}
          </div>

          {profit.previous !== undefined && profit.previous > 0 && (
            <div className="flex items-center justify-between pt-0.5 border-t border-border/5">
              <span className="text-[9px] text-muted-foreground uppercase opacity-50 font-semibold tracking-wide">เดือนก่อน</span>
              <span className="text-[11px] text-muted-foreground font-medium">{formatCompact(profit.previous)}</span>
            </div>
          )}
        </div>
      </PremiumCard>

      {/* ══ PROFIT MARGIN ══ */}
      <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-blue-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-shadow duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-transparent pointer-events-none" />
        <div className="p-4 flex flex-col gap-2.5 relative z-10">

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Percent size={14} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-blue-400 uppercase leading-tight truncate">{t('dashboard.sector_efficiency')}</p>
              <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.asset_utilization')}</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
              {(margin.current || 0).toFixed(1)}%
            </span>
            {margin.growth !== undefined && <GrowthBadge value={margin.growth} isPoints />}
          </div>

          {margin.target && margin.target > 0 && (
            <div className="pt-0.5">
              <div className="flex justify-between mb-1">
                <span className="text-[8px] uppercase text-muted-foreground opacity-50 tracking-widest">
                  Target {margin.target}%
                </span>
                <span className="text-[8px] font-black text-blue-400">
                  {margin.current >= margin.target
                    ? '✓ บรรลุเป้า'
                    : `${(margin.target - margin.current).toFixed(1)}pt`}
                </span>
              </div>
              <div className="h-[3px] bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((margin.current / (margin.target || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </PremiumCard>

      {/* ══ SYSTEM HEALTH ══ */}
      <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-emerald-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] transition-shadow duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-transparent pointer-events-none" />
        <div className="p-4 flex flex-col gap-2.5 relative z-10">

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck size={14} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-emerald-400 uppercase leading-tight truncate">{t('dashboard.network_integrity')}</p>
              <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.autonomous_audit')}</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <span className="text-[1.65rem] font-black text-emerald-400 tracking-tight leading-none">
              {t('dashboard.health_nominal')}
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-400 uppercase">Live</span>
            </div>
          </div>

          {/* Bar indicator */}
          <div className="flex gap-0.5">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-700",
                  i <= 9
                    ? 'h-[5px] bg-gradient-to-r from-emerald-500 to-emerald-300'
                    : 'h-[3px] bg-muted/30'
                )}
              />
            ))}
          </div>

          <p className="text-[8px] text-muted-foreground uppercase opacity-40 font-semibold tracking-widest truncate">
            {t('dashboard.performance_vector')}: {t('dashboard.optimal_sync')}
          </p>
        </div>
      </PremiumCard>

    </div>
  )
}
