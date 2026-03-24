"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, ArrowLeft, Key, Lock, Smartphone, Activity, Zap, ShieldCheck, Target, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

export default function SecuritySettingsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleUpdatePassword = async () => {
    if (!password) {
        toast.warning(t('settings_pages.roles.toasts.error')) // Reuse generic error or fallback
        return
    }
    if (password !== confirmPassword) {
      toast.warning("Handshake failure: Passwords do not match")
      return
    }
    if (password.length < 6) {
      toast.warning("Protocol violation: Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: password })

        if (error) {
            toast.error("Handshake interrupted: " + error.message)
        } else {
            toast.success("Security protocols recalculated successfully")
            setPassword("")
            setConfirmPassword("")
        }
    } catch (e) {
        toast.error("Critical Failure: " + (e as Error).message)
    } finally {
        setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10 max-w-6xl mx-auto">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-black uppercase tracking-[0.1em] text-[11px] group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    {t('common.back')}
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                        <Shield size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">
                            {t('settings.items.security')}
                        </h1>
                        <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-2 opacity-80 italic">{t('settings.items.security_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">DEFENSE_ARRAY: ACTIVE</span>
                </div>
                <div className="flex items-center gap-4 bg-primary/10 p-4 rounded-2xl border border-primary/20">
                   <ShieldCheck className="text-primary" size={18} />
                   <span className="text-[11px] font-black text-white uppercase tracking-[0.1em] italic">Encryption: AES-256</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
             {/* Key Rotation Matrix */}
             <div className="lg:col-span-12">
                  <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/security">
                      <div className="p-20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] pointer-events-none" />
                          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                          
                          <div className="max-w-xl mx-auto space-y-12 relative z-10">
                              <div className="flex flex-col items-center text-center space-y-6 mb-16">
                                   <div className="w-24 h-24 rounded-[2rem] bg-primary/20 flex items-center justify-center text-primary border-2 border-primary/30 shadow-[0_0_50px_rgba(255,30,133,0.3)] group-hover/security:rotate-12 transition-transform duration-700">
                                        <Key size={40} strokeWidth={2.5} />
                                   </div>
                                   <div className="space-y-2">
                                        <h2 className="text-4xl font-black text-white tracking-[0.2em] uppercase italic">Key Rotation</h2>
                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Recalculate Access Vector Parameters</p>
                                   </div>
                              </div>

                              <div className="space-y-10">
                                  <div className="space-y-4">
                                      <Label className="text-[11px] font-black uppercase text-primary/60 tracking-[0.1em] ml-6 flex items-center gap-2">
                                          <Lock size={12} /> NEW_ACCESS_KEY
                                      </Label>
                                      <Input 
                                          type="password" 
                                          value={password}
                                          onChange={(e) => setPassword(e.target.value)}
                                          className="h-16 bg-black/60 border-white/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-white font-black italic tracking-widest pl-8 shadow-inner"
                                          placeholder="••••••••••••"
                                      />
                                  </div>
                                  <div className="space-y-4">
                                      <Label className="text-[11px] font-black uppercase text-primary/60 tracking-[0.1em] ml-6 flex items-center gap-2">
                                          <Shield size={12} /> VERIFY_KEY_PARITY
                                      </Label>
                                      <Input 
                                          type="password" 
                                          value={confirmPassword}
                                          onChange={(e) => setConfirmPassword(e.target.value)}
                                          className="h-16 bg-black/60 border-white/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-white font-black italic tracking-widest pl-8 shadow-inner"
                                          placeholder="••••••••••••"
                                      />
                                  </div>
                                  
                                  <div className="pt-10">
                                    <PremiumButton 
                                        onClick={handleUpdatePassword} 
                                        disabled={loading} 
                                        className="w-full h-20 rounded-[2rem] bg-primary text-white font-black italic tracking-[0.2em] shadow-[0_30px_60px_rgba(255,30,133,0.3)] border-0 text-lg gap-6 group/save"
                                    >
                                      {loading ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} className="group-hover/save:scale-125 transition-transform" />}
                                      {loading ? "RECALCULATING_ENTROPY..." : "SYNC_NEW_DEFENSE_LAYER"}
                                    </PremiumButton>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </PremiumCard>
             </div>

             {/* 2FA Matrix */}
             <div className="lg:col-span-12">
                  <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/2fa">
                      <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between">
                          <h3 className="text-xl font-black text-white tracking-widest uppercase italic flex items-center gap-3">
                              <Smartphone size={20} className="text-indigo-400" />
                              Multi-Factor Override
                          </h3>
                          <div className="px-5 py-1.5 rounded-xl bg-indigo-500/10 text-[11px] font-black text-indigo-400 uppercase tracking-[0.1em] border border-indigo-500/20 italic">
                              STATUS: EN-ROUTE
                          </div>
                      </div>
                      <div className="p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                          <div className="space-y-4 text-center md:text-left">
                              <p className="text-xl font-black text-white uppercase tracking-widest italic">Temporal Token Authentication (2FA)</p>
                              <p className="text-[11px] font-black text-slate-500 leading-relaxed uppercase tracking-[0.2em] italic">
                                  Deploy a secondary hardware-backed authentication layer for mission-critical sessions.
                              </p>
                          </div>
                          <PremiumButton variant="outline" disabled className="h-16 px-10 rounded-2xl border-white/10 text-slate-600 gap-3 uppercase font-black text-[11px] tracking-[0.1em] cursor-not-allowed italic">
                              SYSTEM_ARCHIVE_LOCK
                          </PremiumButton>
                      </div>
                  </PremiumCard>
             </div>
        </div>

        {/* Global Advisory */}
        <div className="mt-20 p-12 rounded-[3.5rem] bg-primary/5 border-2 border-primary/10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            <div className="p-6 rounded-[2rem] bg-primary/20 text-primary border-2 border-primary/30 shadow-2xl animate-pulse">
                <Target size={32} />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
                <p className="text-xl font-black text-primary italic uppercase tracking-widest">SECURITY_INTEGRITY_ADVISORY</p>
                <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-wider italic">
                    Key rotation should be performed every 30 orbital cycles to maintain maximum defense parity. <br />
                    All authentication handshakes are monitored via the central telemetry engine.
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-white/10 text-white gap-3 uppercase font-black text-[11px] tracking-[0.1em] ml-auto italic">
                <Activity size={18} /> VIEW_DEFENSE_LOGS
            </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  )
}
