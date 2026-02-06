import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/dashboard/metric-card"
import { 
  CalendarDays, 
  Truck, 
  AlertTriangle, 
  Package,
  Users,
  Fuel,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { getTodayJobStats } from "@/lib/supabase/jobs"
import { getDriverStats } from "@/lib/supabase/drivers"
import { getVehicleStats } from "@/lib/supabase/vehicles"
import { createClient } from "@/utils/supabase/server"

export default async function DashboardPage() {
  // ดึงข้อมูลจาก Supabase
  const [jobStats, driverStats, vehicleStats, sosCount] = await Promise.all([
    getTodayJobStats(),
    getDriverStats(),
    getVehicleStats(),
    getSosCount(),
  ])

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">
          ยินดีต้อนรับ! นี่คือภาพรวมของระบบวันนี้
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="งานวันนี้"
          value={jobStats.total}
          icon={<CalendarDays size={24} />}
          gradient="primary"
        />
        <MetricCard
          title="ส่งสำเร็จ"
          value={jobStats.delivered}
          icon={<CheckCircle2 size={24} />}
          gradient="success"
          trend={jobStats.total > 0 ? { value: Math.round((jobStats.delivered / jobStats.total) * 100), label: "ของงานวันนี้" } : undefined}
        />
        <MetricCard
          title="SOS Alerts"
          value={sosCount}
          icon={<AlertTriangle size={24} />}
          gradient="danger"
        />
        <MetricCard
          title="รถ Active"
          value={vehicleStats.active}
          icon={<Truck size={24} />}
          gradient="purple"
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="คนขับ Active"
          value={driverStats.active}
          icon={<Users size={24} />}
          gradient="warning"
        />
        <MetricCard
          title="กำลังจัดส่ง"
          value={jobStats.inProgress}
          icon={<Package size={24} />}
          gradient="primary"
        />
        <MetricCard
          title="รอดำเนินการ"
          value={jobStats.pending}
          icon={<Clock size={24} />}
          gradient="purple"
        />
        <MetricCard
          title="รถใกล้ถึงกำหนดซ่อม"
          value={vehicleStats.dueSoon}
          icon={<Fuel size={24} />}
          gradient="warning"
        />
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package size={20} className="text-indigo-400" />
              สถิติการจัดส่งรายสัปดาห์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>Chart จะแสดงที่นี่</p>
                <p className="text-xs mt-1">(Coming Soon)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel size={20} className="text-emerald-400" />
              ค่าน้ำมันรายเดือน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Fuel size={48} className="mx-auto mb-4 opacity-50" />
                <p>Chart จะแสดงที่นี่</p>
                <p className="text-xs mt-1">(Coming Soon)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// ฟังก์ชันเสริมสำหรับนับ SOS
async function getSosCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('Jobs_Main')
      .select('*', { count: 'exact', head: true })
      .eq('Job_Status', 'SOS')

    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}
