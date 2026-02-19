export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart3, 
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
import { ReportBuilder } from "@/components/reports/report-builder"

export default async function ReportsPage() {
  const [{ count: jobCount }, driverStats, vehicleStats, fuelStats, maintenanceStats] = await Promise.all([
    getAllJobs(1, 1),
    getDriverStats(),
    getVehicleStats(),
    getTodayFuelStats(),
    getRepairTicketStats(),
  ])

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <BarChart3 className="text-cyan-400" />
          รายงาน
        </h1>
        <p className="text-muted-foreground">สร้างและดาวน์โหลดรายงานด้วยตัวกรองแบบ Interactive</p>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <Package size={20} className="mx-auto text-indigo-400 mb-2" />
            <p className="text-2xl font-bold text-foreground">{jobCount}</p>
            <p className="text-xs text-muted-foreground">งานทั้งหมด</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <Users size={20} className="mx-auto text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-foreground">{driverStats.total}</p>
            <p className="text-xs text-muted-foreground">คนขับ ({driverStats.active} Active)</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <Truck size={20} className="mx-auto text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-foreground">{vehicleStats.total}</p>
            <p className="text-xs text-muted-foreground">รถ ({vehicleStats.active} Active)</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <Fuel size={20} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-foreground">฿{fuelStats.totalAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ค่าน้ำมันวันนี้</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <Wrench size={20} className="mx-auto text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-foreground">{maintenanceStats.pending}</p>
            <p className="text-xs text-muted-foreground">รอดำเนินการ</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Report Builder */}
      <ReportBuilder />
    </DashboardLayout>
  )
}
