"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Globe, ArrowLeft, Copy, RefreshCw, Key, ShieldCheck, Activity, Zap, Link as LinkIcon, Cpu } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSetting, saveSetting } from "@/lib/supabase/system_settings"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function ApiSettingsPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState("loading...")
  const [loading, setLoading] = useState(true)

  const loadInfo = useCallback(async () => {
    const key = await getSetting('api_key', 'tms_live_xxxxxxxxxxxxxxxx')
    setApiKey(key)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadInfo()
  }, [loadInfo])

  const generateNewKey = async () => {
    if (!confirm("การสร้างคีย์ใหม่จะทำให้คีย์เดิมใช้งานไม่ได้ ยืนยันหรือไม่?")) return
    const newKey = `tms_live_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`
    setApiKey(newKey)
    await saveSetting('api_key', newKey, 'Public API Key')
    toast.success("Generated new encrypted access key")
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("API Key copied to local buffer")
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-background/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-border/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-base font-bold group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    Command Control
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                        <Globe size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none italic premium-text-gradient">
                            API Interlink
                        </h1>
                        <p className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">External Node Integration & Secure Signal Nexus</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-muted/50 border border-border/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                    <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">INTERLINK_STATE: NOMINAL</span>
                </div>
                <div className="flex items-center gap-4 bg-primary/10 p-4 rounded-2xl border border-primary/20">
                   <ShieldCheck className="text-primary" size={18} />
                   <span className="text-base font-bold font-black text-foreground uppercase tracking-[0.3em] italic">Encrypted Payload Protocol</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
             {/* Key Management Card */}
             <div className="lg:col-span-12">
                  <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/api">
                      <div className="p-20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] pointer-events-none" />
                          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                          
                          <div className="max-w-4xl mx-auto space-y-16 relative z-10">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                                  <div className="space-y-4">
                                      <div className="flex items-center gap-4">
                                          <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/30">
                                              <Key size={32} strokeWidth={2.5} />
                                          </div>
                                          <h2 className="text-3xl font-black text-foreground tracking-widest uppercase italic">Master Access Token</h2>
                                      </div>
                                      <p className="text-xl font-bold text-muted-foreground uppercase tracking-widest italic leading-relaxed">
                                          Required for external ERP nodes, satellite tracking systems, and spatial telemetry integrations.
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-3 px-6 py-3 bg-muted/50 rounded-2xl border border-border/10">
                                       <Cpu size={18} className="text-primary" />
                                       <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">RSA_ENCRYPTION: ACTIVE</span>
                                  </div>
                              </div>

                              <div className="space-y-8">
                                  <div className="relative group/input">
                                      <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none">
                                          <LinkIcon size={20} className="text-primary opacity-40 group-focus-within/input:opacity-100 transition-opacity" />
                                      </div>
                                      <Input 
                                          value={apiKey} 
                                          readOnly 
                                          className="h-20 bg-black/40 border-2 border-border/5 rounded-[2rem] pl-20 pr-32 text-xl font-mono font-bold text-primary tracking-widest shadow-inner group-hover/api:border-primary/20 transition-all select-all italic"
                                      />
                                      <div className="absolute inset-y-0 right-3 flex items-center">
                                          <PremiumButton 
                                             variant="outline" 
                                             onClick={() => copyToClipboard(apiKey)}
                                             className="h-14 px-8 rounded-2xl bg-muted/50 border-border/5 hover:bg-primary hover:text-foreground transition-all text-base font-bold font-black uppercase tracking-widest italic"
                                          >
                                              <Copy size={16} className="mr-3" /> BUFFER_COPY
                                          </PremiumButton>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl group/warn">
                                       <AlertCircle size={20} className="text-rose-500 group-hover:rotate-12 transition-transform" />
                                       <p className="text-base font-bold font-black text-rose-500/60 uppercase tracking-widest leading-relaxed italic">
                                          CRITICAL: SHARING THIS TOKEN GRANTS FULL OPERATIONAL ACCESS TO THE CORE SYSTEM. DO NOT DEPLOY IN NON-SECURE ENVIRONMENTS.
                                       </p>
                                  </div>
                              </div>

                              <div className="pt-10 border-t border-border/5 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                  <div className="space-y-2">
                                      <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] italic mb-2">Security Lifecycle Management</p>
                                      <div className="flex items-center gap-4">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                                          <span className="text-lg font-bold font-black text-foreground uppercase tracking-widest italic">TOKEN_STABILITY: NOMINAL</span>
                                      </div>
                                  </div>
                                  <PremiumButton 
                                      variant="outline" 
                                      className="h-16 px-10 rounded-[1.5rem] border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-600 hover:text-foreground transition-all text-lg font-bold font-black uppercase tracking-[0.2em] italic gap-4"
                                      onClick={generateNewKey}
                                  >
                                      <RefreshCw size={20} className="group-hover/api:rotate-180 transition-transform duration-1000" /> REGENERATE_ACCESS_CORE
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
            <div className="p-6 rounded-[2rem] bg-primary/20 text-primary border-2 border-primary/30 shadow-2xl animate-pulse">
                <Activity size={32} />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
                <p className="text-xl font-black text-primary italic uppercase tracking-widest">INTERLINK_ADVISORY</p>
                <p className="text-xl font-bold text-muted-foreground leading-relaxed uppercase tracking-wider italic">
                    The API Interlink supports RESTful signal transmissions via GraphQL and traditional HTTP protocols. <br />
                    Rate limits are enforced at the node level to ensure global system stability. <br />
                    Refer to the Intelligence Documentation for implementation vectors.
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-border/10 text-foreground gap-3 uppercase font-black text-base font-bold tracking-[0.3em] ml-auto italic">
                <FileText size={18} /> VIEW_DOCS
            </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  )
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

