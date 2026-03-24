"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FileText, 
  Search,
  Image as ImageIcon,
  PenTool,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Filter,
  ArrowRight
} from "lucide-react"
import { getAllPODs, getPODStats } from "@/lib/supabase/pod"
import { PODExport } from "@/components/pod/pod-export"
import { useLanguage } from "@/components/providers/language-provider"
import Link from "next/link"
import NextImage from "next/image"
import { cn } from "@/lib/utils"
import { PremiumButton } from "@/components/ui/premium-button"
import { PremiumCard } from "@/components/ui/premium-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export default function PODPage({ pods, stats, searchParams }: any) {
  const { t } = useLanguage()
  const [filterQuery, setFilterQuery] = useState('')
  
  const statusConfig: Record<string, { label: string; color: string; glow: string; icon: React.ReactNode }> = {
    Delivered: { label: t('common.success'), color: "text-emerald-400 bg-emerald-500/10", glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]", icon: <CheckCircle2 size={12} /> },
    Complete: { label: t('common.success'), color: "text-emerald-400 bg-emerald-500/10", glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]", icon: <CheckCircle2 size={12} /> },
    "In Transit": { label: t('common.loading'), color: "text-primary bg-primary/10", glow: "shadow-[0_0_15px_rgba(255,30,133,0.3)]", icon: <Clock size={12} /> },
    "Picked Up": { label: t('common.pending'), color: "text-primary/80 bg-primary/5", glow: "shadow-none", icon: <Clock size={12} /> },
    Failed: { label: t('common.error'), color: "text-rose-400 bg-rose-500/10", glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]", icon: <AlertCircle size={12} /> },
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Tactical Hub Header */}
      <div className="bg-[#0a0518] p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div>
            <div className="flex items-center gap-6 mb-4">
               <div className="p-4 bg-primary/20 rounded-[2rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary">
                  <FileText size={40} strokeWidth={2.5} />
               </div>
               <div>
                  <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none mb-2">{t('navigation.pod')}</h1>
                  <p className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] opacity-80 italic">{t('dashboard.subtitle')}</p>
               </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
             <PODExport data={pods} />
          </div>
        </div>
      </div>

      {/* Intelligence Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumCard className="p-8 group hover:border-primary/50 transition-all duration-500 border-white/5 bg-white/5">
           <div className="flex justify-between items-start mb-4">
              <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">{t('navigation.reports')}</span>
              <FileText className="text-primary opacity-20 group-hover:opacity-100 transition-opacity" size={20} />
           </div>
           <p className="text-5xl font-black text-white italic tracking-tighter mb-2">{stats.total}</p>
           <div className="h-1 w-12 bg-primary rounded-full" />
        </PremiumCard>

        <PremiumCard className="p-8 group hover:border-emerald-500/50 transition-all duration-500 border-white/5 bg-white/5 shadow-[inset_0_0_30px_rgba(16,185,129,0.02)]">
           <div className="flex justify-between items-start mb-4">
              <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">{t('common.success')}</span>
              <CheckCircle2 className="text-emerald-400 opacity-20 group-hover:opacity-100 transition-opacity" size={20} />
           </div>
           <p className="text-5xl font-black text-emerald-400 italic tracking-tighter mb-2">{stats.complete}</p>
           <div className="h-1 w-12 bg-emerald-500 rounded-full" />
        </PremiumCard>

        <PremiumCard className="p-8 group hover:border-primary/50 transition-all duration-500 border-white/5 bg-white/5">
           <div className="flex justify-between items-start mb-4">
              <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">{t('common.loading')}</span>
              <ImageIcon className="text-primary opacity-20 group-hover:opacity-100 transition-opacity" size={20} />
           </div>
           <div className="flex items-end gap-3">
              <p className="text-5xl font-black text-white italic tracking-tighter mb-2">{stats.withPhoto}</p>
              <span className="text-base font-bold font-black text-primary mb-4 uppercase">{t('common.success')}</span>
           </div>
           <div className="h-1 w-12 bg-primary/50 rounded-full" />
        </PremiumCard>

        <PremiumCard className="p-8 group hover:border-primary/50 transition-all duration-500 border-white/5 bg-white/5">
           <div className="flex justify-between items-start mb-4">
              <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">{t('navigation.monitoring')}</span>
              <PenTool className="text-primary opacity-20 group-hover:opacity-100 transition-opacity" size={20} />
           </div>
           <div className="flex items-end gap-3">
              <p className="text-5xl font-black text-white italic tracking-tighter mb-2">{stats.withSignature}</p>
              <span className="text-base font-bold font-black text-primary mb-4 uppercase">{t('common.success')}</span>
           </div>
           <div className="h-1 w-12 bg-primary/50 rounded-full" />
        </PremiumCard>
      </div>

      {/* Filter Matrix */}
      <div className="bg-[#0a0518] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <form className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end relative z-10">
          <div className="md:col-span-1 space-y-3">
             <Label className="text-base font-bold font-black text-primary uppercase tracking-[0.4em] ml-4">{t('common.search')}</Label>
             <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-hover:text-primary" size={18} />
                <Input 
                   name="q"
                   placeholder={t('common.search')} 
                   className="pl-14 h-16 bg-white/5 border-white/5 text-white font-black uppercase tracking-widest rounded-2xl focus:bg-white/10 transition-all border-2 focus:border-primary/30" 
                   defaultValue={searchParams.q as string || ''}
                />
             </div>
          </div>
          <div className="space-y-3">
             <Label className="text-base font-bold font-black text-slate-500 uppercase tracking-widest ml-4">{t('common.date')}</Label>
             <Input 
                type="date" 
                name="from" 
                defaultValue={searchParams.from as string || ''} 
                className="h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl focus:bg-white/10 transition-all border-2" 
             />
          </div>
          <div className="space-y-3">
             <Label className="text-base font-bold font-black text-slate-500 uppercase tracking-widest ml-4">{t('common.date')}</Label>
             <Input 
                type="date" 
                name="to" 
                defaultValue={searchParams.to as string || ''} 
                className="h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl focus:bg-white/10 transition-all border-2" 
             />
          </div>
          <PremiumButton type="submit" className="h-16 rounded-2xl gap-3 shadow-[0_15px_30px_rgba(255,30,133,0.3)]">
             <Filter size={20} /> {t('common.search')}
          </PremiumButton>
        </form>
      </div>

      {/* POD Repository Table */}
      <div className="bg-[#0a0518] rounded-[4rem] border border-white/5 shadow-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em]">{t('common.actions')} ID</th>
                <th className="p-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em]">{t('common.date')}</th>
                <th className="p-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em]">{t('navigation.reports')}</th>
                <th className="p-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em]">{t('navigation.drivers')}</th>
                <th className="p-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em] text-center">{t('common.loading')}</th>
                <th className="p-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em]">{t('common.status')}</th>
                <th className="p-8 text-right text-[12px] font-black text-slate-500 uppercase tracking-[0.1em]">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pods.map((pod: any) => (
                <tr key={pod.Job_ID} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-all group">
                  <td className="p-8">
                    <Link href={`/admin/jobs/${pod.Job_ID}`}>
                       <span className="text-primary font-black text-xl tracking-tighter uppercase group-hover:scale-110 block origin-left transition-transform">
                          {pod.Job_ID}
                       </span>
                    </Link>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col">
                       <span className="text-lg font-bold font-black text-white uppercase tracking-tight">
                          {pod.Plan_Date ? new Date(pod.Plan_Date).toLocaleDateString('th-TH') : "N/A"}
                       </span>
                       <span className="text-base font-bold font-black text-slate-600 uppercase">{t('pod.synchronized')}</span>
                    </div>
                  </td>
                  <td className="p-8">
                     <span className="text-xl font-black text-white uppercase tracking-tighter truncate max-w-[200px] block font-sans">
                        {pod.Customer_Name || t('common.loading')}
                     </span>
                  </td>
                  <td className="p-8">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-base font-bold font-black text-primary border border-primary/30">
                           {pod.Driver_Name?.slice(0,1) || "A"}
                        </div>
                        <span className="text-lg font-bold font-black text-slate-400 uppercase tracking-widest">{pod.Driver_Name || t('common.auto')}</span>
                     </div>
                  </td>
                  <td className="p-8">
                     <div className="flex items-center justify-center gap-4">
                        {pod.Photo_Proof_Url ? (
                           <div className="group/visual relative">
                              <div className="w-14 h-14 rounded-2xl border-2 border-white/10 overflow-hidden bg-black shadow-lg relative transition-all group-hover/visual:scale-125 group-hover/visual:rotate-3 z-10 group-hover/visual:border-primary">
                                 <NextImage 
                                    src={pod.Photo_Proof_Url.split(',')[0]} 
                                    alt={t('pod.visual_proof')} 
                                    fill 
                                    className="object-cover opacity-80 group-hover/visual:opacity-100 transition-opacity" 
                                 />
                              </div>
                              <div className="absolute inset-0 bg-primary blur-xl opacity-0 group-hover/visual:opacity-40 transition-opacity" />
                           </div>
                        ) : (
                           <div className="w-10 h-1 border-t border-white/10" />
                        )}
                        {pod.Signature_Url ? (
                           <div className="group/sig relative">
                              <div className="w-16 h-12 rounded-xl border-2 border-white/10 overflow-hidden bg-white shadow-lg relative transition-all group-hover/sig:scale-125 group-hover/sig:-rotate-3 z-10 group-hover/sig:border-primary">
                                 <NextImage 
                                    src={pod.Signature_Url} 
                                    alt={t('pod.auth_sig')} 
                                    fill 
                                    className="object-contain p-1" 
                                 />
                              </div>
                              <div className="absolute inset-0 bg-primary blur-xl opacity-0 group-hover/sig:opacity-40 transition-opacity" />
                           </div>
                        ) : (
                           <div className="w-10 h-1 border-t border-white/10" />
                        )}
                     </div>
                  </td>
                  <td className="p-8">
                    <div className={cn(
                      "flex items-center gap-3 w-fit px-5 py-2 rounded-full border border-white/5",
                      statusConfig[pod.Job_Status]?.color || 'text-slate-500 bg-white/5',
                      statusConfig[pod.Job_Status]?.glow
                    )}>
                       {statusConfig[pod.Job_Status]?.icon}
                       <span className="text-base font-bold font-black uppercase tracking-[0.2em]">
                          {statusConfig[pod.Job_Status]?.label || pod.Job_Status}
                       </span>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <Link href={`/admin/jobs/${pod.Job_ID}`}>
                       <button className="p-4 rounded-2xl bg-white/5 hover:bg-primary text-slate-500 hover:text-white transition-all border border-transparent hover:border-primary/50 group/btn">
                          <ArrowRight size={20} className="transition-transform group-hover/btn:translate-x-1" />
                       </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pods.length === 0 && (
          <div className="py-32 text-center opacity-30">
             <FileText size={64} className="mx-auto mb-6 text-slate-500" />
             <p className="text-lg font-bold font-black uppercase tracking-[0.6em] text-white">{t('common.pending')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

