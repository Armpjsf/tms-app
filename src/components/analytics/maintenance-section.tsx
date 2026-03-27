"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { MaintenanceScheduleData } from "@/lib/supabase/maintenance-schedule"
import { Wrench, AlertTriangle, CheckCircle2, Truck, Activity, Clock, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

export function MaintenanceSection({ data }: { data: MaintenanceScheduleData }) {
  const { t } = useLanguage()
  const { overdue, dueSoon, activeRepairs, completedThisMonth, totalCostThisMonth, vehicleHealthSummary } = data

  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-xl text-amber-500 shadow-lg border border-slate-800">
            <Wrench size={18} />
          </div>
          <h3 className="text-xl font-black text-foreground tracking-tight uppercase premium-text-gradient">{t('common.maintenance_protocol')}</h3>
        </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Repairs */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-blue-400 text-base font-bold font-black uppercase italic">{t('dashboard.active_hangar')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase italic">{t('dashboard.live_repair_log')}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shadow-lg shadow-blue-500/10">
                <Wrench size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10">{activeRepairs} {t('dashboard.assets_label')}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-base font-bold text-blue-400 font-black uppercase italic">{t('dashboard.mission_inactive')}</p>
            </div>
        </PremiumCard>

        {/* Critical Maintenance */}
        <PremiumCard className={cn(
             "border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem] transition-all duration-500",
             overdue.length > 0 ? "bg-red-600 text-foreground" : "bg-background"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className={cn("text-base font-bold font-black uppercase italic", overdue.length > 0 ? "text-red-100" : "text-muted-foreground")}>
                    {t('dashboard.overdue_exposure')}
                </span>
                <p className={cn("text-base font-bold font-bold uppercase italic", overdue.length > 0 ? "text-red-200" : "text-muted-foreground")}>
                    {t('dashboard.strategic_service_breach')}
                </p>
              </div>
              <div className={cn("p-2 rounded-xl shadow-lg", overdue.length > 0 ? "bg-muted/80 text-foreground" : "bg-red-500/10 text-red-500")}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className={cn("text-3xl font-black tracking-tighter relative z-10 italic", overdue.length > 0 ? "text-foreground" : "text-white/20")}>
                {overdue.length} {t('dashboard.alerts_label')}
            </div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className={cn(overdue.length > 0 ? "text-foreground animate-pulse" : "text-muted-foreground")}>
                    {overdue.length > 0 ? t('dashboard.critical_review') : t('dashboard.system_optimal')}
                </p>
            </div>
        </PremiumCard>

        {/* Resolved This Month */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-emerald-400 text-base font-bold font-black uppercase italic">{t('dashboard.mission_ready')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase italic">{t('dashboard.restored_assets_30d')}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10 italic">{completedThisMonth}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className="text-base font-bold text-emerald-400 font-black uppercase italic flex items-center gap-2">
                    <ShieldCheck size={10} strokeWidth={3} /> {t('dashboard.restoration_verified')}
                </p>
            </div>
        </PremiumCard>

        {/* Maintenance Expenditure */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-rose-400 text-base font-bold font-black uppercase italic">{t('dashboard.fleet_burn_rate')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase italic">{t('dashboard.total_restoration_expenditure')}</p>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 shadow-lg shadow-rose-500/10">
                <Activity size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10">฿{totalCostThisMonth.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10 opacity-50">
                 <p className="text-base font-bold text-muted-foreground font-black uppercase italic">{t('maintenance.allocated_budget_nominal')}</p>
            </div>
        </PremiumCard>
      </div>

      {/* Maintenance Intelligence Elite Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compliance Alerts Registry */}
        <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-border/5 bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-amber-600 rounded-xl text-white shadow-lg shadow-amber-500/20">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight italic">{t('dashboard.asset_compliance_feed')}</h3>
                  <p className="text-amber-400 text-base font-bold font-bold uppercase">{t('dashboard.temporal_maintenance_scheduler')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-white/5">
                {[...overdue, ...dueSoon.slice(0, 5)].map((item, i) => (
                    <div key={`${item.vehicle_plate}-${item.service_type}-${i}`} className="p-8 flex items-center justify-between group/alert hover:bg-muted/50 transition-all border-l-4 border-transparent hover:border-amber-500">
                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "w-14 h-14 rounded-2xl border flex items-center justify-center text-[12px] font-black shadow-xl italic group-hover/alert:scale-110 transition-transform duration-500 uppercase",
                                item.status === 'overdue' ? 'bg-red-600 border-red-500 text-foreground' : 'bg-background border-slate-800 text-foreground'
                            )}>
                                {item.days_until <= 0 ? 'CRIT' : item.days_until}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-black text-xl tracking-tight uppercase italic">{item.vehicle_plate}</span>
                                    <span className="text-base font-bold font-black text-muted-foreground border border-border/10 px-2 py-0.5 rounded-full">{item.vehicle_type}</span>
                                </div>
                                <div className="text-base font-bold text-amber-400 font-black mt-2 bg-amber-500/10 px-3 py-1 rounded-lg w-fit italic border border-amber-500/20 uppercase">
                                   {t('dashboard.service_prefix')} {item.service_type}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className={cn(
                                "text-base font-bold font-black uppercase mb-1",
                                item.status === 'overdue' ? 'text-red-400' : 'text-amber-400'
                             )}>
                                 {item.status === 'overdue' ? t('dashboard.strict_breach') : `${item.days_until} ${t('common.days')} ${t('common.remaining')}`}
                             </div>
                             <div className="text-base font-bold text-muted-foreground font-black bg-muted/50 px-2 py-0.5 rounded-full border border-border/10 uppercase italic">
                                {new Date(item.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                             </div>
                        </div>
                    </div>
                ))}
                {overdue.length === 0 && dueSoon.length === 0 && (
                     <div className="p-24 text-center">
                        <ShieldCheck size={48} strokeWidth={1} className="mx-auto mb-4 text-emerald-100" />
                        <p className="text-base font-bold font-black text-muted-foreground uppercase italic">{t('maintenance.all_assets_ready')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>

        {/* Fleet Health Breakdown Registry */}
        <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-slate-50 bg-gradient-to-r from-rose-500/20 via-rose-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-rose-600 rounded-xl text-white shadow-lg">
                  <Truck size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight italic">{t('dashboard.asset_health_matrix')}</h3>
                  <p className="text-rose-400 text-base font-bold font-bold uppercase">{t('dashboard.operational_integrity_breakdown')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-white/5">
                {vehicleHealthSummary.slice(0, 6).map((v) => (
                    <div key={v.vehicle_plate} className="p-8 flex items-center justify-between group/v hover:bg-muted/50 transition-all border-l-4 border-transparent hover:border-rose-500">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-background border border-slate-800 flex items-center justify-center text-[12px] font-black text-foreground shadow-xl italic group-hover/v:scale-110 transition-transform duration-500 uppercase">
                                {v.vehicle_plate.slice(0, 2)}
                            </div>
                            <div>
                                <div className="text-foreground tracking-tighter group-hover/v:text-rose-400 transition-colors uppercase italic">{v.vehicle_plate}</div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-base font-bold text-rose-400 font-black uppercase italic bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                       {v.openTickets} {t('dashboard.active_tickets')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-black text-foreground tracking-tighter italic">฿{v.totalCost.toLocaleString()}</div>
                             <div className="text-base font-bold text-muted-foreground font-black mt-1 uppercase italic bg-muted/50 px-2 py-0.5 rounded-full border border-border/10 w-fit ml-auto">
                                {t('maintenance.cumulative_cost')}
                             </div>
                        </div>
                    </div>
                ))}
                {vehicleHealthSummary.length === 0 && (
                    <div className="p-24 text-center">
                        <Activity size={48} strokeWidth={1} className="mx-auto mb-4 text-emerald-100" />
                        <p className="text-base font-bold font-black text-muted-foreground uppercase italic">{t('maintenance.fleet_integrity_nominal')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>
      </div>
    </div>
  )
}

