"use client"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleDateChange = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    New: { label: t('common.pending'), color: "text-primary bg-primary/10 border-primary/20", icon: <Package size={14} /> },
    Assigned: { label: t('common.pending'), color: "text-primary bg-primary/20 border-primary/30", icon: <Truck size={14} /> },
    "Picked Up": { label: t('common.loading'), color: "text-accent bg-accent/20 border-accent/30", icon: <Package size={14} /> },
    "In Transit": { label: t('common.loading'), color: "text-accent bg-accent/20 border-accent/30", icon: <Truck size={14} /> },
    Delivered: { label: t('common.success'), color: "text-primary bg-primary/10 border-primary/20", icon: <CheckCircle2 size={14} /> },
    Completed: { label: t('common.success'), color: "text-primary bg-primary/20 border-primary/30", icon: <CheckCircle2 size={14} /> },
    Complete: { label: t('common.success'), color: "text-primary bg-primary/20 border-primary/30", icon: <CheckCircle2 size={14} /> },
    Failed: { label: t('common.failed'), color: "text-rose-500 bg-rose-500/10 border-rose-500/20", icon: <AlertCircle size={14} /> },
    Cancelled: { label: t('common.cancelled'), color: "text-muted-foreground bg-muted/50 border-border/10", icon: <XCircle size={14} /> },
  }

  return (
    <>
      {/* Elite Tactical Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-background/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-border/5 shadow-2xl relative group ring-1 ring-border/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                    <History className="text-primary" size={20} />
                </div>
                <h2 className="text-base font-bold font-black text-primary uppercase tracking-[0.4em]">{t('navigation.reports')} {t('history.intel_archives')}</h2>
            </div>
            <h1 className="text-6xl font-black text-foreground tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                {customerMode ? t('navigation.reports') : t('navigation.history')}
            </h1>
            <p className="text-muted-foreground font-bold text-xl tracking-wide opacity-80 uppercase tracking-widest leading-relaxed">
              {customerMode ? t('history.fleet_matrix') : t('dashboard.subtitle')}
            </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <Link href={customerMode ? "/dashboard" : "/planning"}>
            <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl border-border/5 bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all">
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
                 <PremiumButton variant="secondary" className="h-14 px-8 rounded-2xl bg-primary text-foreground shadow-xl shadow-primary/20">
                     <Download className="w-5 h-5 mr-3" /> {t('common.download_report')}
                 </PremiumButton>
               }
            />
          )}
        </div>
      </div>

      {/* Metrics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {[
          { label: t('navigation.pod'), value: count || 0, icon: Package, color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border/5" },
          { label: t('common.success'), value: jobs?.filter((j: any) => ['Delivered', 'Complete', 'Completed'].includes(j?.Job_Status || '')).length || 0, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/20", border: "border-primary/20" },
          { label: t('common.failed'), value: jobs?.filter((j: any) => j?.Job_Status === 'Failed').length || 0, icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
          { label: t('common.cancelled'), value: jobs?.filter((j: any) => j?.Job_Status === 'Cancelled').length || 0, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border/5" },
        ].map((stat, idx) => (
          <div key={idx} className={cn(
                  "p-8 rounded-[3rem] border backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-background/40",
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
                    <p className="text-muted-foreground font-black text-base font-bold uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                    <p className="text-4xl font-black text-foreground tracking-tighter leading-none">{stat.value}</p>
                </div>
          </div>
        ))}
      </div>

      {/* Advanced Command Grid */}
      <div className="glass-panel rounded-[4rem] border-border/5 shadow-2xl overflow-hidden bg-background/20 group/archives">
          {/* Tactical Filter Header */}
          <div className="p-12 border-b border-border/5 bg-background/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-4 mb-10 relative z-10">
                <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/10">
                    <ListFilter size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">{t('navigation.reports')} {t('history.archive_filtering')}</h2>
                    <p className="text-primary text-base font-bold font-black uppercase tracking-[0.3em] mt-1 opacity-70">{t('history.metadata_search')}</p>
                </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                <div className="md:col-span-12 lg:col-span-5">
                    <div className="glass-panel rounded-2xl p-0.5 border-border/5">
                        <SearchInput placeholder={t('common.search')} className="bg-transparent border-none text-foreground h-16 px-8 text-lg font-bold font-black tracking-widest uppercase placeholder:text-muted-foreground" />
                    </div>
                </div>
                <div className="md:col-span-4 lg:col-span-2 space-y-3">
                    <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.3em] ml-2">{t('common.date')}</Label>
                    <Input
                        type="date"
                        value={dateFrom}
                        name="from"
                        onChange={(e) => handleDateChange('from', e.target.value)}
                        className="h-16 bg-muted/50 border-border/5 text-foreground font-black rounded-2xl shadow-inner focus:ring-primary/40 transition-all px-8 text-lg font-bold uppercase tracking-widest"
                    />
                </div>
                <div className="md:col-span-4 lg:col-span-2 space-y-3">
                    <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.3em] ml-2">{t('common.date')}</Label>
                    <Input
                        type="date"
                        value={dateTo}
                        name="to"
                        onChange={(e) => handleDateChange('to', e.target.value)}
                        className="h-16 bg-muted/50 border-border/5 text-foreground font-black rounded-2xl shadow-inner focus:ring-primary/40 transition-all px-8 text-lg font-bold uppercase tracking-widest"
                    />
                </div>
                <div className="md:col-span-4 lg:col-span-3 space-y-3">
                    <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.3em] ml-2">{t('navigation.settings')}</Label>
                    <HistoryStatusFilter initialValue={status} />
                </div>
                <button type="submit" className="hidden" /> 
            </form>
          </div>

          {/* Operation Log Feed */}
          <div className="p-12 border-b border-border/5 flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-4">
                <div className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(255,30,133,0.8)]" />
                <div>
                    <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase">{t('navigation.history')} Log</h3>
                    <p className="text-muted-foreground text-base font-bold font-black uppercase tracking-[0.4em] mt-1">{t('history.profiles_found').replace('{count}', count.toString())} • {t('history.historical_node')}</p>
                </div>
            </div>
            <Zap size={24} className="text-primary/20 opacity-50" />
          </div>

          <div className="relative min-h-[500px]">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-8">
              <div className="w-32 h-32 rounded-[3.5rem] bg-muted/50 flex items-center justify-center border border-dashed border-border/10 group-hover/archives:border-primary/30 transition-all group-hover/archives:scale-110 duration-700">
                <Package className="w-16 h-16 text-muted-foreground opacity-20" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-muted-foreground font-bold text-xl uppercase tracking-widest">{t('common.pending')}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/5 bg-muted/30">
                    <th className="text-left py-6 px-6 text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.3em]">{t('common.action')} ID</th>
                    <th className="text-left py-6 px-4 text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.3em]">{t('navigation.reports')}</th>
                    <th className="text-left py-6 px-4 text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.3em]">{t('navigation.vehicles')}</th>
                    <th className="text-center py-6 px-4 text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.3em]">{t('common.integrity')}</th>
                    <th className="text-center py-6 px-4 text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.3em]">{t('navigation.pod')}</th>
                    {canViewPrice && <th className="text-right py-6 px-4 text-sm font-bold font-black text-primary uppercase tracking-[0.3em]">Matrix</th>}
                    <th className="text-left py-6 px-4 text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.3em]">{t('common.status')}</th>
                    <th className="text-right py-6 px-6 text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.3em]">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(jobs || []).map((job: any) => (
                    <tr 
                      key={job.Job_ID} 
                      className="group/row transition-all duration-500 hover:bg-primary/[0.03]"
                    >
                      <td className="py-8 px-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/5 flex items-center justify-center group-hover/row:bg-primary group-hover/row:text-foreground transition-all duration-500 shadow-xl group-hover/row:shadow-[0_0_30px_rgba(255,30,133,0.3)] group-hover/row:-rotate-3">
                                <Package size={18} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-foreground font-black text-lg tracking-tighter group-hover/row:text-primary transition-colors font-display uppercase">{job.Job_ID}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock size={10} className="text-muted-foreground" />
                                    <p className="text-sm font-bold font-black text-muted-foreground uppercase tracking-widest">{job.Plan_Date || t('common.pending')}</p>
                                </div>
                            </div>
                        </div>
                      </td>
                      <td className="py-8 px-4">
                         <div className="flex flex-col gap-1">
                            <p className="text-foreground font-black text-lg tracking-tight uppercase group-hover/row:text-primary transition-colors leading-tight">{job.Customer_Name || "-"}</p>
                            <div className="flex items-center gap-2 text-sm font-bold font-black text-muted-foreground uppercase tracking-widest">
                                <MapPin size={10} className="text-primary/60" />
                                <span className="line-clamp-1">{job.Route_Name || "DIRECT VECTOR"}</span>
                            </div>
                         </div>
                      </td>
                      <td className="py-8 px-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-muted/50 rounded-lg text-muted-foreground group-hover/row:text-primary transition-colors">
                                    <Truck size={12} strokeWidth={2.5} />
                                </div>
                                <p className="text-foreground font-black text-lg tracking-tight uppercase leading-tight">{job.Vehicle_Plate || "-"}</p>
                            </div>
                            <p className="text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">{job.Driver_Name || t('common.pending')}</p>
                        </div>
                      </td>
                      <td className="py-8 px-4 text-center">
                        <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
                           {job.Verification_Status ? (
                               <Badge className={cn(
                                   "rounded-[1.25rem] px-3 py-1 font-black text-sm font-bold border-none shadow-lg tracking-widest uppercase",
                                   job.Verification_Status === 'Verified' ? "bg-primary text-foreground shadow-primary/20" :
                                   job.Verification_Status === 'Rejected' ? "bg-rose-500 text-foreground shadow-rose-500/20" : "bg-accent text-foreground shadow-accent/20"
                               )}>
                                   {job.Verification_Status === 'Verified' ? t('common.success') : job.Verification_Status === 'Rejected' ? t('common.error') : job.Verification_Status}
                               </Badge>
                           ) : (
                               <div className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-slate-700 animate-ping" />
                                 <span className="text-sm font-bold font-black text-muted-foreground uppercase tracking-[0.3em] italic">{`${t('common.pending')} ${t('common.integrity')}`}</span>
                               </div>
                           )}
                           {job.Verified_At && (
                               <p className="text-xs font-bold font-black text-muted-foreground uppercase tracking-widest truncate w-28 text-center">
                                   {t('history.agent')} {job.Verified_By?.split('@')[0]}
                               </p>
                           )}
                        </div>
                      </td>
                      <td className="py-8 px-4">
                        <div className="flex items-center justify-center gap-3">
                             {job.Photo_Proof_Url ? (
                                <div className="relative w-12 h-12 rounded-xl border border-border/10 shadow-2xl overflow-hidden bg-muted/50 group/img ring-4 ring-primary/0 hover:ring-primary/40 transition-all duration-500 scale-95 hover:scale-100">
                                    <NextImage 
                                        src={job.Photo_Proof_Url.split(',')[0]} 
                                        alt="POD Photo" 
                                        fill 
                                        className="object-cover group-hover/img:scale-125 transition-transform duration-1000" 
                                    />
                                    <a href={job.Photo_Proof_Url.split(',')[0]} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-primary/40 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <Eye size={16} className="text-foreground" />
                                    </a>
                                </div>
                             ) : (
                                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border/5 flex items-center justify-center text-muted-foreground transition-colors group-hover/row:border-primary/20">
                                    <ImageIcon size={16} strokeWidth={1.5} />
                                </div>
                             )}
                             {job.Signature_Url ? (
                                <div className="relative w-16 h-12 rounded-xl border border-border/10 shadow-2xl overflow-hidden bg-muted/80 p-2 group/sig ring-4 ring-accent/0 hover:ring-accent/40 transition-all duration-500 scale-95 hover:scale-100">
                                    <NextImage 
                                        src={job.Signature_Url} 
                                        alt="Signature" 
                                        fill 
                                        className="object-contain p-2 group-hover/sig:scale-110 transition-transform duration-700 invert group-hover/sig:invert-0" 
                                    />
                                    <a href={job.Signature_Url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-accent/40 opacity-0 group-hover/sig:opacity-100 transition-opacity" />
                                </div>
                             ) : (
                                <div className="w-16 h-12 rounded-xl border-2 border-dashed border-border/5 transition-colors group-hover/row:border-accent/20" />
                             )}
                        </div>
                      </td>
                      {canViewPrice && (
                        <td className="py-8 px-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                                    <span className="text-foreground font-black text-sm tracking-tighter">
                                        {typeof job.Price_Cust_Total === 'number' 
                                            ? job.Price_Cust_Total.toLocaleString() 
                                            : (Number(job.Price_Cust_Total) || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-bold font-black text-primary tracking-[0.2em] uppercase">{t('financial.credit') || 'CREDIT'}</span>
                                </div>
                                <div className="pr-2 flex items-center gap-2">
                                    <span className="text-[10px] font-black text-muted-foreground tracking-tighter">
                                        {typeof job.Cost_Driver_Total === 'number' 
                                            ? job.Cost_Driver_Total.toLocaleString() 
                                            : (Number(job.Cost_Driver_Total) || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('financial.debit') || 'DEBIT'}</span>
                                </div>
                            </div>
                        </td>
                      )}
                      <td className="py-8 px-4">
                        <span className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold font-black uppercase tracking-widest border shadow-xl transition-all duration-500 group-hover/row:scale-105",
                            statusConfig[job.Job_Status]?.color || 'bg-muted/50 text-muted-foreground border-border/10'
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_10px_currentColor]" />
                          {statusConfig[job.Job_Status]?.label || job.Job_Status}
                        </span>
                      </td>
                      <td className="py-8 px-6 text-right">
                          {!customerMode && (
                              <div className="flex justify-end transition-all duration-500">
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
          
          <div className="p-12 border-t border-border/5 bg-muted/30">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
      </div>
    </>
  )
}

