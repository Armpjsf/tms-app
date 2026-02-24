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
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Wrench className="text-amber-500" />
            แจ้งซ่อมบำรุง
          </h1>
          <p className="text-muted-foreground">รายการแจ้งซ่อมและประวัติการบำรุงรักษา</p>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20 shadow-sm">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.total}</p>
          <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
        </div>
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 shadow-sm">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">รอดำเนินการ</p>
        </div>
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20 shadow-sm">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p>
          <p className="text-xs text-muted-foreground">กำลังซ่อม</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">เสร็จสิ้น</p>
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
                    className="bg-card border-border text-foreground w-auto"
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                    type="date" 
                    name="endDate"
                    defaultValue={endDate}
                    className="bg-card border-border text-foreground w-auto"
                />
                <select 
                    name="status" 
                    defaultValue={status}
                    className="h-10 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            ไม่พบรายการแจ้งซ่อม
          </div>
        ) : tickets.map((ticket) => (
          <Card key={ticket.Ticket_ID} className="bg-card border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md relative group">
            <div className="absolute top-2 right-2 opacity-100 z-10 bg-background/50 rounded-full backdrop-blur-sm border border-border shadow-sm">
                 <MaintenanceActions 
                    ticket={ticket} 
                    drivers={drivers.data || []} 
                    vehicles={vehicles.data || []} 
                 />
            </div>
            
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                    ticket.Priority === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                  }`}>
                    {ticket.Priority === 'High' ? <AlertTriangle size={24} /> : <Wrench size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground uppercase">{ticket.Vehicle_Plate}</h3>
                    <p className="text-xs text-muted-foreground font-mono">#{ticket.Ticket_ID}</p>
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
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border mb-2 bg-muted/30">
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
                    <p className="text-sm text-foreground font-bold mb-1">{ticket.Issue_Type}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">{ticket.Description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-primary/70" />
                  <span>{ticket.Date_Report ? new Date(ticket.Date_Report).toLocaleDateString('th-TH') : "-"}</span>
                </div>
                {ticket.Cost_Total && ticket.Cost_Total > 0 ? (
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        ฿{ticket.Cost_Total.toLocaleString()}
                    </div>
                ) : (
                    <div className="flex items-center gap-1 font-bold text-primary/80">
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
          <Clock className="text-cyan-600 dark:text-cyan-400" size={20} />
          กำหนดการซ่อมบำรุง
        </h2>
        <MaintenanceScheduleDashboard schedule={schedule} />
      </div>
    </DashboardLayout>
  )
}
