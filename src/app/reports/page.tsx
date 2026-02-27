export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StatsGrid } from "@/components/ui/stats-grid"
import { 
  BarChart3, 
  Package,
  Fuel,
  Wrench,
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
      <PageHeader
        icon={<BarChart3 size={28} />}
        title="รายงาน"
        subtitle="สร้างและดาวน์โหลดรายงานด้วยตัวกรองแบบ Interactive"
      />

      <StatsGrid columns={5} stats={[
        { label: "งานทั้งหมด", value: jobCount || 0, icon: <Package size={20} />, color: "indigo" },
        { label: `คนขับ (${driverStats.active} Active)`, value: driverStats.total, icon: <Users size={20} />, color: "blue" },
        { label: `รถ (${vehicleStats.active} Active)`, value: vehicleStats.total, icon: <Truck size={20} />, color: "purple" },
        { label: "ค่าน้ำมันวันนี้", value: `฿${fuelStats.totalAmount.toLocaleString()}`, icon: <Fuel size={20} />, color: "emerald" },
        { label: "รอดำเนินการ", value: maintenanceStats.pending, icon: <Wrench size={20} />, color: "amber" },
      ]} />

      <ReportBuilder />
    </DashboardLayout>
  )
}
