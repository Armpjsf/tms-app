"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Switch } from "@/components/ui/switch"
import { Bell, ArrowLeft, Save, ShieldAlert, Zap, Activity, MessageSquare, Mail, Loader2, Target } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSetting, saveSetting } from "@/lib/supabase/system_settings"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface NotificationSettings {
  push_enabled: boolean
  email_enabled: boolean
  sos_alert_enabled: boolean
  daily_report_email: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  push_enabled: true,
  email_enabled: true,
  sos_alert_enabled: true,
  daily_report_email: false,
}

export default function NotificationSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadSettings = useCallback(async () => {
    const data = await getSetting('notification_settings', DEFAULT_SETTINGS)
    setSettings(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    setSaving(true)
    await saveSetting('notification_settings', settings, 'Admin Notification Preferences')
    setSaving(false)
    toast.success("Alert protocols synchronized")
  }

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-[10px] group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    Command Control
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                        <Bell size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">
                            Alert Engine
                        </h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">Signal Routing & Operational Cue Preferences</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">MONITOR_STATUS: ACTIVE</span>
                </div>
                <div className="flex items-center gap-4 bg-primary/10 p-4 rounded-2xl border border-primary/20">
                   <Target className="text-primary" size={18} />
                   <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Precision Signal Targeting</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
             <div className="lg:col-span-12">
                  <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/alert">
                      <div className="p-20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] pointer-events-none" />
                          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                          
                          <div className="max-w-3xl mx-auto space-y-12 relative z-10">
                              <div className="space-y-4 mb-20">
                                   <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-xl group-hover/alert:rotate-6 transition-transform">
                                             <Zap size={24} strokeWidth={2.5} />
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-widest uppercase italic border-b-2 border-primary/20 pb-2">Protocol Routing Control</h2>
                                   </div>
                                   <p className="text-sm font-bold text-slate-500 uppercase tracking-widest italic ml-16">Configure how the mission-critical signal stream is distributed across your hardware array.</p>
                              </div>

                              <div className="space-y-6">
                                  {[
                                    { 
                                        id: 'push_enabled', 
                                        label: 'Push Intercepts', 
                                        desc: 'Real-time high-parity signals for browser and mobile nodes.', 
                                        icon: MessageSquare, 
                                        color: 'text-primary' 
                                    },
                                    { 
                                        id: 'email_enabled', 
                                        label: 'Email Transmission', 
                                        desc: 'Asynchronous operational updates via standard SMTP gateway.', 
                                        icon: Mail, 
                                        color: 'text-indigo-400' 
                                    },
                                    { 
                                        id: 'sos_alert_enabled', 
                                        label: 'SOS Priority Hub', 
                                        desc: 'CRITICAL: Immediate visual/audio override on field distress signals.', 
                                        icon: ShieldAlert, 
                                        color: 'text-rose-500',
                                        isCritical: true
                                    },
                                    { 
                                        id: 'daily_report_email', 
                                        label: 'Temporal Summary', 
                                        desc: 'Automated 08:00 UTC mission summary emission.', 
                                        icon: Activity, 
                                        color: 'text-emerald-400' 
                                    },
                                  ].map((pref, i) => (
                                    <div key={pref.id} className={cn(
                                        "flex items-center justify-between p-8 rounded-[2.5rem] border-2 transition-all duration-500 group/pref relative overflow-hidden",
                                        settings[pref.id as keyof NotificationSettings] 
                                        ? "bg-white/[0.03] border-white/10 shadow-inner" 
                                        : "bg-transparent border-white/5 opacity-40 grayscale"
                                    )}>
                                        <div className="flex items-center gap-8 relative z-10">
                                            <div className={cn(
                                                "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 shadow-2xl border border-white/10 shrink-0",
                                                settings[pref.id as keyof NotificationSettings] ? "bg-black/40 scale-110 rotate-3" : "bg-white/5"
                                            )}>
                                                <pref.icon size={28} className={pref.color} />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className={cn(
                                                    "text-xl font-black uppercase tracking-widest italic transition-colors",
                                                    settings[pref.id as keyof NotificationSettings] ? "text-white" : "text-slate-600"
                                                )}>
                                                    {pref.label}
                                                    {pref.isCritical && <span className="ml-4 text-[9px] font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">PRIORITY_ALPHA</span>}
                                                </h3>
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed italic border-l-2 border-white/5 pl-4">
                                                    {pref.desc}
                                                </p>
                                            </div>
                                        </div>
                                        <Switch 
                                            checked={settings[pref.id as keyof NotificationSettings]}
                                            onCheckedChange={(checked) => setSettings({...settings, [pref.id]: checked})}
                                            className="data-[state=checked]:bg-primary relative z-10 scale-125"
                                        />
                                        {settings[pref.id as keyof NotificationSettings] && (
                                            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none" />
                                        )}
                                    </div>
                                  ))}
                              </div>

                              <div className="pt-20">
                                <PremiumButton 
                                    onClick={handleSave} 
                                    disabled={loading || saving} 
                                    className="w-full h-20 rounded-[2rem] bg-primary text-white font-black italic tracking-[0.3em] shadow-[0_30px_60px_rgba(255,30,133,0.3)] border-0 text-lg gap-6 group/save"
                                >
                                  {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} className="group-hover/save:scale-125 transition-transform" />}
                                  {saving ? "SYNCHRONIZING_PROTOCOLS..." : "COMMIT_CONFIG_TO_MATRIX"}
                                </PremiumButton>
                              </div>
                          </div>
                      </div>
                  </PremiumCard>
             </div>
        </div>

        {/* Global Advisory */}
        <div className="mt-20 p-12 rounded-[3.5rem] bg-primary/5 border-2 border-primary/10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            <div className="p-6 rounded-[2rem] bg-primary/20 text-primary border-2 border-primary/30 shadow-2xl">
                <ShieldAlert size={32} />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
                <p className="text-xl font-black text-primary italic uppercase tracking-widest">SIGNAL_INTEGRITY_ADVISORY</p>
                <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-wider italic">
                    Emergency override protocols (SOS) are routed via high-priority priority-alpha nodes. Disabling these may lead to tactical blindspots in field coverage. <br />
                    All alert emission logs are archived for 90 orbital cycles for administrative audit.
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-white/10 text-white gap-3 uppercase font-black text-[10px] tracking-[0.3em] ml-auto italic">
                <Activity size={18} /> VIEW_EVENT_STREAM
            </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  )
}
