export const dynamic = 'force-dynamic'
export const revalidate = 0

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumButton } from "@/components/ui/premium-button"
import { PremiumCard } from "@/components/ui/premium-card"
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
  TrendingUp,
  Image as ImageIcon
} from "lucide-react"
import { getAllJobs } from "@/lib/supabase/jobs"
import { getJobCreationData } from "@/app/planning/actions"
import { ExcelExport } from "@/components/ui/excel-export"
import { JobHistoryActions } from "@/components/jobs/job-history-actions"
import { HistoryStatusFilter } from "@/components/jobs/history-status-filter"
import { CustomerCancelButton } from "@/components/jobs/customer-cancel-button"
import NextImage from "next/image"
import { cn } from "@/lib/utils"

import { isCustomer, hasPermission } from "@/lib/permissions"
import { Badge } from "@/components/ui/badge"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function JobHistoryPage(props: Props) {
  const customerMode = await isCustomer()
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const dateFrom = (searchParams.from as string) || ''
  const dateTo = (searchParams.to as string) || ''
  const status = (searchParams.status as string) || ''
  const limit = 25

  // Fetch jobs and creation data for dialog
  const [jobsResult, creationData, canViewPrice, canDelete, canExport] = await Promise.all([
    getAllJobs(page, limit, query, status, dateFrom, dateTo),
    getJobCreationData(),
    hasPermission('job_price_view'),
    hasPermission('job_delete'),
    hasPermission('job_export')
  ])

  const { data: jobs, count } = jobsResult
  const { drivers, vehicles, customers, routes } = creationData
  
  // Use jobs directly as they are already filtered
  const historyJobs = jobs

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    New: { label: "ใหม่", color: "text-emerald-500 bg-emerald-500/15", icon: <Package size={14} /> },
    Assigned: { label: "มอบหมายแล้ว", color: "text-emerald-600 bg-emerald-500/20", icon: <Truck size={14} /> },
    "Picked Up": { label: "รับแล้ว", color: "text-cyan-400 bg-cyan-500/20", icon: <Package size={14} /> },
    "In Transit": { label: "กำลังเดินทาง", color: "text-amber-400 bg-amber-500/20", icon: <Truck size={14} /> },
    Delivered: { label: "ส่งแล้ว", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Completed: { label: "เสร็จสิ้น", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Complete: { label: "เสร็จสิ้น", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Failed: { label: "ล้มเหลว", color: "text-red-400 bg-red-500/20", icon: <AlertCircle size={14} /> },
    Cancelled: { label: "ยกเลิก", color: "text-gray-500 bg-slate-500/20", icon: <AlertCircle size={14} /> },
  }

  return (
    <DashboardLayout>
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <History size={32} />
            </div>
            {customerMode ? "Archives" : "Job History"}
          </h1>
          <p className="text-emerald-400 font-bold ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">
            {customerMode ? "FLEET OPERATIONS RECORD" : "Operations Archive & Analytics Control"}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <Link href="/planning">
            <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900 transition-all">
              <ArrowLeft size={20} className="mr-2" />
              Return
            </PremiumButton>
          </Link>
          {canExport && (
            <ExcelExport 
               data={historyJobs} 
               filename={`job_history_${new Date().toISOString().split('T')[0]}`}
               title="ประวัติงาน"
               trigger={
                 <PremiumButton variant="secondary" className="h-14 px-8 rounded-2xl">
                     <Download className="w-5 h-5 mr-2" /> Export Excel
                 </PremiumButton>
               }
            />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Volume", value: count || 0, icon: Package, color: "blue" },
          { label: "Successful", value: jobs?.filter(j => ['Delivered', 'Complete', 'Completed'].includes(j?.Job_Status || '')).length || 0, icon: CheckCircle2, color: "emerald" },
          { label: "Failed Ops", value: jobs?.filter(j => j?.Job_Status === 'Failed').length || 0, icon: AlertCircle, color: "red" },
          { label: "Cancelled", value: jobs?.filter(j => j?.Job_Status === 'Cancelled').length || 0, icon: XCircle, color: "slate" },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className="p-8 group border-none bg-white/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className={cn(
                    "p-4 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 text-white",
                    stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                    stat.color === 'red' ? "bg-red-500 shadow-red-500/20" :
                    stat.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" : "bg-slate-500 shadow-slate-500/20"
                )}>
                    <stat.icon size={24} />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/5 rounded-full border border-black/5">
                    <TrendingUp size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">HISTORICAL</span>
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{stat.value}</p>
            </div>
            {/* High-end numeric glow */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 text-7xl font-black text-slate-100/50 pointer-events-none select-none">
                0{idx + 1}
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Filters & Results Container */}
      <PremiumCard className="overflow-hidden border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 bg-white rounded-br-[5rem] rounded-tl-[3rem]">
          {/* Filter Header */}
          <div className="p-10 border-b border-slate-50 bg-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                    <ListFilter size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Advanced Filtering</h2>
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Tactical Operations Search</p>
                </div>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5">
                    <SearchInput placeholder="ค้นหา Job ID, ลูกค้า, เส้นทาง..." />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Start Date</Label>
                    <Input
                        type="date"
                        defaultValue={dateFrom}
                        name="from"
                        className="h-14 bg-white border-gray-100 text-gray-900 font-bold rounded-2xl shadow-sm focus:ring-primary/20 transition-all px-6"
                    />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">End Date</Label>
                    <Input
                        type="date"
                        defaultValue={dateTo}
                        name="to"
                        className="h-14 bg-white border-gray-100 text-gray-900 font-bold rounded-2xl shadow-sm focus:ring-primary/20 transition-all px-6"
                    />
                </div>
                <div className="md:col-span-3 space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Process Status</Label>
                    <HistoryStatusFilter initialValue={status} />
                </div>
                <button type="submit" className="hidden" /> 
            </form>
          </div>
          {/* Jobs List Header */}
          <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
                <div className="w-2 h-10 bg-emerald-500 rounded-full" />
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Operations Log</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">ARCHIVED RECORDS Feed • {count} total entries</p>
                </div>
            </div>
          </div>

          {historyJobs.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
                <Package className="w-12 h-12 text-gray-300" />
              </div>
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">ไม่พบประวัติงานในระบบ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/30">
                    <th className="text-left py-6 px-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Job Details</th>
                    <th className="text-left py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Route & Location</th>
                    <th className="text-left py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Resource</th>
                    <th className="text-center py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Audit & Verify</th>
                    <th className="text-center py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Proof</th>
                    {canViewPrice && <th className="text-right py-6 px-4 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Finance</th>}
                    <th className="text-left py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="text-right py-6 px-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historyJobs.map((job) => (
                    <tr 
                      key={job.Job_ID} 
                      className="group transition-all duration-300 hover:bg-emerald-500/[0.02]"
                    >
                      <td className="py-8 px-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-inner">
                                <Package size={20} />
                            </div>
                            <div>
                                <p className="text-gray-900 font-black text-lg tracking-tighter group-hover:text-emerald-600 transition-colors">{job.Job_ID}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock size={12} className="text-gray-300" />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{job.Plan_Date || "-"}</p>
                                </div>
                            </div>
                        </div>
                      </td>
                      <td className="py-8 px-4">
                         <div className="flex flex-col gap-1.5">
                            <p className="text-gray-900 font-black text-sm tracking-tight">{job.Customer_Name || "-"}</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <MapPin size={12} className="text-emerald-500" />
                                <span className="line-clamp-1">{job.Route_Name || `${job.Origin_Location || "-"} → ${job.Dest_Location || "-"}`}</span>
                            </div>
                         </div>
                      </td>
                      <td className="py-8 px-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                    <Truck size={14} />
                                </div>
                                <p className="text-gray-700 font-bold text-sm tracking-tight">{job.Vehicle_Plate || "-"}</p>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] pl-1">{job.Driver_Name || "-"}</p>
                        </div>
                      </td>
                      <td className="py-8 px-4">
                        <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                           {job.Verification_Status ? (
                               <Badge className={cn(
                                   "rounded-full px-3 py-1 font-black text-[9px] border-none shadow-sm",
                                   job.Verification_Status === 'Verified' ? "bg-emerald-500 text-white" :
                                   job.Verification_Status === 'Rejected' ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                               )}>
                                   {job.Verification_Status}
                               </Badge>
                           ) : (
                               <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] italic">Waiting</span>
                           )}
                           {job.Verified_At && (
                               <p className="text-[8px] font-bold text-gray-400 truncate w-32 text-center">
                                   By {job.Verified_By?.split('@')[0]}
                               </p>
                           )}
                        </div>
                      </td>
                      <td className="py-8 px-4">
                        <div className="flex items-center justify-center gap-3">
                             {job.Photo_Proof_Url ? (
                                <div className="relative w-12 h-12 rounded-2xl border-2 border-white shadow-xl overflow-hidden bg-gray-100 group/img ring-4 ring-emerald-500/0 hover:ring-emerald-500/20 transition-all">
                                    <NextImage 
                                        src={job.Photo_Proof_Url.split(',')[0]} 
                                        alt="POD Photo" 
                                        fill 
                                        className="object-cover group-hover/img:scale-125 transition-transform duration-700" 
                                    />
                                    <a href={job.Photo_Proof_Url.split(',')[0]} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <ImageIcon size={16} className="text-white" />
                                    </a>
                                </div>
                             ) : (
                                <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center text-gray-200">
                                    <ImageIcon size={16} />
                                </div>
                             )}
                             {job.Signature_Url ? (
                                <div className="relative w-16 h-12 rounded-2xl border-2 border-white shadow-xl overflow-hidden bg-white p-2 group/sig ring-4 ring-blue-500/0 hover:ring-blue-500/20 transition-all">
                                    <NextImage 
                                        src={job.Signature_Url} 
                                        alt="Signature" 
                                        fill 
                                        className="object-contain p-2 group-hover/sig:scale-110 transition-transform duration-500" 
                                    />
                                    <a href={job.Signature_Url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 group-hover/sig:opacity-100 transition-opacity" />
                                </div>
                             ) : (
                                <div className="w-16 h-12 rounded-2xl border-2 border-dashed border-gray-100" />
                             )}
                        </div>
                      </td>
                      {canViewPrice && (
                        <td className="py-8 px-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-xl">
                                    <span className="text-[10px] font-black text-emerald-600 tracking-[0.2em] uppercase">CREDIT</span>
                                    <span className="text-emerald-700 font-black text-sm tracking-tight transition-all">
                                        {typeof job.Price_Cust_Total === 'number' 
                                            ? job.Price_Cust_Total.toLocaleString() 
                                            : (Number(job.Price_Cust_Total) || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="pr-3">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic pr-1">DEBIT</span>
                                    <span className="text-[11px] font-black text-gray-400 tracking-tight">
                                        {typeof job.Cost_Driver_Total === 'number' 
                                            ? job.Cost_Driver_Total.toLocaleString() 
                                            : (Number(job.Cost_Driver_Total) || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </td>
                      )}
                      <td className="py-8 px-4">
                        <span className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all duration-500",
                            statusConfig[job.Job_Status]?.color.includes('emerald') ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/5' :
                            statusConfig[job.Job_Status]?.color.includes('amber') ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/5' :
                            statusConfig[job.Job_Status]?.color.includes('red') ? 'bg-red-500/10 text-red-600 border-red-500/20 shadow-red-500/5' :
                            'bg-gray-100 text-gray-500 border-gray-200'
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          {statusConfig[job.Job_Status]?.label || job.Job_Status}
                        </span>
                      </td>
                      <td className="py-8 px-10 text-right">
                          {!customerMode && (
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
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
          
          <div className="p-10 border-t border-gray-50 bg-gray-50/10">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
      </PremiumCard>
    </DashboardLayout>
  )
}
