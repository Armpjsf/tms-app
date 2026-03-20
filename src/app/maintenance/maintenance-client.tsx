"use client"

import { 
  Wrench, 
  Plus,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldAlert,
  Zap
} from "lucide-react"
import { MaintenanceDialog } from "@/components/maintenance/maintenance-dialog"
import { MaintenanceActions } from "@/components/maintenance/maintenance-actions"
import { MaintenanceScheduleDashboard } from "@/components/maintenance/maintenance-schedule-dashboard"
import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { motion } from "framer-motion"

export function MaintenanceClient({ 
  tickets, 
  count, 
  stats, 
  drivers, 
  vehicles, 
  schedule, 
  limit,
  startDate,
  endDate,
  status
}: any) {
  return (
    <div className="space-y-12 pb-20">
      {/* Tactical Maintenance Header */}
      <div className="bg-[#0a0518] p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div>
            <div className="flex items-center gap-6 mb-4">
               <div className="p-4 bg-amber-500/20 rounded-[2rem] border-2 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2)] text-amber-500 group-hover:scale-110 transition-all duration-500">
                  <Wrench size={40} strokeWidth={2.5} />
               </div>
               <div>
                  <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none mb-2 italic">Integrity Hub</h1>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.6em] opacity-80 italic italic">Fleet Technical Readiness & Repair Protocol // Maint_V2</p>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <MaintenanceDialog 
                drivers={drivers}
                vehicles={vehicles}
                trigger={
                    <PremiumButton className="h-16 px-10 rounded-2xl shadow-[0_15px_30px_rgba(245,158,11,0.2)] gap-3 bg-amber-600 hover:bg-amber-500 text-white font-black italic tracking-widest">
                        <Plus size={24} strokeWidth={3} />
                        ISSUE TICKET
                    </PremiumButton>
                }
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Total Request Log", value: stats.total, icon: Wrench, color: "amber" },
          { label: "Pending Approval", value: stats.pending, icon: AlertTriangle, color: "rose" },
          { label: "Active Maintenance", value: stats.inProgress, icon: Loader2, color: "blue" },
          { label: "Service Complete", value: stats.completed, icon: CheckCircle2, color: "emerald" },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className="bg-[#0a0518] border-2 border-white/5 p-8 relative overflow-hidden group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-8">
                <div className={cn(
                    "p-4 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                    stat.color === 'amber' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-amber-500/10" :
                    stat.color === 'rose' ? "bg-rose-500/20 text-rose-500 border border-rose-500/30 shadow-rose-500/10" :
                    stat.color === 'blue' ? "bg-blue-500/20 text-blue-500 border border-blue-500/30 shadow-blue-500/10" : 
                    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10"
                )}>
                    <stat.icon size={28} className={stat.icon === Loader2 ? 'animate-spin' : ''} />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <Activity size={14} className="text-slate-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Node Status</span>
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em] mb-2 mb-2">{stat.label}</p>
                <div className="flex items-end gap-3">
                   <p className="text-5xl font-black text-white italic tracking-tighter leading-none">{stat.value}</p>
                   <span className="text-[10px] font-black text-slate-700 uppercase mb-1">Items</span>
                </div>
            </div>
            <div className="absolute -right-6 -bottom-6 text-8xl font-black text-white/[0.02] pointer-events-none italic select-none">
                0{idx + 1}
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Signal Filtering Matrix */}
      <div className="space-y-8 bg-[#0a0518] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-6 mb-2">
            <div className="p-3 bg-white/5 rounded-2xl text-slate-500">
                <Filter size={20} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] italic leading-none">Maintenance Filter HUB</h3>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1">
              <SearchInput 
                placeholder="Ticket ID, Plate Number, Issue Tag..." 
                className="h-16 bg-black/60 border-white/5 rounded-2xl text-white font-black"
              />
          </div>
          <form className="flex flex-wrap lg:flex-nowrap gap-4 items-center">
              <div className="flex items-center gap-4 bg-black/60 border border-white/5 p-2 rounded-2xl">
                <Input 
                    type="date" 
                    name="startDate"
                    defaultValue={startDate}
                    className="h-12 bg-transparent border-none text-white focus:ring-0 uppercase font-black text-xs"
                />
                <ArrowRight size={16} className="text-slate-700" />
                <Input 
                    type="date" 
                    name="endDate"
                    defaultValue={endDate}
                    className="h-12 bg-transparent border-none text-white focus:ring-0 uppercase font-black text-xs"
                />
              </div>
              <select 
                  name="status" 
                  defaultValue={status}
                  className="h-16 min-w-[180px] rounded-2xl border border-white/5 bg-black/60 px-6 text-xs font-black text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xl"
              >
                  <option value="">ALL STATUS</option>
                  <option value="Pending">PENDING</option>
                  <option value="In Progress">ACTIVE</option>
                  <option value="Completed">COMPLETE</option>
              </select>
              <PremiumButton type="submit" variant="secondary" className="h-16 px-10 rounded-2xl border-white/5 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest italic">
                  REFRESH REGISTRY
              </PremiumButton>
          </form>
        </div>
      </div>

      {/* Ticket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tickets.length === 0 ? (
          <div className="col-span-full text-center py-32 bg-[#0a0518]/50 rounded-[4rem] border-2 border-dashed border-white/5">
             <ShieldAlert className="w-20 h-20 text-white/5 mx-auto mb-6 animate-pulse" />
             <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">No active technical issues detected in the sector</p>
          </div>
        ) : tickets.map((ticket: any) => (
          <PremiumCard key={ticket.Ticket_ID} className="bg-[#0a0518] p-0 overflow-hidden group border-2 border-white/5 rounded-br-[4rem] rounded-tl-[2rem] shadow-3xl relative hover:border-amber-500/30 transition-all duration-500">
            <div className="absolute top-6 right-6 z-20">
                 <MaintenanceActions 
                    ticket={ticket} 
                    drivers={drivers} 
                    vehicles={vehicles} 
                 />
            </div>
            
            <div className="p-10 space-y-8">
              <div className="flex items-start gap-6">
                <div className={cn(
                  "w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-700 border-2",
                  ticket.Priority === 'High' ? 'bg-rose-500/20 border-rose-500/30 text-rose-500 shadow-rose-500/10' : 'bg-white/5 border-white/10 text-white'
                )}>
                  {ticket.Priority === 'High' ? <AlertTriangle size={36} className="animate-pulse" /> : <Wrench size={36} />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-white italic tracking-widest uppercase leading-none">{ticket.Vehicle_Plate || "VOID_ID"}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[9px] font-black text-slate-500 font-mono tracking-widest uppercase italic bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">OP_ID: {ticket.Ticket_ID}</span>
                      <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/10">{ticket.Issue_Type}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Technical Status</span>
                 </div>
                 <span className={cn(
                    "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500 shadow-2xl",
                    ticket.Status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' :
                    ticket.Status === 'In Progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/10' :
                    ticket.Status === 'Rejected' ? 'bg-rose-500/20 text-rose-500 border-rose-500/30 shadow-rose-500/10' :
                    'bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-amber-500/10'
                 )}>
                    {ticket.Status?.toUpperCase() || "PENDING"}
                 </span>
              </div>

              <div className="space-y-6">
                 {ticket.Photo_Url && (
                    <div className="relative w-full h-56 rounded-[2.5rem] overflow-hidden border-2 border-white/10 bg-black/40 shadow-inner group-hover:border-primary/40 transition-all duration-700">
                        <Image 
                            src={(() => {
                                try {
                                    if (ticket.Photo_Url.startsWith('[') && ticket.Photo_Url.endsWith(']')) {
                                        const parsed = JSON.parse(ticket.Photo_Url)
                                        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : ticket.Photo_Url
                                    }
                                    return ticket.Photo_Url
                                } catch {
                                    return ticket.Photo_Url
                                }
                            })()}
                            alt="Issue Photo" 
                            fill 
                            className="object-cover transform group-hover:scale-110 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                 )}
                 <div className="relative">
                    <p className="text-sm text-slate-400 font-black italic uppercase leading-relaxed bg-white/5 p-8 rounded-[2.5rem] border-2 border-white/5 relative overflow-hidden group-hover:bg-white/10 transition-all duration-500 min-h-[120px]">
                        <span className="absolute -top-3 -left-2 text-6xl text-white/5 font-black leading-none select-none tracking-tighter italic">ISSUE</span>
                        <span className="relative z-10">{ticket.Description || "NO_DESCRIPTION_PROVIDED_BY_OPERATOR"}</span>
                    </p>
                 </div>

                 <div className="flex items-center justify-between text-xs pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                         <Clock size={16} className="text-slate-500" />
                       </div>
                       <span className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">{ticket.Date_Report ? new Date(ticket.Date_Report).toLocaleDateString('th-TH') : "VOID_DATE"}</span>
                    </div>
                    {ticket.Cost_Total && ticket.Cost_Total > 0 ? (
                        <div className="bg-emerald-500/10 px-5 py-3 rounded-2xl border-2 border-emerald-500/20 shadow-xl group-hover:scale-110 transition-transform">
                            <span className="text-emerald-400 font-black text-2xl tracking-tighter italic leading-none">฿{ticket.Cost_Total.toLocaleString()}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 font-black text-slate-800 uppercase tracking-[0.4em] text-[9px] italic">
                           Fiscal Variable TBD
                        </div>
                    )}
                 </div>
              </div>
            </div>
          </PremiumCard>
        ))}
      </div>
      
      <div className="flex justify-center pt-8">
         <Pagination totalItems={count || 0} limit={limit} />
      </div>

      {/* Technical Workflow Dashboard */}
      <section className="mt-12 space-y-8">
         <div className="flex items-center gap-6 group/h">
            <div className="p-4 bg-primary/20 rounded-[1.5rem] text-primary border-2 border-primary/30 shadow-[0_0_30px_rgba(255,30,133,0.2)] group-hover/h:scale-110 transition-transform">
                <Zap size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-[0.2em] uppercase italic">Workflow Pulse</h2>
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.6em] opacity-60">Technical Execution & Scheduling Matrix</p>
            </div>
         </div>
         <MaintenanceScheduleDashboard schedule={schedule} />
      </section>

      {/* Tactical Footer */}
      <div className="p-16 bg-[#0a0518] rounded-[6rem] border-2 border-white/5 flex flex-col items-center text-center space-y-6 mt-20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
          <div className="p-5 bg-amber-500/20 rounded-[2rem] shadow-[0_0_40px_rgba(245,158,11,0.2)] border-2 border-amber-500/30 group-hover:scale-110 transition-all duration-700">
              <Wrench size={32} className="text-amber-500" />
          </div>
          <div className="space-y-3">
              <h4 className="text-xl font-black text-white uppercase tracking-[0.4em] italic">LogisPro Readiness Engine</h4>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] max-w-2xl leading-relaxed">
                  Total Asset Integrity synchronized with global maintenance scheduling. <br />
                  Operational capability verified. Technical drift corrected.
              </p>
          </div>
          <div className="px-5 py-2 bg-white/5 rounded-full border border-white/10 flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">SYSTEM_INTEGRITY_INDEX: 0.988</span>
          </div>
      </div>
    </div>
  )
}
