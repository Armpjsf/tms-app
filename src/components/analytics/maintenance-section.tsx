"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { MaintenanceScheduleData } from "@/lib/supabase/maintenance-schedule"
import { Wrench, AlertTriangle, CheckCircle2, Truck, Activity, Clock, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `฿${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `฿${(abs / 1_000).toFixed(0)}K`
  return `฿${Math.round(abs).toLocaleString('th-TH')}`
}

export function MaintenanceSection({ data }: { data: MaintenanceScheduleData }) {
  const { t } = useLanguage()
  const {
    overdue = [],
    dueSoon = [],
    activeRepairs = 0,
    completedThisMonth = 0,
    totalCostThisMonth = 0,
    vehicleHealthSummary = [],
  } = data || {}

  const safeCost = Number(totalCostThisMonth) || 0
  const hasCritical = overdue.length > 0

  return (
    <div className="space-y-6">

      {/* ── Section Title ── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-background rounded-xl text-amber-500 shadow-lg border border-slate-800">
          <Wrench size={16} />
        </div>
        <h3 className="text-lg font-black text-foreground uppercase tracking-tight premium-text-gradient">
          {t('common.maintenance_protocol')}
        </h3>
      </div>

      {/* ── 4-Card KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

        {/* Active Repairs */}
        <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-blue-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_25px_rgba(59,130,246,0.1)] transition-shadow duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/6 to-transparent pointer-events-none" />
          <div className="p-4 flex flex-col gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Wrench size={13} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-blue-400 uppercase leading-tight truncate">{t('dashboard.active_hangar')}</p>
                <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.live_repair_log')}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
                {activeRepairs}
              </span>
              <span className="text-[9px] text-blue-400 font-semibold shrink-0 uppercase flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {t('dashboard.assets_label')}
              </span>
            </div>
            <p className="text-[9px] text-blue-400 font-semibold uppercase opacity-60 truncate">{t('dashboard.mission_inactive')}</p>
          </div>
        </PremiumCard>

        {/* Critical — Overdue */}
        <PremiumCard className={cn(
          "relative overflow-hidden p-0 border border-l-[3px] transition-all duration-500 group",
          hasCritical
            ? "bg-rose-950/80 border-border/10 border-l-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)]"
            : "bg-background/60 border-border/10 border-l-slate-600 backdrop-blur-sm"
        )}>
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none",
            hasCritical ? 'from-rose-500/10' : 'from-muted/5'
          )} />
          <div className="p-4 flex flex-col gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className={cn(
                "p-1.5 rounded-lg border shrink-0 group-hover:scale-110 transition-transform duration-300",
                hasCritical
                  ? "bg-rose-500/20 border-rose-500/30 text-rose-300"
                  : "bg-muted/20 border-border/20 text-muted-foreground"
              )}>
                <AlertTriangle size={13} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-[11px] font-black uppercase leading-tight truncate",
                  hasCritical ? "text-rose-300" : "text-muted-foreground"
                )}>{t('dashboard.overdue_exposure')}</p>
                <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.strategic_service_breach')}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className={cn(
                "text-[1.65rem] font-black tracking-tight leading-none",
                hasCritical ? "text-foreground" : "text-muted-foreground/30"
              )}>
                {overdue.length}
              </span>
              {hasCritical && (
                <span className="text-[9px] font-bold text-rose-300 shrink-0 animate-pulse uppercase">
                  ⚠ {t('dashboard.critical_review')}
                </span>
              )}
            </div>
            <p className={cn(
              "text-[9px] uppercase font-semibold tracking-wide truncate",
              hasCritical ? "text-rose-400" : "text-muted-foreground/40"
            )}>
              {hasCritical ? `${overdue.length} ${t('dashboard.alerts_label')} — ${t('dashboard.strict_breach')}` : t('dashboard.system_optimal')}
            </p>
          </div>
        </PremiumCard>

        {/* Completed This Month */}
        <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-emerald-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] transition-shadow duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/6 to-transparent pointer-events-none" />
          <div className="p-4 flex flex-col gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 size={13} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-emerald-400 uppercase leading-tight truncate">{t('dashboard.mission_ready')}</p>
                <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.restored_assets_30d')}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
                {completedThisMonth}
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold shrink-0 uppercase flex items-center gap-1">
                <ShieldCheck size={9} /> {t('dashboard.restoration_verified')}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase opacity-40 font-semibold truncate">30 วันล่าสุด</p>
          </div>
        </PremiumCard>

        {/* Cost This Month */}
        <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-rose-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_25px_rgba(244,63,94,0.1)] transition-shadow duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/6 to-transparent pointer-events-none" />
          <div className="p-4 flex flex-col gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Activity size={13} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-rose-400 uppercase leading-tight truncate">{t('dashboard.fleet_burn_rate')}</p>
                <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.total_restoration_expenditure')}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
                {formatCompact(safeCost)}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase opacity-40 font-semibold truncate">{t('maintenance.allocated_budget_nominal')}</p>
          </div>
        </PremiumCard>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Due Soon Timeline */}
        <PremiumCard className="bg-muted/30 border border-border/10 p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-border/5 bg-black/20 flex items-center gap-3">
            <div className="p-1.5 bg-amber-600 rounded-lg text-white shrink-0"><Clock size={13} /></div>
            <div>
              <h3 className="text-sm font-black text-foreground">{t('dashboard.asset_compliance_feed')}</h3>
              <p className="text-[9px] text-amber-400 uppercase font-semibold tracking-wide">{t('dashboard.temporal_maintenance_scheduler')}</p>
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {[...overdue, ...dueSoon.slice(0, 5)].length === 0 ? (
              <div className="p-10 text-center">
                <ShieldCheck size={36} strokeWidth={1} className="mx-auto mb-3 text-emerald-500/40" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('maintenance.all_assets_ready')}</p>
              </div>
            ) : (
              [...overdue, ...dueSoon.slice(0, 5)].map((item, i) => (
                <div
                  key={`${item.vehicle_plate}-${item.service_type}-${i}`}
                  className="px-5 py-3 flex items-center justify-between group hover:bg-muted/30 transition-colors border-l-2 border-transparent hover:border-amber-500/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 border",
                      item.status === 'overdue'
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-background border-border/20 text-foreground'
                    )}>
                      {item.days_until <= 0 ? '!' : item.days_until}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground uppercase truncate">{item.vehicle_plate}</p>
                      <p className="text-[9px] text-amber-400 font-semibold uppercase truncate">{item.service_type}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={cn(
                      "text-[10px] font-black uppercase",
                      item.status === 'overdue' ? 'text-rose-400' : 'text-amber-400'
                    )}>
                      {item.status === 'overdue' ? t('dashboard.strict_breach') : `${item.days_until}d`}
                    </p>
                    <p className="text-[9px] text-muted-foreground opacity-50">
                      {new Date(item.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </PremiumCard>

        {/* Fleet Health */}
        <PremiumCard className="bg-muted/30 border border-border/10 p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-border/5 bg-black/20 flex items-center gap-3">
            <div className="p-1.5 bg-rose-600 rounded-lg text-white shrink-0"><Truck size={13} /></div>
            <div>
              <h3 className="text-sm font-black text-foreground">{t('dashboard.asset_health_matrix')}</h3>
              <p className="text-[9px] text-rose-400 uppercase font-semibold tracking-wide">{t('dashboard.operational_integrity_breakdown')}</p>
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {vehicleHealthSummary.length === 0 ? (
              <div className="p-10 text-center">
                <Activity size={36} strokeWidth={1} className="mx-auto mb-3 text-emerald-500/40" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('maintenance.fleet_integrity_nominal')}</p>
              </div>
            ) : (
              vehicleHealthSummary.slice(0, 6).map((v) => (
                <div
                  key={v.vehicle_plate}
                  className="px-5 py-3 flex items-center justify-between group hover:bg-muted/30 transition-colors border-l-2 border-transparent hover:border-rose-500/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-background border border-border/20 flex items-center justify-center text-[10px] font-black text-foreground shrink-0 uppercase">
                      {(v.vehicle_plate || '').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground uppercase truncate">{v.vehicle_plate}</p>
                      <span className="inline-flex text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20 uppercase">
                        {v.openTickets} {t('dashboard.active_tickets')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-black text-foreground tabular-nums">{formatCompact(v.totalCost)}</p>
                    <p className="text-[9px] text-muted-foreground opacity-50 uppercase">{t('maintenance.cumulative_cost')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </PremiumCard>

      </div>
    </div>
  )
}
