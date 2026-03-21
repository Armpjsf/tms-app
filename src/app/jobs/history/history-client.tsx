"use client"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { 
  History, 
  Truck,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowLeft,
  XCircle,
  ListFilter,
  ImageIcon,
  Zap,
  Eye
} from "lucide-react"
import { ExcelExport } from "@/components/ui/excel-export"
import { JobHistoryActions } from "@/components/jobs/job-history-actions"
import { HistoryStatusFilter } from "@/components/jobs/history-status-filter"
import { CustomerCancelButton } from "@/components/jobs/customer-cancel-button"
import NextImage from "next/image"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/providers/language-provider"

interface HistoryClientProps {
  jobs: any[]
  count: number
  drivers: any[]
  vehicles: any[]
  customers: any[]
  routes: any[]
  customerMode: boolean
  canViewPrice: boolean
  canDelete: boolean
  canExport: boolean
  dateFrom: string
  dateTo: string
  status: string
  limit: number
}

export function HistoryClient({ 
  jobs, 
  count, 
  drivers, 
  vehicles, 
  customers, 
  routes,
  customerMode,
  canViewPrice,
  canDelete,
  canExport,
  dateFrom,
  dateTo,
  status,
  limit
}: HistoryClientProps) {
  const { t } = useLanguage()

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    New: { label: t('common.pending'), color: "text-primary bg-primary/10 border-primary/20", icon: <Package size={14} /> },
    Assigned: { label: t('common.pending'), color: "text-primary bg-primary/20 border-primary/30", icon: <Truck size={14} /> },
    "Picked Up": { label: t('common.loading'), color: "text-accent bg-accent/20 border-accent/30", icon: <Package size={14} /> },
    "In Transit": { label: t('common.loading'), color: "text-accent bg-accent/20 border-accent/30", icon: <Truck size={14} /> },
    Delivered: { label: t('common.success'), color: "text-primary bg-primary/10 border-primary/20", icon: <CheckCircle2 size={14} /> },
    Completed: { label: t('common.success'), color: "text-primary bg-primary/20 border-primary/30", icon: <CheckCircle2 size={14} /> },
    Complete: { label: t('common.success'), color: "text-primary bg-primary/20 border-primary/30", icon: <CheckCircle2 size={14} /> },
    Failed: { label: t('common.error'), color: "text-rose-500 bg-rose-500/10 border-rose-500/20", icon: <AlertCircle size={14} /> },
    Cancelled: { label: t('common.error'), color: "text-slate-500 bg-white/5 border-white/10", icon: <XCircle size={14} /> },
  }

  return (
    <>
      {/* Elite Tactical Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-[#0a0518]/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/5 shadow-2xl relative group ring-1 ring-white/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                    <History className="text-primary" size={20} />
                </div>
                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">{t('navigation.reports')} {t('history.intel_archives')}</h2>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                {customerMode ? t('navigation.reports') : t('navigation.history')}
            </h1>
            <p className="text-slate-500 font-bold text-sm tracking-wide opacity-80 uppercase tracking-widest leading-relaxed">
              {customerMode ? t('history.fleet_matrix') : t('dashboard.subtitle')}
            </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <Link href={customerMode ? "/dashboard" : "/planning"}>
            <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
              <ArrowLeft size={20} className="mr-3 opacity-50" />
              {t('common.back')}
            </PremiumButton>
          </Link>
          {canExport && (
            <ExcelExport 
               data={jobs} 
               filename={`mission_history_${new Date().toISOString().split('T')[0]}`}
               title={t('navigation.reports')}
               trigger={
                 <PremiumButton variant="secondary" className="h-14 px-8 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
                     <Download className="w-5 h-5 mr-3" /> {t('common.success')}
                 </PremiumButton>
               }
            />
          )}
        </div>
      </div>

      {/* Metrics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {[
          { label: t('navigation.pod'), value: count || 0, icon: Package, color: "text-slate-400", bg: "bg-white/5", border: "border-white/5" },
          { label: t('common.success'), value: jobs?.filter((j: any) => ['Delivered', 'Complete', 'Completed'].includes(j?.Job_Status || '')).length || 0, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/20", border: "border-primary/20" },
          { label: t('common.error'), value: jobs?.filter((j: any) => j?.Job_Status === 'Failed').length || 0, icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
          { label: t('common.error'), value: jobs?.filter((j: any) => j?.Job_Status === 'Cancelled').length || 0, icon: XCircle, color: "text-slate-500", bg: "bg-white/5", border: "border-white/5" },
        ].map((stat, idx) => (
          <div key={idx} className={cn(
                  "p-8 rounded-[3rem] border backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40",
                  stat.border
              )}>
                <div className="flex items-center justify-between mb-8">
                    <div className={cn(
                        "p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6",
                        stat.bg, stat.color
                    )}>
                        <stat.icon size={24} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="relative z-10">
                    <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                    <p className="text-4xl font-black text-white tracking-tighter leading-none">{stat.value}</p>
                </div>
          </div>
        ))}
      </div>

      {/* Advanced Command Grid */}
      <div className="glass-panel rounded-[4rem] border-white/5 shadow-2xl overflow-hidden bg-[#0a0518]/20 group/archives">
          {/* Tactical Filter Header */}
          <div className="p-12 border-b border-white/5 bg-[#0a0518]/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-4 mb-10 relative z-10">
                <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/10">
                    <ListFilter size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">{t('navigation.reports')} {t('history.archive_filtering')}</h2>
                    <p className="text-primary text-[9px] font-black uppercase tracking-[0.3em] mt-1 opacity-70">{t('history.metadata_search')}</p>
                </div>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                <div className="md:col-span-12 lg:col-span-5">
                    <div className="glass-panel rounded-2xl p-0.5 border-white/5">
                        <SearchInput placeholder={t('common.search')} className="bg-transparent border-none text-white h-16 px-8 text-xs font-black tracking-widest uppercase placeholder:text-slate-700" />
                    </div>
                </div>
                <div className="md:col-span-4 lg:col-span-2 space-y-3">
                    <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">{t('common.date')}</Label>
                    <Input
                        type="date"
                        defaultValue={dateFrom}
                        name="from"
                        className="h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl shadow-inner focus:ring-primary/40 transition-all px-8 text-xs uppercase tracking-widest"
                    />
                </div>
                <div className="md:col-span-4 lg:col-span-2 space-y-3">
                    <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">{t('common.date')}</Label>
                    <Input
                        type="date"
                        defaultValue={dateTo}
                        name="to"
                        className="h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl shadow-inner focus:ring-primary/40 transition-all px-8 text-xs uppercase tracking-widest"
                    />
                </div>
                <div className="md:col-span-4 lg:col-span-3 space-y-3">
                    <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">{t('navigation.settings')}</Label>
                    <HistoryStatusFilter initialValue={status} />
                </div>
                <button type="submit" className="hidden" /> 
            </form>
          </div>

          {/* Operation Log Feed */}
          <div className="p-12 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-4">
                <div className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(255,30,133,0.8)]" />
                <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{t('navigation.monitoring')} Log</h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">{t('history.profiles_found').replace('{count}', count.toString())} • {t('history.historical_node')}</p>
                </div>
            </div>
            <Zap size={24} className="text-primary/20 opacity-50" />
          </div>

          <div className="relative min-h-[500px]">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-8">
              <div className="w-32 h-32 rounded-[3.5rem] bg-white/5 flex items-center justify-center border border-dashed border-white/10 group-hover/archives:border-primary/30 transition-all group-hover/archives:scale-110 duration-700">
                <Package className="w-16 h-16 text-slate-700 opacity-20" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-slate-500 font-bold text-xl uppercase tracking-widest">{t('common.pending')}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="text-left py-8 px-12 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('common.action')} ID</th>
                    <th className="text-left py-8 px-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('navigation.reports')}</th>
                    <th className="text-left py-8 px-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('navigation.vehicles')}</th>
                    <th className="text-center py-8 px-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('navigation.monitoring')}</th>
                    <th className="text-center py-8 px-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('navigation.pod')}</th>
                    {canViewPrice && <th className="text-right py-8 px-6 text-[9px] font-black text-primary uppercase tracking-[0.3em]">Matrix</th>}
                    <th className="text-left py-8 px-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('common.status')}</th>
                    <th className="text-right py-8 px-12 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(jobs || []).map((job: any) => (
                    <tr 
                      key={job.Job_ID} 
                      className="group/row transition-all duration-500 hover:bg-primary/[0.03]"
                    >
                      <td className="py-10 px-12">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover/row:bg-primary group-hover/row:text-white transition-all duration-500 shadow-xl group-hover/row:shadow-[0_0_30px_rgba(255,30,133,0.3)] group-hover/row:-rotate-3">
                                <Package size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-white font-black text-xl tracking-tighter group-hover/row:text-primary transition-colors font-display uppercase">{job.Job_ID}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Clock size={12} className="text-slate-600" />
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{job.Plan_Date || t('common.pending')}</p>
                                </div>
                            </div>
                        </div>
                      </td>
                      <td className="py-10 px-6">
                         <div className="flex flex-col gap-2">
                            <p className="text-white font-black text-sm tracking-tight uppercase group-hover/row:text-primary transition-colors">{job.Customer_Name || "-"}</p>
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                <MapPin size={12} className="text-primary/60" />
                                <span className="line-clamp-1">{job.Route_Name || "DIRECT VECTOR"}</span>
                            </div>
                         </div>
                      </td>
                      <td className="py-10 px-6">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-xl text-slate-400 group-hover/row:text-primary transition-colors">
                                    <Truck size={14} strokeWidth={2.5} />
                                </div>
                                <p className="text-white font-black text-sm tracking-tight uppercase">{job.Vehicle_Plate || "-"}</p>
                            </div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] pl-1">{job.Driver_Name || t('common.pending')}</p>
                        </div>
                      </td>
                      <td className="py-10 px-6">
                        <div className="flex flex-col items-center gap-2 min-w-[120px]">
                           {job.Verification_Status ? (
                               <Badge className={cn(
                                   "rounded-[1.25rem] px-4 py-1.5 font-black text-[9px] border-none shadow-lg tracking-widest uppercase",
                                   job.Verification_Status === 'Verified' ? "bg-primary text-white shadow-primary/20" :
                                   job.Verification_Status === 'Rejected' ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-accent text-white shadow-accent/20"
                               )}>
                                   {job.Verification_Status === 'Verified' ? t('common.success') : job.Verification_Status === 'Rejected' ? t('common.error') : job.Verification_Status}
                               </Badge>
                           ) : (
                               <div className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-slate-700 animate-ping" />
                                <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] italic">{t('common.pending')} Integrity</span>
                               </div>
                           )}
                           {job.Verified_At && (
                               <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest truncate w-32 text-center">
                                   {t('history.agent')} {job.Verified_By?.split('@')[0]}
                               </p>
                           )}
                        </div>
                      </td>
                      <td className="py-10 px-6">
                        <div className="flex items-center justify-center gap-4">
                             {job.Photo_Proof_Url ? (
                                <div className="relative w-14 h-14 rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-white/5 group/img ring-4 ring-primary/0 hover:ring-primary/40 transition-all duration-500 scale-95 hover:scale-100">
                                    <NextImage 
                                        src={job.Photo_Proof_Url.split(',')[0]} 
                                        alt="POD Photo" 
                                        fill 
                                        className="object-cover group-hover/img:scale-125 transition-transform duration-1000" 
                                    />
                                    <a href={job.Photo_Proof_Url.split(',')[0]} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-primary/40 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <Eye size={20} className="text-white" />
                                    </a>
                                </div>
                             ) : (
                                <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center text-slate-800 transition-colors group-hover/row:border-primary/20">
                                    <ImageIcon size={20} strokeWidth={1.5} />
                                </div>
                             )}
                             {job.Signature_Url ? (
                                <div className="relative w-20 h-14 rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-white/10 p-2 group/sig ring-4 ring-accent/0 hover:ring-accent/40 transition-all duration-500 scale-95 hover:scale-100">
                                    <NextImage 
                                        src={job.Signature_Url} 
                                        alt="Signature" 
                                        fill 
                                        className="object-contain p-2 group-hover/sig:scale-110 transition-transform duration-700 invert group-hover/sig:invert-0" 
                                    />
                                    <a href={job.Signature_Url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-accent/40 opacity-0 group-hover/sig:opacity-100 transition-opacity" />
                                </div>
                             ) : (
                                <div className="w-20 h-14 rounded-2xl border-2 border-dashed border-white/5 transition-colors group-hover/row:border-accent/20" />
                             )}
                        </div>
                      </td>
                      {canViewPrice && (
                        <td className="py-10 px-6 text-right">
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
                                    <span className="text-white font-black text-base tracking-tighter">
                                        {typeof job.Price_Cust_Total === 'number' 
                                            ? job.Price_Cust_Total.toLocaleString() 
                                            : (Number(job.Price_Cust_Total) || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[8px] font-black text-primary tracking-[0.2em] uppercase">{t('financial.credit') || 'CREDIT'}</span>
                                </div>
                                <div className="pr-4 flex items-center gap-2">
                                    <span className="text-[12px] font-black text-slate-500 tracking-tighter">
                                        {typeof job.Cost_Driver_Total === 'number' 
                                            ? job.Cost_Driver_Total.toLocaleString() 
                                            : (Number(job.Cost_Driver_Total) || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">{t('financial.debit') || 'DEBIT'}</span>
                                </div>
                            </div>
                        </td>
                      )}
                      <td className="py-10 px-6">
                        <span className={cn(
                            "inline-flex items-center gap-2.5 px-5 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border shadow-xl transition-all duration-500 group-hover/row:scale-105",
                            statusConfig[job.Job_Status]?.color || 'bg-white/5 text-slate-500 border-white/10'
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_10px_currentColor]" />
                          {statusConfig[job.Job_Status]?.label || job.Job_Status}
                        </span>
                      </td>
                      <td className="py-10 px-12 text-right">
                          {!customerMode && (
                              <div className="flex justify-end opacity-0 group-hover/row:opacity-100 transition-all duration-500 translate-x-4 group-hover/row:translate-x-0">
                                <JobHistoryActions 
                                    job={job}
                                    drivers={drivers}
                                    vehicles={vehicles}
                                    customers={customers}
                                    routes={routes}
                                    canViewPrice={canViewPrice}
                                    canDelete={canDelete}
                                />
                              </div>
                          )}
                          {customerMode && (
                              <CustomerCancelButton jobId={job.Job_ID} jobStatus={job.Job_Status || ''} />
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
          
          <div className="p-12 border-t border-white/5 bg-white/[0.02]">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
      </div>
    </>
  )
}
