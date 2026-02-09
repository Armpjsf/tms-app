import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Truck, Users, CheckCircle, Clock } from "lucide-react"
import { getTodayJobStats, getWeeklyJobStats, getJobStatusDistribution } from "@/lib/supabase/jobs"
import { getDriverStats } from "@/lib/supabase/drivers"
import { getVehicleStats } from "@/lib/supabase/vehicles"
import { createClient } from "@/utils/supabase/server"
import { WeeklyShipmentChart } from "@/components/dashboard/charts/weekly-shipment-chart"
import { JobStatusChart } from "@/components/dashboard/charts/job-status-chart"

export default async function AdminDashboardPage() {
  // Fetch real data
  const [jobStats, driverStats, vehicleStats, weeklyStats, statusDist] = await Promise.all([
    getTodayJobStats(),
    getDriverStats(),
    getVehicleStats(),
    getWeeklyJobStats(),
    getJobStatusDistribution(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">ภาพรวมการขนส่งประจำวัน</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">งานทั้งหมด (วันนี้)</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{jobStats.total}</div>
            <p className="text-xs text-slate-500 mt-1">งานใหม่วันนี้</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">ส่งสำเร็จ</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{jobStats.delivered}</div>
            <p className="text-xs text-emerald-500 mt-1">
                {jobStats.total > 0 ? Math.round((jobStats.delivered / jobStats.total) * 100) : 0}% ของงานวันนี้
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">รถที่วิ่งอยู่</CardTitle>
            <Truck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{vehicleStats.active}</div>
            <p className="text-xs text-slate-500 mt-1">จากทั้งหมด {vehicleStats.total} คัน</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">คนขับ</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{driverStats.active}</div>
            <p className="text-xs text-slate-500 mt-1">Active ตอนนี้</p>
          </CardContent>
        </Card>
      </div>

       {/* Charts Section */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Package size={20} className="text-blue-400" />
              สถิติการจัดส่งรายสัปดาห์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyShipmentChart data={weeklyStats} />
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle size={20} className="text-emerald-400" />
              สัดส่วนสถานะงาน (ทั้งหมด)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobStatusChart data={statusDist} />
          </CardContent>
        </Card>
      </div>

      {/* Map Placeholder */}
       <Card className="bg-slate-900 border-slate-800">
           <CardHeader>
            <CardTitle className="text-white">แผนที่ตำแหน่งรถ (Real-time)</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[400px] flex items-center justify-center bg-slate-950 rounded-lg text-slate-600 border border-slate-800">
               <div className="text-center">
                   <Truck className="w-12 h-12 opacity-20 mx-auto mb-2" />
                   <p>แผนที่กำลังจะมาใน Phase ถัดไป</p>
               </div>
             </div>
           </CardContent>
        </Card>
    </div>
  )
}
