"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  User,
  Truck,
  ShieldAlert,
  Activity,
  ArrowRight,
  Zap
} from "lucide-react"
import { getAllSOSAlerts, getSOSCount } from "@/lib/supabase/sos"
import { PremiumButton } from "@/components/ui/premium-button"
import { PremiumCard } from "@/components/ui/premium-card"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"
import Link from "next/link"

export default function SOSPage({ alerts, activeCount }: any) {
  const { t } = useLanguage()
  return (
    <div className="space-y-12 pb-20">
      {/* Strategic SOS Hub Header */}
      <div className="bg-[#0a0518] p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-rose-500/20 shadow-[0_30px_60px_rgba(244,63,94,0.2)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div>
            <div className="flex items-center gap-6 mb-4">
               <div className="p-4 bg-rose-500/20 rounded-[2.5rem] border-2 border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.3)] text-rose-500 animate-pulse">
                  <ShieldAlert size={40} strokeWidth={2.5} />
               </div>
               <div>
                  <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none mb-2">{t('navigation.sos')}</h1>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.6em] opacity-80 italic italic">{t('dashboard.subtitle')}</p>
               </div>
            </div>
          </div>
          
          {activeCount > 0 && (
            <div className="bg-rose-500/10 border-2 border-rose-500/30 px-8 py-4 rounded-3xl flex items-center gap-4 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
               <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping" />
               <span className="text-lg font-black text-rose-500 uppercase tracking-tighter">
                  {activeCount} {t('monitoring.alerts')}
               </span>
            </div>
          )}
        </div>
      </div>

      {/* Rapid Intelligence Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <PremiumCard className="p-8 bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 transition-all shadow-[inset_0_0_30px_rgba(244,63,94,0.05)]">
            <div className="flex justify-between items-start mb-4">
               <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{t('monitoring.alerts')}</span>
               <Activity className="text-rose-500 opacity-30" size={24} />
            </div>
            <p className="text-6xl font-black text-white italic tracking-tighter mb-2">{activeCount}</p>
            <div className="h-1.5 w-16 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,1)]" />
         </PremiumCard>

         <PremiumCard className="p-8 bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 transition-all">
            <div className="flex justify-between items-start mb-4">
               <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{t('planning.stats_pending')}</span>
               <AlertTriangle className="text-amber-500 opacity-30" size={24} />
            </div>
            <p className="text-6xl font-black text-white italic tracking-tighter mb-2">
               {alerts.filter((a: any) => a.Job_Status === 'Failed').length}
            </p>
            <div className="h-1.5 w-16 bg-amber-500 rounded-full" />
         </PremiumCard>

         <PremiumCard className="p-8 bg-white/5 border-white/5 hover:border-white/10 transition-all">
            <div className="flex justify-between items-start mb-4">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('planning.stats_delivered')}</span>
               <CheckCircle2 className="text-emerald-500 opacity-30" size={24} />
            </div>
            <p className="text-6xl font-black text-white italic tracking-tighter mb-2">{alerts.length}</p>
            <div className="h-1.5 w-16 bg-emerald-500/50 rounded-full" />
         </PremiumCard>
      </div>

      {/* SOS Signal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {alerts.length === 0 ? (
          <div className="col-span-full py-40 text-center opacity-20">
            <Zap size={80} className="mx-auto text-emerald-500 mb-8 animate-pulse" />
            <h3 className="text-2xl font-black text-white uppercase tracking-[0.8em]">{t('dashboard.system_integrity')}</h3>
            <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em] mt-4">{t('common.success')}</p>
          </div>
        ) : alerts.map((alert: any) => (
          <motion.div 
            key={alert.Job_ID}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -10 }}
            className={cn(
               "p-10 rounded-[3rem] border-2 bg-gradient-to-br from-[#0a0518] to-[#1a0b36]/40 backdrop-blur-3xl relative overflow-hidden transition-all duration-500",
               alert.Job_Status === 'SOS' 
                 ? "border-rose-500 shadow-[0_20px_50px_rgba(244,63,94,0.3)]" 
                 : "border-white/5 hover:border-white/20 shadow-2xl"
            )}
          >
            {/* Status Glint */}
            <div className={cn(
               "absolute top-0 right-10 w-24 h-6 rounded-b-2xl shadow-[0_0_20px_currentColor]",
               alert.Job_Status === 'SOS' ? "bg-rose-500 text-rose-500" : "bg-amber-500 text-amber-500"
            )} />

            <div className="flex items-start justify-between mb-8">
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">{t('sos.sig_analysis')}</span>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">#{alert.Job_ID}</p>
               </div>
               <div className={cn(
                  "p-4 rounded-2xl",
                  alert.Job_Status === 'SOS' ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500"
               )}>
                  <ShieldAlert size={28} className={alert.Job_Status === 'SOS' ? "animate-pulse" : ""} />
               </div>
            </div>

            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 leading-none italic">
               {alert.Job_Status === 'SOS' ? t('navigation.sos') : t('common.error')}
            </h3>

            <div className="space-y-5 border-t border-white/5 pt-8">
               <div className="flex items-center gap-4 group/item">
                  <div className="p-2 bg-white/5 rounded-lg group-hover/item:bg-primary transition-colors">
                     <User size={16} className="text-slate-400 group-hover/item:text-white" />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-widest">{alert.Driver_Name || t('common.no_data')}</span>
               </div>
               <div className="flex items-center gap-4 group/item">
                  <div className="p-2 bg-white/5 rounded-lg group-hover/item:bg-primary transition-colors">
                     <Truck size={16} className="text-slate-400 group-hover/item:text-white" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10">{alert.Vehicle_Plate || t('common.no_data')}</span>
               </div>
               <div className="flex items-center gap-4 group/item">
                  <div className="p-2 bg-white/5 rounded-lg group-hover/item:bg-primary transition-colors">
                     <MapPin size={16} className="text-slate-400 group-hover/item:text-white" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-tight truncate">{alert.Route_Name || "N/A"}</span>
               </div>
            </div>

            {alert.Failed_Reason && (
               <div className="mt-8 p-6 bg-rose-500/10 border border-rose-500/30 rounded-3xl relative overflow-hidden group/reason">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/reason:opacity-100 transition-opacity">
                     <ShieldAlert size={20} className="text-rose-500" />
                  </div>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">{t('common.error')}</p>
                  <p className="text-xs font-black text-white uppercase leading-relaxed font-sans">{alert.Failed_Reason}</p>
               </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-4">
               <PremiumButton variant="outline" className="h-14 rounded-2xl border-white/10 hover:border-rose-500/50 text-slate-400 gap-3">
                  <Phone size={16} /> {t('navigation.chat')}
               </PremiumButton>
               <Link href={`/admin/jobs/${alert.Job_ID}`} className="block">
                  <PremiumButton className="h-14 rounded-2xl w-full gap-3 shadow-[0_10px_20px_rgba(255,30,133,0.2)]">
                     <Target className="w-4 h-4" /> {t('common.loading')}
                  </PremiumButton>
               </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function Target({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
