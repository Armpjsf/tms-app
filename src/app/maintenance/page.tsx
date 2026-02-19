import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Wrench, 
  Plus,
  AlertTriangle,
  Clock,
  Filter
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Wrench className="text-amber-400" />
            แจ้งซ่อมบำรุง
          </h1>
          <p className="text-slate-400">รายการแจ้งซ่อมและประวัติการบำรุงรักษา</p>
        </div>
        <MaintenanceDialog 
            drivers={drivers.data}
            vehicles={vehicles.data}
            trigger={
                <Button size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    <Plus size={20} />
                    แจ้งซ่อม
                </Button>
            }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.total}</p>
          <p className="text-xs text-slate-400">รายการทั้งหมด</p>
        </div>
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20">
          <p className="text-2xl font-bold text-red-400">{stats.pending}</p>
          <p className="text-xs text-slate-400">รอดำเนินการ</p>
        </div>
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
          <p className="text-xs text-slate-400">กำลังซ่อม</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
          <p className="text-xs text-slate-400">เสร็จสิ้น</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
            <SearchInput placeholder="ค้นหา Ticket ID, ทะเบียนรถ..." />
        </div>
        <div className="flex gap-2 flex-wrap">
            <form className="flex gap-2 items-center flex-wrap">
                <Input 
                    type="date" 
                    name="startDate"
                    defaultValue={startDate}
                    className="bg-slate-900 border-slate-700 text-white w-auto"
                />
                <span className="text-slate-500">-</span>
                <Input 
                    type="date" 
                    name="endDate"
                    defaultValue={endDate}
                    className="bg-slate-900 border-slate-700 text-white w-auto"
                />
                <select 
                    name="status" 
                    defaultValue={status}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                    <option value="">ทุกสถานะ</option>
                    <option value="Pending">รอดำเนินการ</option>
                    <option value="In Progress">กำลังซ่อม</option>
                    <option value="Completed">เสร็จสิ้น</option>
                </select>
                <Button type="submit" variant="secondary" className="gap-2">
                    <Filter size={16} />
                    กรอง
                </Button>
            </form>
        </div>
      </div>

      {/* Ticket Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            ไม่พบรายการแจ้งซ่อม
          </div>
        ) : tickets.map((ticket) => (
          <Card key={ticket.Ticket_ID} variant="glass" hover={true} className="relative group">
            <div className="absolute top-2 right-2 opacity-100 z-10 bg-slate-900/50 rounded-full backdrop-blur-sm">
                 <MaintenanceActions 
                    ticket={ticket} 
                    drivers={drivers.data || []} 
                    vehicles={vehicles.data || []} 
                 />
            </div>
            
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    ticket.Priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {ticket.Priority === 'High' ? <AlertTriangle size={24} /> : <Wrench size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white uppercase">{ticket.Vehicle_Plate}</h3>
                    <p className="text-xs text-slate-400">#{ticket.Ticket_ID}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-1 mr-8 ${
                  ticket.Status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  ticket.Status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' :
                  ticket.Status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {ticket.Status === 'Rejected' ? 'ไม่อนุมัติ' : ticket.Status}
                </span>
              </div>

              <div className="mb-4 space-y-2">
                 {ticket.Photo_Url && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/5 mb-2">
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
                            className="object-cover"
                        />
                    </div>
                 )}
                <div>
                    <p className="text-sm text-white font-medium mb-1">{ticket.Issue_Type}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{ticket.Issue_Desc}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-white/10">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{ticket.Date_Report ? new Date(ticket.Date_Report).toLocaleDateString('th-TH') : "-"}</span>
                </div>
                {ticket.Cost_Total && ticket.Cost_Total > 0 ? (
                    <div className="text-emerald-400 font-bold">
                        ฿{ticket.Cost_Total.toLocaleString()}
                    </div>
                ) : (
                    <div className="flex items-center gap-1 font-medium">
                        {ticket.Priority}
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />

      {/* Maintenance Schedule Dashboard */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="text-cyan-400" size={20} />
          กำหนดการซ่อมบำรุง
        </h2>
        <MaintenanceScheduleDashboard schedule={schedule} />
      </div>
    </DashboardLayout>
  )
}
