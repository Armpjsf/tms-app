import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Wrench, 
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { getAllRepairTickets, getRepairTicketStats } from "@/lib/supabase/maintenance"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { MaintenanceDialog } from "@/components/maintenance/maintenance-dialog"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MaintenancePage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 20

  const [{ data: tickets, count }, stats, drivers, vehicles] = await Promise.all([
    getAllRepairTickets(page, limit, query),
    getRepairTicketStats(),
    getAllDrivers(),
    getAllVehicles(),
  ])

  const priorityColors: Record<string, string> = {
    High: "text-red-400",
    Medium: "text-amber-400",
    Low: "text-blue-400",
  }

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

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหา Ticket ID, ทะเบียนรถ..." />
      </div>

      {/* Ticket Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            ไม่พบรายการแจ้งซ่อม
          </div>
        ) : tickets.map((ticket) => (
          <Card key={ticket.Ticket_ID} variant="glass" hover={true}>
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
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  ticket.Status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  ticket.Status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {ticket.Status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-white font-medium mb-1">{ticket.Issue_Type}</p>
                <p className="text-xs text-slate-400 line-clamp-2">{ticket.Issue_Desc}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-white/10">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{ticket.Date_Report ? new Date(ticket.Date_Report).toLocaleDateString('th-TH') : "-"}</span>
                </div>
                <div className="flex items-center gap-1 font-medium">
                  Priority: <span className={priorityColors[ticket.Priority || 'Medium']}>{ticket.Priority}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />
    </DashboardLayout>
  )
}
