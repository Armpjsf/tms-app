export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
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
      {/* Bespoke Strategic Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 text-left">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-3xl shadow-2xl shadow-blue-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <BarChart3 size={32} />
            </div>
            Reporting HUB
          </h1>
          <p className="text-blue-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">INTUITIVE ANALYTICS & STRATEGIC DATA EXPORT</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-3 px-6 py-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Intelligence Feed</span>
          </div>
        </div>
      </div>

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
