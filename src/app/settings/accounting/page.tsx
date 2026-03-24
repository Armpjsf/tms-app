"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    CloudSync, RefreshCcw, CheckCircle2, XCircle, ArrowLeft, 
    Save, Loader2, Key, Building2, Activity, Zap, ShieldCheck,
    Target, Link as LinkIcon, Cpu
} from "lucide-react"
import { checkAccountingConnection, saveAccountingSettings } from "@/app/settings/accounting/actions"
import { getSetting } from "@/lib/supabase/system_settings"
import { hasPermission } from "@/lib/permissions"
import { cn } from "@/lib/utils"

export default function AccountingSettingsPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'connected' | 'failed'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const [apiKey, setApiKey] = useState("")
  const [companyId, setCompanyId] = useState("1")
  const [userEmail, setUserEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)

  const loadSettings = useCallback(async () => {
    // Check permissions
    const [viewAllowed, manageAllowed] = await Promise.all([
      hasPermission('billing_view'),
      hasPermission('settings_company')
    ])

    if (!viewAllowed && !manageAllowed) {
      router.push('/')
      return
    }

    setCanManage(manageAllowed)

    const savedKey = await getSetting('akaunting_api_key', "")
    const savedCompany = await getSetting('akaunting_company_id', "1")
    const savedEmail = await getSetting('akaunting_user_email', "")
    setApiKey(savedKey)
    setCompanyId(savedCompany)
    setUserEmail(savedEmail)
    setLoading(false)
  }, [router])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSaveSettings = async () => {
    if (!canManage) return
    setSaving(true)
    const result = await saveAccountingSettings(apiKey, companyId, userEmail)
    setSaving(false)
    if (result.success) {
      toast.success("Fiscal protocols synchronized")
      setStatus('idle')
    } else {
      toast.error("Failed to commit settings: " + result.message)
    }
  }

  const handleCheckConnection = async () => {
    setChecking(true)
    setErrorMsg(null)
    const result = await checkAccountingConnection()
    setChecking(false)
    if (result.success && result.connected) {
        setStatus('connected')
        toast.success("Cloud uplink established")
    } else {
        setStatus('failed')
        setErrorMsg(result.message || "Unknown connection error")
        toast.error("Uplink handshake failed")
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[80vh] opacity-30">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-black uppercase tracking-[0.1em] text-base font-bold group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    Command Control
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                        <CloudSync size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">
                            Fiscal Interlink
                        </h1>
                        <p className="text-base font-bold font-black text-primary uppercase tracking-[0.2em] mt-2 opacity-80 italic">Akaunting Cloud Integration & Settlement Protocol</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]",
                        status === 'connected' ? "bg-emerald-500" : status === 'failed' ? "bg-rose-500" : "bg-primary"
                    )} />
                    <span className="text-base font-bold font-black text-slate-400 uppercase tracking-widest italic">
                        UPLINK_STATUS: {status === 'connected' ? 'ESTABLISHED' : status === 'failed' ? 'INTERRUPTED' : 'STANDBY'}
                    </span>
                </div>
                {canManage && (
                    <PremiumButton 
                        onClick={handleSaveSettings} 
                        disabled={saving}
                        className="h-16 px-12 rounded-2xl bg-primary text-white border-0 shadow-[0_20px_50px_rgba(255,30,133,0.3)] gap-4 text-xl tracking-widest"
                    >
                        {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                        COMMIT_FISCAL_PROTOCOLS
                    </PremiumButton>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
             {/* Credentials & Config */}
             <div className="lg:col-span-7 space-y-10">
                <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/cred">
                    <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between">
                        <h3 className="text-xl font-black text-white tracking-widest uppercase italic flex items-center gap-3">
                            <Key size={20} className="text-primary" />
                            Access Geometry
                        </h3>
                        <div className="px-5 py-1.5 rounded-xl bg-primary/10 text-base font-bold font-black text-primary uppercase tracking-[0.1em] border border-primary/20 italic">
                            CREDENTIALS
                        </div>
                    </div>
                    <div className="p-12 space-y-10">
                        <div className="space-y-4">
                            <Label className="text-base font-bold font-black uppercase text-primary/60 tracking-[0.1em] ml-6 flex items-center gap-2">
                                <Cpu size={12} /> AKAUNTING_API_VECTOR
                            </Label>
                            <Input 
                                type="password"
                                placeholder="..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="h-16 bg-black/40 border-white/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-white font-black italic tracking-widest pl-8 shadow-inner"
                                disabled={!canManage}
                            />
                            <p className="text-base font-bold font-black text-slate-600 uppercase tracking-[0.1em] italic ml-8">// LOCATE IN USER_PROFILE &gt; API_TOKEN WITHIN THE CLOUD NODE</p>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-base font-bold font-black uppercase text-primary/60 tracking-[0.1em] ml-6">AUTHORIZED_EMAIL_NULL</Label>
                            <Input 
                                type="email"
                                placeholder="operator@..."
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                className="h-16 bg-black/40 border-white/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-white font-black italic tracking-widest pl-8 shadow-inner"
                                disabled={!canManage}
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <Label className="text-base font-bold font-black uppercase text-primary/60 tracking-[0.1em] ml-6 flex items-center gap-2">
                                 <Building2 size={12} /> ENTITY_IDENTIFIER (Company ID)
                            </Label>
                            <Input 
                                placeholder="1"
                                value={companyId}
                                onChange={(e) => setCompanyId(e.target.value)}
                                className="h-16 bg-black/40 border-white/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-white font-black italic tracking-widest pl-8 shadow-inner max-w-[200px]"
                                disabled={!canManage}
                            />
                        </div>
                    </div>
                </PremiumCard>
             </div>

             {/* Connection Status & Analytics */}
             <div className="lg:col-span-5 space-y-10">
                <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/status">
                    <div className="p-10 border-b border-white/5 bg-black/40">
                        <h3 className="text-xl font-black text-white tracking-widest uppercase italic">Uplink Telemetry</h3>
                    </div>
                    <div className="p-12 space-y-10">
                        <div className="flex flex-col gap-8">
                            <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border-2 border-white/5 relative overflow-hidden">
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-xl group-hover/status:rotate-6 transition-transform">
                                        <CloudSync size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-white uppercase tracking-widest italic">Akaunting Cloud</p>
                                        <p className="text-base font-bold font-black text-emerald-500 uppercase tracking-[0.1em] italic mt-1">SYNC_PROTOCOL: ACTIVE</p>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-full bg-primary/[0.03] pointer-events-none" />
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-center gap-6">
                                    {status === 'connected' && (
                                        <div className="flex items-center gap-3 text-base font-bold font-black text-emerald-500 bg-emerald-500/10 px-8 py-3 rounded-2xl border border-emerald-500/20 shadow-2xl animate-pulse italic uppercase tracking-widest">
                                            <CheckCircle2 size={16} /> SIGNAL_ESTABLISHED
                                        </div>
                                    )}
                                    {status === 'failed' && (
                                        <div className="flex items-center gap-3 text-base font-bold font-black text-rose-500 bg-rose-500/10 px-8 py-3 rounded-2xl border border-rose-500/20 shadow-2xl animate-bounce italic uppercase tracking-widest">
                                            <XCircle size={16} /> SIGNAL_COLLAPSED
                                        </div>
                                    )}
                                </div>
                                
                                <PremiumButton 
                                    variant="outline" 
                                    className="h-16 w-full rounded-2xl gap-4 bg-white/5 border-white/5 hover:bg-white/10 hover:border-primary/30 transition-all text-white font-black italic uppercase text-base font-bold tracking-widest"
                                    onClick={handleCheckConnection}
                                    disabled={checking || !apiKey}
                                >
                                    {checking ? <RefreshCcw size={20} className="animate-spin" /> : <RefreshCcw size={20} />}
                                    RUN_UPLINK_DIAGNOSTIC
                                </PremiumButton>
                            </div>
                        </div>

                        {status === 'failed' && errorMsg && (
                            <div className="p-8 bg-rose-500/5 border-2 border-rose-500/10 rounded-3xl relative overflow-hidden group/error">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Activity className="text-rose-500" size={32} />
                                </div>
                                <p className="text-base font-bold font-black text-rose-500 uppercase tracking-[0.1em] mb-3 italic">DEEP_ERROR_TELEMETRY:</p>
                                <p className="text-lg font-bold text-rose-400 font-mono italic leading-relaxed uppercase tracking-widest bg-black/40 p-4 rounded-xl border border-rose-500/5 select-all">
                                    &gt; {errorMsg}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 pt-6">
                            <div className="p-8 bg-emerald-500/5 rounded-3xl border-2 border-emerald-500/10 flex flex-col gap-2">
                                <p className="text-base font-bold font-black text-emerald-500 uppercase tracking-widest italic opacity-60">Invoicing Matrix (Customer)</p>
                                <p className="text-xl font-black text-white italic uppercase tracking-widest leading-none">BILLING_NOTE_INTERFACING</p>
                            </div>
                            <div className="p-8 bg-indigo-500/5 rounded-3xl border-2 border-indigo-500/10 flex flex-col gap-2">
                                <p className="text-base font-bold font-black text-indigo-400 uppercase tracking-widest italic opacity-60">Settlement Matrix (Operator)</p>
                                <p className="text-xl font-black text-white italic uppercase tracking-widest leading-none">DRIVER_PAYOUT_INTERFACING</p>
                            </div>
                        </div>
                    </div>
                </PremiumCard>
             </div>
        </div>

        {/* Global Advisory */}
        <div className="mt-20 p-12 rounded-[3.5rem] bg-indigo-500/5 border-2 border-indigo-500/10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="p-6 rounded-[2rem] bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500/30 shadow-2xl animate-pulse">
                <Target size={32} />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
                <p className="text-xl font-black text-indigo-400 italic uppercase tracking-[0.1em]">FISCAL_SYNCHRONIZATION_ADVISORY</p>
                <p className="text-xl font-bold text-slate-600 leading-relaxed uppercase tracking-wider italic">
                    All document emissions within the TMS trigger an automated relay to the Akaunting Cloud node. <br />
                    Ensure the API Vector has 'Write' permissions for Invoices, Bills, and Customer entities to prevent relay collision.
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-white/10 text-white gap-3 uppercase font-black text-base font-bold tracking-[0.1em] ml-auto italic">
                <Activity size={18} /> EVENT_LOG_UPLINK
            </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  )
}

