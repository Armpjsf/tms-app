export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getDamageReports } from "@/lib/supabase/damage-reports"
import { AlertOctagon, ArrowLeft, User, CheckCircle2, XCircle, Clock, Truck, FileText, Search, ShieldAlert, TrendingUp } from "lucide-react"
import Link from "next/link"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  Pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'PENDING MONITOR', icon: Clock },
  Reviewing: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'ACTIVE REVIEW', icon: Search },
  Resolved: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'RESOLVED OPS', icon: CheckCircle2 },
  Rejected: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'REJECTED / VOID', icon: XCircle },
}

const CATEGORY_STYLES: Record<string, string> = {
  'อุบัติเหตุ': 'bg-red-50 text-red-600 border-red-200',
  'สินค้าชำรุด': 'bg-orange-50 text-orange-600 border-orange-200',
  'สินค้าสูญหาย': 'bg-purple-50 text-purple-600 border-purple-200',
  'อื่นๆ': 'bg-gray-50 text-gray-600 border-gray-200',
}

export default async function DamageReportsPage() {
  const rawReports = await getDamageReports()
  
  // Safe serialization: Map to plain objects and pick only needed fields
  const reports = rawReports.map(r => ({
    id: r.id,
    Job_ID: r.Job_ID,
    Status: r.Status || 'Pending',
    Reason_Category: r.Reason_Category || 'อื่นๆ',
    Description: r.Description,
    Created_At: r.Created_At,
    Incident_Date: r.Incident_Date,
    Driver_Name: r.Driver_Name,
    Driver_ID: r.Driver_ID,
    Vehicle_Plate: r.Vehicle_Plate
  }))

  const pendingCount = reports.filter(r => r.Status === 'Pending').length

  return (
    <DashboardLayout>
      <div className="space-y-10 p-10">
        {/* Bespoke Elite Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <Link href="/reports" className="flex items-center gap-2 text-rose-400 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em] w-fit">
                    <ArrowLeft className="w-4 h-4" /> Reports Center
                </Link>
                <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl shadow-2xl shadow-rose-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                        <AlertOctagon size={32} />
                    </div>
                    Damage INTELLIGENCE
                </h1>
                <p className="text-rose-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Asset integrity & Logistical incident control</p>
            </div>

            <div className="flex flex-wrap gap-4 relative z-10">
                <div className="flex items-center gap-3 px-6 py-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest italic">Safety Protocol Active</span>
                </div>
            </div>
        </div>

        {/* Summary */}
        {/* Critical Summary Notification */}
        {pendingCount > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 flex items-center justify-between gap-4 shadow-xl shadow-rose-500/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-6 relative z-10">
                 <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-500">
                      <ShieldAlert size={24} className="animate-pulse" />
                 </div>
                 <div>
                      <p className="text-xl font-black text-rose-600 tracking-tight">{pendingCount} CRITICAL INCIDENTS</p>
                      <p className="text-xs font-bold text-rose-400 uppercase tracking-[0.2em]">Priority reviews required for logistical continuity</p>
                 </div>
            </div>
            <PremiumButton variant="secondary" className="relative z-10 bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-lg shadow-rose-500/20">
                 Process Queue
            </PremiumButton>
          </div>
        )}

        <PremiumCard className="overflow-hidden border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 bg-white rounded-br-[5rem] rounded-tl-[3rem]">
          {/* List Header Section */}
          <div className="p-10 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-500/20">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight text-shadow">Incident Registry</h2>
                    <p className="text-rose-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Tactical feed of reported anomalies</p>
                </div>
            </div>

            <div className="relative z-10 w-full md:w-64">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Filter Entity / Log ID..." 
                className="w-full pl-10 pr-6 h-12 text-xs font-black uppercase tracking-widest border border-slate-800 bg-slate-900 text-white rounded-xl focus:outline-none focus:border-rose-500 transition-all placeholder:text-slate-600"
                autoComplete="off"
              />
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="p-24 text-center">
              <AlertOctagon size={64} strokeWidth={1} className="mx-auto mb-6 text-slate-200" />
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Clear skies detected in the logistical feed</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((report) => {
                const statusStyle = STATUS_STYLES[report.Status] || STATUS_STYLES.Pending
                const categoryStyle = CATEGORY_STYLES[report.Reason_Category] || 'bg-slate-50 text-slate-600 border-slate-200'
                const date = new Date(report.Created_At)

                return (
                  <div key={report.id} className="p-10 flex flex-col lg:flex-row gap-8 hover:bg-slate-50 transition-colors group/row relative overflow-hidden">
                    <div className="hidden lg:block absolute top-0 left-0 w-1.5 h-0 group-hover/row:h-full bg-rose-500 transition-all duration-500" />
                    
                    <div className="flex-shrink-0 flex items-start gap-3">
                         <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover/row:scale-110",
                             statusStyle.bg, statusStyle.text
                         )}>
                              <statusStyle.icon size={20} />
                         </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Link href={`/admin/jobs/${report.Job_ID}`} className="font-black text-rose-600 hover:text-rose-700 text-sm tracking-tight flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 transition-colors uppercase">
                          <FileText size={14} /> LOG ENTITY: {report.Job_ID}
                        </Link>
                        <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest", categoryStyle)}>
                          {report.Reason_Category}
                        </span>
                        <div className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", statusStyle.bg, statusStyle.text)}>
                          {statusStyle.label}
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                             <Clock size={12} className="text-slate-300" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               {date.toLocaleString('th-TH')}
                             </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                           <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover/row:bg-white transition-all">
                                <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg">
                                     <User size={14} />
                                </div>
                                <div className="flex flex-col">
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Reporting Agent</span>
                                     <span className="text-sm font-black text-slate-700 tracking-tighter uppercase">{report.Driver_Name || report.Driver_ID}</span>
                                </div>
                           </div>
                           <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover/row:bg-white transition-all">
                                <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg">
                                     <Truck size={14} />
                                </div>
                                <div className="flex flex-col">
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Registry Asset</span>
                                     <span className="text-sm font-black text-slate-700 tracking-tighter uppercase">{report.Vehicle_Plate || "FIELD LOG"}</span>
                                </div>
                           </div>
                      </div>

                      <div className="bg-slate-950/5 p-6 rounded-3xl border border-slate-100 relative group-hover/row:bg-white transition-all">
                           <div className="flex items-center gap-2 mb-3">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                     <FileText size={10} /> Transmission Details
                                </span>
                           </div>
                           <p className="text-sm font-bold text-slate-600 leading-relaxed italic border-l-4 border-rose-500/20 pl-4">
                                {report.Description || 'Registry transmission incomplete / No narrative provided.'}
                           </p>
                      </div>
                    </div>

                    <div className="flex lg:flex-col lg:items-end justify-between items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-10">
                         <div className="flex flex-col items-end">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Incident Timestamp</span>
                              <span className="text-xs font-black text-slate-700 tracking-tighter uppercase">{new Date(report.Incident_Date).toLocaleDateString('th-TH')}</span>
                         </div>
                         <PremiumButton variant="outline" size="sm" className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover/row:bg-rose-50 group-hover/row:text-rose-600 group-hover/row:border-rose-100 transition-all">
                              Strategic Review
                         </PremiumButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </PremiumCard>
      </div>
    </DashboardLayout>
  )
}
