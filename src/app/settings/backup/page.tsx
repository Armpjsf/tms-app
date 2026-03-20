"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Database, ArrowLeft, Download, FileJson, ShieldCheck, Activity, Zap, HardDrive, Share2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"

export default function BackupSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleBackup = async (table: string) => {
    setLoading(true)
    try {
        const { data, error } = await supabase.from(table).select('*')
        if (error) throw error
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${table}_backup_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Data extraction completed for ${table}`)
    } catch (error) {
        toast.error("Extraction failed: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
        setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-500 transition-all font-black uppercase tracking-[0.4em] text-[10px] group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    Command Control
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-500/20 rounded-[2.5rem] border-2 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-emerald-400 group-hover:scale-110 transition-all duration-500">
                        <Database size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">
                            Data Vault
                        </h1>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">Cold-Storage Extraction & System Redundancy Matrix</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">VAULT_STATUS: SECURE_STANDBY</span>
                </div>
                <div className="flex items-center gap-4 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                   <ShieldCheck className="text-emerald-500" size={18} />
                   <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Encrypted Payload Readiness</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
              { label: "Jobs Mission Log", table: "Jobs_Main", desc: "Primary transport operations & job telemetry" },
              { label: "Operator Registry", table: "Master_Drivers", desc: "Field personnel credentials & performance history" },
              { label: "Asset Fleet Data", table: "master_vehicles", desc: "Global vehicle inventory & maintenance specs" },
              { label: "Energy Consumption", table: "Fuel_Logs", desc: "Fuel logistics & efficiency monitoring data" },
              { label: "Maintenance Intel", table: "Repair_Tickets", desc: "Repair history & technical equipment status" },
              { label: "Entity Database", table: "Master_Customers", desc: "Partner organization & customer identity nexus" },
          ].map((item) => (
              <PremiumCard key={item.table} className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[3rem] overflow-hidden group/vault hover:border-emerald-500/30 transition-all duration-500">
                  <div className="p-10 space-y-8">
                      <div className="flex justify-between items-start">
                          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner group-hover/vault:rotate-6 transition-transform">
                              <FileJson size={28} />
                          </div>
                          <div className="flex items-center gap-2 opacity-20 group-hover/vault:opacity-100 transition-opacity">
                             <Zap size={14} className="text-emerald-500" />
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">READY_FOR_EXPORT</span>
                          </div>
                      </div>
                      
                      <div>
                          <h3 className="text-2xl font-black text-white tracking-widest uppercase italic group-hover/vault:text-emerald-400 transition-colors">{item.label}</h3>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 h-10 italic">
                            // {item.desc}
                          </p>
                      </div>

                      <div className="space-y-4 pt-4">
                           <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-700 italic">
                                <span>PROTOCOL: JSON_UPLINK</span>
                                <span>STATUS: NOMINAL</span>
                           </div>
                           <PremiumButton 
                              variant="outline" 
                              className="w-full h-16 rounded-2xl gap-4 bg-white/5 border-white/5 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all shadow-xl font-black uppercase text-xs tracking-widest italic" 
                              onClick={() => handleBackup(item.table)}
                              disabled={loading}
                           >
                              {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                              INITIATE_EXTRACTION
                           </PremiumButton>
                      </div>
                  </div>
              </PremiumCard>
          ))}
        </div>

        {/* Global Advisory */}
        <div className="mt-20 p-12 rounded-[3.5rem] bg-emerald-500/5 border-2 border-emerald-500/10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="p-6 rounded-[2rem] bg-emerald-500/20 text-emerald-500 border-2 border-emerald-500/30 shadow-2xl animate-pulse">
                <HardDrive size={32} />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
                <p className="text-xl font-black text-emerald-500 italic uppercase tracking-widest">COLD_STORAGE_ADVISORY</p>
                <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-wider italic">
                    Backups are captured as high-parity JSON snapshots. For disaster recovery or system migration, ensure payload integrity before deployment to secondary nodes. <br />
                    Scheduled automated syncs occur every orbital cycle at 00:00 UTC.
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-white/10 text-white gap-3 uppercase font-black text-[10px] tracking-[0.3em] ml-auto italic">
                <Share2 size={18} /> SYNC_EXTERNAL_VAULT
            </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  )
}
