"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { WorkforceAnalytics } from "@/lib/supabase/workforce-analytics"
import { Users, UserCheck, AlertOctagon, Trophy, FileWarning, ShieldCheck, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

export function WorkforceSection({ data }: { data: WorkforceAnalytics }) {
  const { t } = useLanguage()
  const { kpis, topPerformers, driversWithIssues } = data

  const hasExpired = kpis.licenseExpired > 0

  return (
    <div className="space-y-6">

      {/* ── Section Title ── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-background rounded-xl text-blue-500 shadow-lg border border-slate-800">
          <Users size={16} />
        </div>
        <h3 className="text-lg font-black text-foreground uppercase tracking-tight premium-text-gradient">
          {t('dashboard.workforce_intel')}
        </h3>
      </div>

      {/* ── 4-Card KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

        {/* Total Drivers */}
        <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-blue-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_25px_rgba(59,130,246,0.1)] transition-shadow duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/6 to-transparent pointer-events-none" />
          <div className="p-4 flex flex-col gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Users size={13} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-blue-400 uppercase leading-tight truncate">{t('dashboard.active_duty_roster')}</p>
                <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.workforce_matrix')}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
                {kpis.totalBox}
              </span>
              <span className="text-[9px] text-blue-400 font-semibold shrink-0 uppercase">{t('dashboard.personnel_label')}</span>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase opacity-40 font-semibold truncate">{t('dashboard.optimal_utilization_label')}</p>
          </div>
        </PremiumCard>

        {/* Active Today */}
        <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-emerald-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] transition-shadow duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/6 to-transparent pointer-events-none" />
          <div className="p-4 flex flex-col gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <UserCheck size={13} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-emerald-400 uppercase leading-tight truncate">{t('dashboard.driver_active')}</p>
                <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.labor_optimization_index')}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
                {kpis.activeToday}
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold shrink-0 uppercase flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {t('dashboard.active_label')}
              </span>
            </div>
            <p className="text-[9px] text-emerald-400 opacity-60 font-semibold uppercase truncate">{t('workforce.deployed_to_field')}</p>
          </div>
        </PremiumCard>

        {/* License Expiring */}
        <PremiumCard className="relative overflow-hidden p-0 border border-border/10 border-l-[3px] border-l-amber-500 bg-background/60 backdrop-blur-sm group hover:shadow-[0_0_25px_rgba(245,158,11,0.1)] transition-shadow duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/6 to-transparent pointer-events-none" />
          <div className="p-4 flex flex-col gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/20 text-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
                <FileWarning size={13} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-amber-400 uppercase leading-tight truncate">{t('dashboard.fatigue_risk_threshold')}</p>
                <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.operator_health_index')}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
                {kpis.licenseExpiring}
              </span>
              <span className="text-[9px] text-amber-400 font-semibold shrink-0 uppercase">{t('dashboard.at_risk_label')}</span>
            </div>
            <p className="text-[9px] text-amber-400 opacity-60 font-semibold uppercase truncate flex items-center gap-1">
              <Activity size={8} /> {t('workforce.compliance_window')}
            </p>
          </div>
        </PremiumCard>

        {/* License Expired (Critical) */}
        <PremiumCard className={cn(
          "relative overflow-hidden p-0 border border-l-[3px] transition-all duration-500 group",
          hasExpired
            ? "bg-rose-950/80 border-border/10 border-l-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)]"
            : "bg-background/60 border-border/10 border-l-slate-600 backdrop-blur-sm"
        )}>
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none",
            hasExpired ? 'from-rose-500/10' : 'from-muted/5'
          )} />
          <div className="p-4 flex flex-col gap-2.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className={cn(
                "p-1.5 rounded-lg border shrink-0 group-hover:scale-110 transition-transform duration-300",
                hasExpired
                  ? "bg-rose-500/20 border-rose-500/30 text-rose-300"
                  : "bg-muted/20 border-border/20 text-muted-foreground"
              )}>
                <AlertOctagon size={13} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-[11px] font-black uppercase leading-tight truncate",
                  hasExpired ? "text-rose-300" : "text-muted-foreground"
                )}>{t('dashboard.critical_breach')}</p>
                <p className="text-[9px] text-muted-foreground leading-tight opacity-50 truncate">{t('dashboard.operational_suspension_log')}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-[1.65rem] font-black text-foreground tracking-tight leading-none">
                {kpis.licenseExpired}
              </span>
              {hasExpired && (
                <span className="text-[9px] font-bold text-rose-300 shrink-0 uppercase animate-pulse">
                  {t('dashboard.halted_label')}
                </span>
              )}
            </div>
            <p className={cn(
              "text-[9px] uppercase font-semibold truncate",
              hasExpired ? "text-rose-400" : "text-muted-foreground/40"
            )}>
              {hasExpired ? t('dashboard.lockout_active_label') : '✓ ' + t('dashboard.compliance_perimeter_secure')}
            </p>
          </div>
        </PremiumCard>
      </div>

      {/* ── Lists Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Performers */}
        <PremiumCard className="bg-muted/30 border border-border/10 p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-border/5 bg-black/20 flex items-center gap-3">
            <div className="p-1.5 bg-amber-600 rounded-lg text-white shrink-0"><Trophy size={13} /></div>
            <div>
              <h3 className="text-sm font-black text-foreground">{t('dashboard.operator_elite')}</h3>
              <p className="text-[9px] text-amber-400 uppercase font-semibold tracking-wide">{t('dashboard.high_yield_performance_metrics')}</p>
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {topPerformers.length === 0 ? (
              <div className="p-10 text-center">
                <Users size={36} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('dashboard.performance_data_recalibrating')}</p>
              </div>
            ) : (
              topPerformers.map((d, i) => (
                <div
                  key={i}
                  className="px-5 py-3 flex items-center justify-between group hover:bg-muted/30 transition-colors border-l-2 border-transparent hover:border-amber-500/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 border",
                      i === 0
                        ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                        : "bg-background border-border/20 text-muted-foreground"
                    )}>
                      #{i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground uppercase truncate">{d.name}</p>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        {d.successRate.toFixed(0)}% {t('common.sync')} · {d.jobCount} {t('dashboard.missions_completed_prefix')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-black text-foreground tabular-nums">฿{Math.round(d.revenue / 1000)}K</p>
                    <p className="text-[9px] text-muted-foreground opacity-50 uppercase">{t('dashboard.gross_yield')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </PremiumCard>

        {/* Compliance Alerts */}
        <PremiumCard className="bg-muted/30 border border-border/10 p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-border/5 bg-black/20 flex items-center gap-3">
            <div className="p-1.5 bg-rose-600 rounded-lg text-white shrink-0"><ShieldCheck size={13} /></div>
            <div>
              <h3 className="text-sm font-black text-foreground">{t('dashboard.compliance_registry')}</h3>
              <p className="text-[9px] text-rose-400 uppercase font-semibold tracking-wide">{t('dashboard.operational_risk_audit')}</p>
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {driversWithIssues.length === 0 ? (
              <div className="p-10 text-center">
                <ShieldCheck size={36} strokeWidth={1} className="mx-auto mb-3 text-emerald-500/40" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('dashboard.compliance_perimeter_secure')}</p>
              </div>
            ) : (
              driversWithIssues.map((d) => {
                const isExpired = d.issue === 'ใบขับขี่หมดอายุ'
                return (
                  <div
                    key={d.id}
                    className="px-5 py-3 flex items-center justify-between group hover:bg-muted/30 transition-colors border-l-2 border-transparent hover:border-rose-500/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-background border border-border/20 flex items-center justify-center text-[10px] font-black text-foreground shrink-0 uppercase">
                        {d.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground uppercase truncate">{d.name}</p>
                        <span className={cn(
                          "inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase",
                          isExpired
                            ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                            : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        )}>
                          {t('dashboard.breach_label')} {d.issue}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={cn(
                        "text-sm font-black uppercase tabular-nums",
                        isExpired ? "text-rose-400" : "text-amber-400"
                      )}>
                        {isExpired ? `${t('common.expired')} ${d.daysAuth}D` : `${t('common.expiry')}: ${d.daysAuth}D`}
                      </p>
                      <p className="text-[9px] text-muted-foreground opacity-50 uppercase">{t('dashboard.immediate_rectification_reqd')}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </PremiumCard>

      </div>
    </div>
  )
}
