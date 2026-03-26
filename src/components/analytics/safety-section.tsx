"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { SafetyAnalytics } from "@/lib/supabase/safety-analytics"
import { ShieldAlert, FileCheck, AlertOctagon, CheckCircle, ShieldCheck, Activity } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

export function SafetySection({ data }: { data: SafetyAnalytics }) {
  const { t } = useLanguage()
  const { sos, pod } = data

  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-xl text-rose-500 shadow-lg border border-slate-800">
            <ShieldAlert size={18} />
          </div>
          <h3 className="text-xl font-black text-foreground tracking-tight uppercase premium-text-gradient">{t('dashboard.safety_intel_registry')}</h3>
        </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total SOS */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-rose-400 text-base font-bold font-black uppercase tracking-[0.2em] italic">{t('dashboard.distress_events')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase tracking-widest italic">{t('dashboard.sos_trigger_log')}</p>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 shadow-lg shadow-rose-500/10">
                <AlertOctagon size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10">{sos.total}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <p className="text-base font-bold text-rose-400 font-black uppercase tracking-widest italic">{sos.active} {t('dashboard.active_interventions_label')}</p>
            </div>
        </PremiumCard>

        {/* POD Compliance */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-emerald-400 text-base font-bold font-black uppercase tracking-[0.2em] italic">{t('dashboard.pod_integrity')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase tracking-widest italic">{t('dashboard.strategic_compliance_index')}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-lg shadow-emerald-500/10">
                <FileCheck size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10">{pod.complianceRate.toFixed(1)}%</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <div className="w-full bg-card rounded-full h-1 overflow-hidden border border-border/5">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pod.complianceRate}%` }} />
                </div>
            </div>
        </PremiumCard>

        {/* Jobs Finished */}
        <PremiumCard className="bg-background border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-blue-400 text-base font-bold font-black uppercase tracking-[0.2em] italic">{t('dashboard.mission_resolution')}</span>
                <p className="text-base font-bold text-muted-foreground font-bold uppercase tracking-widest italic">{t('dashboard.operational_closure_registry')}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 shadow-lg shadow-blue-500/10">
                <CheckCircle size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10 italic">{pod.totalCompleted}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10 opacity-50">
                <p className="text-base font-bold text-muted-foreground font-black uppercase tracking-widest italic">{t('dashboard.success_index')}</p>
            </div>
        </PremiumCard>

        {/* Global Security Status */}
        <PremiumCard className="bg-emerald-600 border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-emerald-100 text-base font-bold font-black uppercase tracking-[0.2em] italic">{t('dashboard.security_status_label')}</span>
                <p className="text-base font-bold text-emerald-200 font-bold uppercase tracking-widest italic">{t('dashboard.environmental_safety_thresh')}</p>
              </div>
              <div className="p-2 bg-muted/80 rounded-xl text-foreground shadow-lg">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground tracking-tighter relative z-10 italic">{t('dashboard.nominal')}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <p className="text-foreground font-black uppercase tracking-widest italic flex items-center gap-2">
                    <Activity size={10} strokeWidth={3} /> {t('dashboard.biometric_sync_active')}
                </p>
            </div>
        </PremiumCard>
      </div>

      {/* Safety Intelligence Elite Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SOS Breakdown Elite */}
        <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-border/5 bg-background relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-rose-600 rounded-xl text-white shadow-lg shadow-rose-500/20">
                  <AlertOctagon size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight italic">{t('dashboard.incident_taxonomy')}</h3>
                  <p className="text-rose-400 text-base font-bold font-bold uppercase tracking-[0.2em]">{t('dashboard.distress_category_distribution')}</p>
                </div>
              </div>
           </div>
           <div className="p-10 space-y-8">
              {sos.byReason.slice(0, 6).map((item, i) => (
                <div key={i} className="space-y-3 group/item">
                  <div className="flex justify-between items-end">
                     <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">{item.reason}</span>
                     <span className="text-lg font-black text-foreground tracking-tighter italic shadow-sm bg-muted/50 px-3 py-1 rounded-lg group-hover/item:text-rose-400 transition-colors">{item.count} {t('dashboard.events_label')}</span>
                  </div>
                  <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/10 p-0.5">
                     <div 
                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${(item.count / Math.max(sos.total, 1)) * 100}%` }}
                     />
                  </div>
                </div>
              ))}
              {sos.byReason.length === 0 && (
                <div className="p-20 text-center">
                    <ShieldCheck size={48} strokeWidth={1} className="mx-auto mb-4 text-emerald-100" />
                    <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">{t('dashboard.no_incident_data')}</p>
                </div>
              )}
           </div>
        </PremiumCard>

        {/* Recent Incidents Activity Log */}
        <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-border/5 bg-background relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight italic">{t('dashboard.real_time_alert_log')}</h3>
                  <p className="text-blue-400 text-base font-bold font-bold uppercase tracking-[0.2em]">{t('dashboard.live_security_feed')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-white/5">
                {sos.recentAlerts.map((alert) => (
                    <div key={alert.id} className="p-8 flex items-center justify-between group/alert hover:bg-muted/50 transition-all border-l-4 border-transparent hover:border-blue-500">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-background border border-slate-800 flex items-center justify-center text-[12px] font-black text-foreground shadow-xl italic group-hover/alert:scale-110 transition-transform duration-500 uppercase">
                                {alert.vehicle.slice(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-black text-xl tracking-tight uppercase italic">{alert.driver}</span>
                                    <span className="text-base font-bold font-black text-muted-foreground border border-border/10 px-2 py-0.5 rounded-full tracking-widest">{alert.vehicle}</span>
                                </div>
                                <div className="text-base font-bold text-rose-400 font-black mt-2 bg-rose-500/10 px-3 py-1 rounded-lg w-fit tracking-widest italic border border-rose-500/20 uppercase">
                                   {t('dashboard.entry_label')} {alert.reason}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-foreground font-black tracking-widest uppercase">
                                {new Date(alert.time).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </div>
                            <div className="text-base font-bold text-blue-400 font-black mt-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase italic">
                                {new Date(alert.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {sos.recentAlerts.length === 0 && (
                     <div className="p-24 text-center">
                        <CheckCircle size={48} strokeWidth={1} className="mx-auto mb-4 text-emerald-100" />
                        <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('safety.perimeter_secure')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>
      </div>
    </div>
  )
}

