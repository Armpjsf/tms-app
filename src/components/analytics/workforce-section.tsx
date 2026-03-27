"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { WorkforceAnalytics } from "@/lib/supabase/workforce-analytics"
import { Users, UserCheck, AlertOctagon, Trophy, FileWarning, ShieldCheck, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

export function WorkforceSection({ data }: { data: WorkforceAnalytics }) {
  const { t } = useLanguage()
  const { kpis, topPerformers, driversWithIssues } = data

  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-xl text-blue-500 shadow-lg border border-slate-800">
            <Users size={18} />
          </div>
          <h3 className="text-xl font-black text-foreground tracking-tight uppercase premium-text-gradient">{t('dashboard.workforce_intel')}</h3>
        </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Drivers */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-blue-400 text-base font-bold font-black uppercase italic">{t('dashboard.active_duty_roster')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase italic">{t('dashboard.workforce_matrix')}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shadow-lg shadow-blue-500/10">
                <Users size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10 italic">{kpis.totalBox} {t('dashboard.personnel_label')}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10 opacity-50">
                <p className="text-base font-bold text-muted-foreground font-black uppercase italic">{t('dashboard.optimal_utilization_label')}</p>
            </div>
        </PremiumCard>

        {/* Active Today */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-emerald-400 text-base font-bold font-black uppercase italic">{t('dashboard.driver_active')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase italic">{t('dashboard.labor_optimization_index')}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-lg shadow-emerald-500/10">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10 italic">{kpis.activeToday} {t('dashboard.active_label')}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-base font-bold text-emerald-400 font-black uppercase italic">{t('workforce.deployed_to_field')}</p>
            </div>
        </PremiumCard>

        {/* Expiring Soon */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-amber-400 text-base font-bold font-black uppercase italic">{t('dashboard.fatigue_risk_threshold')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase italic">{t('dashboard.operator_health_index')}</p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 shadow-lg shadow-amber-500/10">
                <FileWarning size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10 italic">{kpis.licenseExpiring} {t('dashboard.at_risk_label')}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className="text-base font-bold text-amber-400 font-black uppercase italic flex items-center gap-2">
                    <Activity size={10} /> {t('workforce.compliance_window')}
                </p>
            </div>
        </PremiumCard>

        {/* Expired */}
        <PremiumCard className={cn(
            "border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]",
            kpis.licenseExpired > 0 ? "bg-rose-600" : "bg-background"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className={cn("text-base font-bold font-black uppercase italic", kpis.licenseExpired > 0 ? "text-rose-100" : "text-muted-foreground")}>
                    {t('dashboard.critical_breach')}
                </span>
                <p className={cn("text-base font-bold font-bold uppercase italic", kpis.licenseExpired > 0 ? "text-rose-200" : "text-muted-foreground")}>
                    {t('dashboard.operational_suspension_log')}
                </p>
              </div>
              <div className={cn("p-2 rounded-xl shadow-lg", kpis.licenseExpired > 0 ? "bg-white/20 text-foreground" : "bg-card text-muted-foreground")}>
                <AlertOctagon size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10 italic">{kpis.licenseExpired} {t('dashboard.halted_label')}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className={cn(kpis.licenseExpired > 0 ? "text-foreground" : "text-muted-foreground")}>
                    {t('dashboard.lockout_active_label')}
                </p>
            </div>
        </PremiumCard>
      </div>

      {/* Workforce Insight Elite Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performers Elite */}
        <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-border/5 bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-amber-600 rounded-xl text-white shadow-lg">
                  <Trophy size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground italic uppercase">{t('dashboard.operator_elite')}</h3>
                  <p className="text-amber-400 text-base font-bold font-bold uppercase italic">{t('dashboard.high_yield_performance_metrics')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-white/5">
                {topPerformers.map((d, i) => (
                    <div key={i} className="p-8 flex items-center justify-between group/perf hover:bg-muted/50 transition-all border-l-4 border-transparent hover:border-amber-500">
                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center text-[12px] font-black shadow-xl italic transition-transform duration-500",
                                i === 0 ? "bg-amber-100 text-amber-700" : "bg-background text-foreground"
                            )}>
                                #{i + 1}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-black text-xl tracking-tight uppercase italic">{d.name}</span>
                                     <span className="text-base font-bold font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                         {d.successRate.toFixed(0)}% {t('common.sync')}
                                     </span>
                                </div>
                                <div className="text-base font-bold text-muted-foreground font-black mt-2 italic uppercase">
                                    {t('dashboard.missions_completed_prefix')} {d.jobCount}
                                </div>
                            </div>
                        </div>
                         <div className="text-right">
                              <div className="text-foreground tracking-tighter italic">฿{d.revenue.toLocaleString()}</div>
                              <div className="text-base font-bold text-muted-foreground font-black uppercase mt-1 italic">{t('dashboard.gross_yield')}</div>
                         </div>
                    </div>
                ))}
                {topPerformers.length === 0 && (
                    <div className="p-24 text-center">
                        <Users size={48} strokeWidth={1} className="mx-auto mb-4 text-muted-foreground" />
                        <p className="text-base font-bold font-black text-muted-foreground uppercase italic">{t('dashboard.performance_data_recalibrating')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>

        {/* Compliance Alerts Registry */}
        <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-border/5 bg-gradient-to-r from-rose-500/20 via-rose-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-rose-600 rounded-xl text-white shadow-lg">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight italic uppercase">{t('dashboard.compliance_registry')}</h3>
                  <p className="text-rose-400 text-base font-bold font-bold uppercase italic">{t('dashboard.operational_risk_audit')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-white/5">
                {driversWithIssues.map((d) => (
                    <div key={d.id} className="p-8 flex items-center justify-between group/risk hover:bg-muted/50 transition-all border-l-4 border-transparent hover:border-rose-500">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-background text-foreground flex items-center justify-center text-[12px] font-black shadow-xl italic uppercase">
                                {d.name.slice(0, 2)}
                            </div>
                            <div>
                                <div className="text-white font-black text-xl tracking-tight uppercase italic">{d.name}</div>
                                <div className={cn(
                                    "text-base font-bold font-black mt-2 bg-opacity-10 px-3 py-1 rounded-lg w-fit italic border uppercase",
                                    d.issue === 'ใบขับขี่หมดอายุ' ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                )}>
                                    {t('dashboard.breach_label')} {d.issue}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                              <div className={cn(
                                  "text-xl font-black uppercase",
                                  d.issue === 'ใบขับขี่หมดอายุ' ? "text-rose-400" : "text-amber-400"
                              )}>
                                 {d.issue === 'ใบขับขี่หมดอายุ' ? `${t('common.expired')} ${d.daysAuth}D` : `${t('common.expiry')}: ${d.daysAuth}D`}
                              </div>
                             <div className="text-base font-bold text-muted-foreground font-black uppercase mt-1 italic">{t('dashboard.immediate_rectification_reqd')}</div>
                        </div>
                    </div>
                ))}
                {driversWithIssues.length === 0 && (
                     <div className="p-24 text-center">
                        <ShieldCheck size={48} strokeWidth={1} className="mx-auto mb-4 text-emerald-100" />
                        <p className="text-base font-bold font-black text-muted-foreground uppercase italic">{t('dashboard.compliance_perimeter_secure')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>
      </div>
    </div>
  )
}

