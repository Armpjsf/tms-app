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
  Activity,
  ShieldCheck,
  Zap
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
      {/* Elite Tactical Reporting Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-background/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-border/5 shadow-2xl relative group ring-1 ring-border/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                    <BarChart3 className="text-primary" size={20} />
                </div>
                <h2 className="text-base font-bold font-black text-primary uppercase tracking-[0.4em]">Operations Intelligence Archive</h2>
            </div>
            <h1 className="text-6xl font-black text-foreground tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                Reporting Hub
            </h1>
            <p className="text-muted-foreground font-bold text-xl tracking-wide opacity-80 uppercase tracking-widest leading-relaxed">
              Strategic Analytics & Tactical Data Extraction Interface
            </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-2xl border border-border/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,1)]" />
                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">Live Engine</span>
            </div>
            <div className="w-px h-6 bg-muted/80" />
            <div className="flex items-center gap-3">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">Encrypted_Export</span>
            </div>
          </div>
        </div>
      </div>

      <StatsGrid columns={5} stats={[
        { label: "Fleet Missions", value: jobCount || 0, icon: <Package size={20} />, color: "indigo" },
        { label: `Elite Units (${driverStats.active})`, value: driverStats.total, icon: <Users size={20} />, color: "blue" },
        { label: `Asset Fleet (${vehicleStats.active})`, value: vehicleStats.total, icon: <Truck size={20} />, color: "purple" },
        { label: "Today Energy Log", value: `฿${fuelStats.totalAmount.toLocaleString()}`, icon: <Fuel size={20} />, color: "emerald" },
        { label: "Integrity Queue", value: maintenanceStats.pending, icon: <Wrench size={20} />, color: "amber" },
      ]} />

      <div className="space-y-12">
        <div className="flex items-center gap-4 mb-2">
            <div className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(255,30,133,0.8)]" />
            <div>
                <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase font-display">Strategic Report Configurator</h3>
                <p className="text-muted-foreground text-base font-bold font-black uppercase tracking-[0.4em] mt-1 italic">Define Parameters for Intelligence Extraction</p>
            </div>
        </div>
        <div className="glass-panel p-2 rounded-[4rem] border-border/5 bg-background/20 shadow-3xl">
            <ReportBuilder />
        </div>
      </div>

      <div className="mt-20 text-center mb-24">
        <div className="inline-flex items-center gap-4 px-8 py-3 glass-panel rounded-full text-base font-bold font-black text-muted-foreground uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-opacity">
            <Zap size={14} className="text-primary" /> Intelligence Core v9.4 • Mission Critical Analytics
        </div>
      </div>
    </DashboardLayout>
  )
}

