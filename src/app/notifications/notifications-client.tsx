"use client"

import { Bell, AlertTriangle, ShieldAlert, Wrench, FileWarning, Truck, ArrowLeft, Activity, Target, Zap } from "lucide-react"
import Link from "next/link"
import { PremiumCard } from "@/components/ui/premium-card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const SEVERITY_STYLES = {
  critical: {
    bg: "bg-rose-500/10 border-rose-500/30",
    text: "text-rose-500",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.2)]",
    dot: "bg-rose-500 animate-pulse",
    label: "CRITICAL"
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-500",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    dot: "bg-amber-500 animate-pulse",
    label: "WARNING"
  },
  info: {
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-500",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
    dot: "bg-blue-500",
    label: "PROTOCOL"
  },
}

const TYPE_ICONS = {
  expiry: FileWarning,
  inspection_fail: ShieldAlert,
  maintenance: Wrench,
}

const TYPE_LABELS = {
  expiry: "Asset Compliance Decay",
  inspection_fail: "Technical Audit Failure",
  maintenance: "Pending Lifecycle Service",
}

export function NotificationsClient({ alerts }: any) {
  const criticalCount = alerts.filter((a: any) => a.severity === 'critical').length
  const warningCount = alerts.filter((a: any) => a.severity === 'warning').length
  const infoCount = alerts.filter((a: any) => a.severity === 'info').length

  const grouped: Record<string, any[]> = {}
  alerts.forEach((a: any) => {
    if (!grouped[a.type]) grouped[a.type] = []
    grouped[a.type].push(a)
  })

  return (
    <div className="space-y-12 pb-20">
      {/* Tactical Alert Header */}
      <div className="bg-[#0a0518] p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div>
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-primary transition-all mb-8 text-[10px] font-black uppercase tracking-[0.4em] group/back">
                <div className="p-2 bg-white/5 rounded-full group-hover/back:-translate-x-1 transition-transform">
                   <ArrowLeft size={14} />
                </div>
                TERMINAL_HOME
            </Link>
            <div className="flex items-center gap-6">
               <div className="p-4 bg-primary/20 rounded-[2rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.3)] text-primary group-hover:scale-110 transition-all duration-500">
                  <Bell size={40} strokeWidth={2.5} className="animate-pulse" />
               </div>
               <div>
                  <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none mb-2 italic">Alert Engine</h1>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] opacity-80 italic italic">Strategic Monitoring & Operational Intelligence Registry</p>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-rose-500/10 p-5 rounded-3xl border border-rose-500/20 backdrop-blur-3xl shadow-[0_0_30px_rgba(244,63,94,0.1)]">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none">Status Level</span>
                <span className="text-sm font-black text-white uppercase tracking-widest italic">{criticalCount > 0 ? 'CRITICAL_INTERFERENCE' : 'NOMINAL_STATE'}</span>
             </div>
             <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg border-2",
                criticalCount > 0 ? "bg-rose-500 animate-pulse border-rose-400 shadow-rose-500/40" : "bg-emerald-500 border-emerald-400 shadow-emerald-500/40"
             )}>
                <Activity size={24} />
             </div>
          </div>
        </div>
      </div>

      {/* Summary Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[
          { label: "Critical Breaches", count: criticalCount, icon: AlertTriangle, color: "rose" },
          { label: "System Warnings", count: warningCount, icon: Bell, color: "amber" },
          { label: "Operational Info", count: infoCount, icon: Zap, color: "blue" },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className={cn(
             "bg-[#0a0518] p-8 relative overflow-hidden group border-2 transition-all duration-500",
             stat.color === 'rose' ? 'border-rose-500/20 hover:border-rose-500/50' : 
             stat.color === 'amber' ? 'border-amber-500/20 hover:border-amber-500/50' : 
             'border-blue-500/20 hover:border-blue-500/50'
          )}>
            <div className="flex items-center gap-6">
              <div className={cn(
                "p-5 rounded-3xl text-white shadow-2xl transition-all duration-500 group-hover:scale-110",
                stat.color === 'rose' ? 'bg-rose-500 shadow-rose-500/20' : 
                stat.color === 'amber' ? 'bg-amber-500 shadow-amber-500/20' : 
                'bg-blue-500 shadow-blue-500/20'
              )}>
                <stat.icon size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-white italic tracking-tighter">{stat.count}</p>
                <p className={cn(
                   "text-[9px] font-black uppercase tracking-[0.4em] leading-none",
                   stat.color === 'rose' ? 'text-rose-500' : 
                   stat.color === 'amber' ? 'text-amber-500' : 
                   'text-blue-500'
                )}>{stat.label}</p>
              </div>
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Alert Groups */}
      <div className="space-y-10">
        {alerts.length === 0 ? (
          <PremiumCard className="bg-[#0a0518]/50 p-24 text-center border-2 border-dashed border-white/5 rounded-[4rem]">
              <div className="relative inline-block mb-8">
                <Bell size={64} className="text-white/5" />
                <div className="absolute inset-0 bg-emerald-500/10 blur-[40px] rounded-full" />
              </div>
              <h3 className="text-2xl font-black text-white italic tracking-[0.3em] uppercase mb-3">Void Space Detected</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em]">System state: ABSOLUTELY NOMINAL // ALL PROTOCOLS VERIFIED</p>
          </PremiumCard>
        ) : (
          Object.entries(grouped).map(([type, typeAlerts]) => {
            const TypeIcon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || Bell
            return (
              <motion.div 
                key={type} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-[#0a0518] rounded-[3.5rem] border-2 border-white/5 overflow-hidden shadow-3xl group/group"
              >
                <div className="p-8 border-b border-white/5 bg-black/40 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="p-3 bg-white/5 rounded-2xl text-slate-400 group-hover/group:bg-primary group-hover/group:text-white transition-all duration-300">
                       <TypeIcon size={20} />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-white tracking-widest uppercase italic">{TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type}</h2>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Cluster ID: {type.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2 px-5 bg-white/5 rounded-full border border-white/10">
                      <Target size={14} className="text-slate-700" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{typeAlerts.length} NODES</span>
                  </div>
                </div>
                
                <div className="divide-y divide-white/5">
                  {typeAlerts.map(alert => {
                    const style = SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.info
                    return (
                      <div key={alert.id} className={cn(
                         "p-8 flex items-start gap-10 hover:bg-white/[0.03] transition-all group/item border-l-4 border-transparent",
                         alert.severity === 'critical' ? 'hover:border-rose-500' : 'hover:border-primary'
                      )}>
                        <div className={cn("w-3 h-3 rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.3)]", style.dot)} />
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="text-xl font-black text-white tracking-widest uppercase italic group-hover/item:text-primary transition-colors">{alert.title}</span>
                            <div className={cn("px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-transparent italic", style.bg, style.text, style.glow)}>
                              {style.label}
                            </div>
                          </div>
                          
                          <p className="text-sm font-black text-slate-500 leading-relaxed max-w-3xl uppercase tracking-tighter">{alert.description}</p>
                          
                          {alert.meta?.plate && (
                            <div className="flex items-center gap-3 pt-2">
                               <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-400 group-hover/item:text-primary transition-colors">
                                  <Truck size={14} />
                               </div>
                               <span className="text-xs font-black text-white uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-xl border border-white/5 italic">Vector Plate: {alert.meta.plate}</span>
                            </div>
                          )}
                        </div>

                        <div className="hidden lg:block">
                           <PremiumButton variant="secondary" className="bg-white/5 border-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl">
                               VIEW TELEMETRY
                           </PremiumButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Tactical Hub Utility */}
      <div className="p-12 bg-[#0a0518] rounded-[5rem] border-2 border-white/5 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-8 relative z-10">
              <div className="p-5 bg-primary/20 rounded-[2.5rem] shadow-[0_0_40px_rgba(255,30,133,0.2)] border-2 border-primary/30 group-hover:rotate-12 transition-all duration-700">
                  <Activity size={32} className="text-primary" />
              </div>
              <div className="text-center md:text-left">
                  <h4 className="text-2xl font-black text-white uppercase tracking-[0.4em] italic mb-1">Signal Protocol Sync</h4>
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] leading-relaxed">
                      All tactical intercepts are synchronized across the global operational matrix. <br />
                      Real-time alert persistence is currently ACTIVE.
                  </p>
              </div>
          </div>
          <PremiumButton className="h-16 px-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white border-white/10 font-black uppercase tracking-widest italic group-hover:scale-110 transition-transform">
             CLEAR CACHE
          </PremiumButton>
      </div>
    </div>
  )
}
