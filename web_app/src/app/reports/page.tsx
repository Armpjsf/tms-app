import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  Download,
  Calendar,
  Package,
  Fuel,
  Wrench,
  TrendingUp,
  Users,
  Truck,
} from "lucide-react"
import { getAllJobs } from "@/lib/supabase/jobs"
import { getDriverStats } from "@/lib/supabase/drivers"
import { getVehicleStats } from "@/lib/supabase/vehicles"
import { getTodayFuelStats } from "@/lib/supabase/fuel"
import { getRepairTicketStats } from "@/lib/supabase/maintenance"

export default async function ReportsPage() {
  const [{ count: jobCount }, driverStats, vehicleStats, fuelStats, maintenanceStats] = await Promise.all([
    getAllJobs(1, 1),
    getDriverStats(),
    getVehicleStats(),
    getTodayFuelStats(),
    getRepairTicketStats(),
  ])

  const reports = [
    {
      title: "รายงานงานจัดส่ง",
      description: "สรุปการจัดส่งรายวัน/รายเดือน",
      icon: <Package className="text-indigo-400" size={24} />,
      stats: `${jobCount} งานทั้งหมด`,
      color: "indigo",
    },
    {
      title: "รายงานคนขับ",
      description: "ผลงานและประสิทธิภาพคนขับ",
      icon: <Users className="text-blue-400" size={24} />,
      stats: `${driverStats.total} คน (${driverStats.active} Active)`,
      color: "blue",
    },
    {
      title: "รายงานรถ",
      description: "สถานะและการใช้งานรถ",
      icon: <Truck className="text-purple-400" size={24} />,
      stats: `${vehicleStats.total} คัน (${vehicleStats.active} Active)`,
      color: "purple",
    },
    {
      title: "รายงานน้ำมัน",
      description: "การเติมน้ำมันและค่าใช้จ่าย",
      icon: <Fuel className="text-emerald-400" size={24} />,
      stats: `฿${fuelStats.totalAmount.toLocaleString()} วันนี้`,
      color: "emerald",
    },
    {
      title: "รายงานซ่อมบำรุง",
      description: "การแจ้งซ่อมและค่าใช้จ่าย",
      icon: <Wrench className="text-amber-400" size={24} />,
      stats: `${maintenanceStats.pending} รอดำเนินการ`,
      color: "amber",
    },
    {
      title: "รายงานประสิทธิภาพ",
      description: "KPI และตัวชี้วัดหลัก",
      icon: <TrendingUp className="text-cyan-400" size={24} />,
      stats: "Dashboard View",
      color: "cyan",
    },
  ]

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="text-cyan-400" />
            รายงาน
          </h1>
          <p className="text-slate-400">ดูและดาวน์โหลดรายงานต่างๆ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar size={18} />
            เลือกช่วงเวลา
          </Button>
          <Button className="gap-2">
            <Download size={18} />
            ดาวน์โหลดทั้งหมด
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {reports.map((report) => (
          <Card key={report.title} variant="glass" hover={true}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-${report.color}-500/20 flex items-center justify-center`}>
                  {report.icon}
                </div>
                <Button variant="ghost" size="sm">
                  <Download size={16} />
                </Button>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{report.title}</h3>
              <p className="text-sm text-slate-400 mb-4">{report.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-xs text-slate-500">สถิติ</span>
                <span className="text-sm font-medium text-white">{report.stats}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="text-emerald-400" size={20} />
            สรุปภาพรวม
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className="text-3xl font-bold text-indigo-400">{jobCount}</p>
              <p className="text-xs text-slate-400 mt-1">งานทั้งหมด</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className="text-3xl font-bold text-blue-400">{driverStats.total}</p>
              <p className="text-xs text-slate-400 mt-1">คนขับ</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className="text-3xl font-bold text-purple-400">{vehicleStats.total}</p>
              <p className="text-xs text-slate-400 mt-1">รถ</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className="text-3xl font-bold text-emerald-400">฿{fuelStats.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">ค่าน้ำมันวันนี้</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
