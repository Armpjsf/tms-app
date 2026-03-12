import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Input } from "@/components/ui/input"
import { DataSection } from "@/components/ui/data-section"
import { 
  Wrench, 
  Plus,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle2,
  Loader2,
  TrendingUp
} from "lucide-react"
import { getAllRepairTickets, getRepairTicketStats } from "@/lib/supabase/maintenance"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { MaintenanceDialog } from "@/components/maintenance/maintenance-dialog"
import { MaintenanceActions } from "@/components/maintenance/maintenance-actions"
import { getMaintenanceSchedule } from "@/lib/supabase/maintenance-schedule"
import { MaintenanceScheduleDashboard } from "@/components/maintenance/maintenance-schedule-dashboard"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"
import Image from "next/image"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MaintenancePage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 20
  
  const startDate = (searchParams.startDate as string) || ''
  const endDate = (searchParams.endDate as string) || ''
  const status = (searchParams.status as string) || ''

  const [{ data: tickets, count }, stats, drivers, vehicles, schedule] = await Promise.all([
    getAllRepairTickets(page, limit, query, startDate, endDate, status),
    getRepairTicketStats(),
    getAllDrivers(),
    getAllVehicles(),
    getMaintenanceSchedule(),
  ])



  return (
    <DashboardLayout>
      {/* Bespoke Elite Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-2xl shadow-amber-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <Wrench size={32} />
            </div>
            Maintenance HUB
          </h1>
          <p className="text-amber-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Fleet Integrity & Technical Operations Command</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <MaintenanceDialog 
              drivers={drivers.data}
              vehicles={vehicles.data}
              trigger={
                  <PremiumButton className="h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20">
                      <Plus size={24} className="mr-2" />
                      Issue Ticket
                  </PremiumButton>
              }
          />
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Request Log", value: stats.total, icon: Wrench, color: "amber" },
          { label: "Pending Approval", value: stats.pending, icon: AlertTriangle, color: "red" },
          { label: "Active Maintenance", value: stats.inProgress, icon: Loader2, color: "blue" },
          { label: "Service Complete", value: stats.completed, icon: CheckCircle2, color: "emerald" },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className="p-8 group border-none bg-white/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className={cn(
                    "p-4 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 text-white",
                    stat.color === 'amber' ? "bg-amber-500 shadow-amber-500/20" :
                    stat.color === 'red' ? "bg-red-500 shadow-red-500/20" :
                    stat.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" : "bg-emerald-500 shadow-emerald-500/20"
                )}>
                    <stat.icon size={24} className={stat.icon === Loader2 ? 'animate-spin' : ''} />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/5 rounded-full border border-black/5">
                    <TrendingUp size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">REALTIME</span>
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

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1">
            <SearchInput placeholder="Search Ticket ID, Plate Number..." />
        </div>
        <div className="flex gap-2 flex-wrap relative z-20">
            <form className="flex gap-2 items-center flex-wrap">
                <Input 
                    type="date" 
                    name="startDate"
                    defaultValue={startDate}
                    className="h-14 bg-white/80 border-slate-200 text-slate-900 w-auto rounded-2xl shadow-sm px-6 font-bold"
                />
                <span className="text-slate-400 font-black">—</span>
                <Input 
                    type="date" 
                    name="endDate"
                    defaultValue={endDate}
                    className="h-14 bg-white/80 border-slate-200 text-slate-900 w-auto rounded-2xl shadow-sm px-6 font-bold"
                />
                <select 
                    name="status" 
                    defaultValue={status}
                    className="h-14 rounded-2xl border border-slate-200 bg-white/80 px-6 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                >
                    <option value="">ALL STATUS</option>
                    <option value="Pending">PENDING</option>
                    <option value="In Progress">ACTIVE</option>
                    <option value="Completed">COMPLETE</option>
                </select>
                <PremiumButton type="submit" variant="secondary" className="h-14 px-8 rounded-2xl">
                    <Filter size={20} className="mr-2" />
                    Filter
                </PremiumButton>
            </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-slate-950/5 rounded-br-[5rem] rounded-tl-[3rem] border border-dashed border-slate-200">
             <Wrench className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">ไม่พบรายการแจ้งซ่อมในระบบ</p>
          </div>
        ) : tickets.map((ticket) => (
          <PremiumCard key={ticket.Ticket_ID} className="p-0 overflow-hidden group border-none bg-white rounded-br-[4rem] rounded-tl-[2rem] shadow-2xl relative">
            <div className="absolute top-4 right-4 opacity-100 z-20 bg-slate-950/10 rounded-full backdrop-blur-md border border-white/50 shadow-sm">
                 <MaintenanceActions 
                    ticket={ticket} 
                    drivers={drivers.data || []} 
                    vehicles={vehicles.data || []} 
                 />
            </div>
            
            <div className="p-10">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-500 ${
                    ticket.Priority === 'High' ? 'bg-red-500 shadow-red-500/20 text-white' : 'bg-slate-950 shadow-slate-950/20 text-white'
                  }`}>
                    {ticket.Priority === 'High' ? <AlertTriangle size={28} /> : <Wrench size={28} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{ticket.Vehicle_Plate}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 font-mono tracking-widest uppercase italic">CONTROL ID: {ticket.Ticket_ID}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{ticket.Issue_Type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500 shadow-sm ${
                        ticket.Status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/5' :
                        ticket.Status === 'In Progress' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-blue-500/5' :
                        ticket.Status === 'Rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20 shadow-red-500/5' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/5'
                    }`}>
                    {ticket.Status === 'Rejected' ? 'REJECTED' : ticket.Status?.toUpperCase()}
                    </span>
                </div>
              </div>

              <div className="space-y-6">
                 {ticket.Photo_Url && (
                    <div className="relative w-full h-48 rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner group-hover:shadow-xl transition-all duration-500">
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
                            className="object-cover transform group-hover:scale-110 transition-transform duration-700"
                        />
                    </div>
                 )}
                 <div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                        <span className="absolute -top-1 -left-1 text-4xl text-slate-100 font-serif leading-none select-none">“</span>
                        {ticket.Description}
                    </p>
                 </div>

                 <div className="flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-lg">
                        <Clock size={12} className="text-slate-500" />
                      </div>
                      <span className="font-black uppercase tracking-widest text-[10px]">{ticket.Date_Report ? new Date(ticket.Date_Report).toLocaleDateString('th-TH') : "-"}</span>
                    </div>
                    {ticket.Cost_Total && ticket.Cost_Total > 0 ? (
                        <div className="bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/20">
                            <span className="text-emerald-600 font-black text-lg tracking-tighter">฿{ticket.Cost_Total.toLocaleString()}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 font-black text-slate-300 uppercase tracking-widest text-[10px]">
                            Operational Expense TBD
                        </div>
                    )}
                 </div>
              </div>
            </div>
          </PremiumCard>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />

      {/* Maintenance Schedule Dashboard */}
      <div className="mt-8">
        <DataSection title="กำหนดการซ่อมบำรุง" icon={<Clock size={18} />}>
          <MaintenanceScheduleDashboard schedule={schedule} />
        </DataSection>
      </div>
    </DashboardLayout>
  )
}
