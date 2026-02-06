import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  CalendarDays, 
  Plus,
  Truck,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { getAllJobs, getTodayJobStats } from "@/lib/supabase/jobs"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { JobDialog } from "@/components/planning/job-dialog"
import { JobActions } from "@/components/planning/job-actions"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PlanningPage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 20

  const [{ data: jobs, count }, stats, drivers, vehicles] = await Promise.all([
    getAllJobs(page, limit, query),
    getTodayJobStats(),
    getAllDrivers(),
    getAllVehicles(),
  ])

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    New: { label: "ใหม่", color: "text-blue-400 bg-blue-500/20", icon: <Package size={14} /> },
    Assigned: { label: "มอบหมายแล้ว", color: "text-indigo-400 bg-indigo-500/20", icon: <Truck size={14} /> },
    "Picked Up": { label: "รับแล้ว", color: "text-cyan-400 bg-cyan-500/20", icon: <Package size={14} /> },
    "In Transit": { label: "กำลังส่ง", color: "text-amber-400 bg-amber-500/20", icon: <Truck size={14} /> },
    Delivered: { label: "ส่งแล้ว", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Complete: { label: "เสร็จสิ้น", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Failed: { label: "ล้มเหลว", color: "text-red-400 bg-red-500/20", icon: <AlertCircle size={14} /> },
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <CalendarDays className="text-indigo-400" />
            วางแผนงาน
          </h1>
          <p className="text-slate-400">จัดการงานและแผนการจัดส่ง</p>
        </div>
        <JobDialog 
            mode="create" 
            drivers={drivers.data} 
            vehicles={vehicles.data}
            trigger={
                <Button size="lg" className="gap-2">
                    <Plus size={20} />
                    สร้างงานใหม่
                </Button>
            }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-2xl font-bold text-indigo-400">{stats.total}</p>
          <p className="text-xs text-slate-400">งานวันนี้</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-xs text-slate-400">รอดำเนินการ</p>
        </div>
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
          <p className="text-xs text-slate-400">กำลังจัดส่ง</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.delivered}</p>
          <p className="text-xs text-slate-400">ส่งสำเร็จ</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหา Job ID, ลูกค้า, เส้นทาง..." />
      </div>

      {/* Jobs Table */}
      <Card variant="glass">
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              ไม่พบข้อมูลงาน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">Job ID</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">วันที่</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ลูกค้า</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">เส้นทาง</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">คนขับ</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">สถานะ</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr 
                      key={job.Job_ID} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-indigo-400 font-medium text-sm">{job.Job_ID}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Clock size={14} className="text-slate-400" />
                          {job.Plan_Date || "-"}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-white font-medium text-sm">{job.Customer_Name || "-"}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-slate-300">
                          <MapPin size={14} className="text-slate-400" />
                          {job.Route_Name || `${job.Origin_Location || "-"} → ${job.Dest_Location || "-"}`}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Truck size={14} className="text-slate-400" />
                          <span className="text-slate-300">{job.Driver_Name || "-"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[job.Job_Status]?.color || 'text-slate-400 bg-slate-500/20'
                        }`}>
                          {statusConfig[job.Job_Status]?.icon}
                          {statusConfig[job.Job_Status]?.label || job.Job_Status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <JobActions 
                            job={job}
                            drivers={drivers.data}
                            vehicles={vehicles.data}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="p-4 border-t border-white/10">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
