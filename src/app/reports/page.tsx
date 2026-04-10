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
  ShieldCheck,
  Zap,
  DollarSign,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { getAllJobs } from "@/lib/supabase/jobs"
import { getDriverStats } from "@/lib/supabase/drivers"
import { getVehicleStats } from "@/lib/supabase/vehicles"
import { getTodayFuelStats } from "@/lib/supabase/fuel"
import { getRepairTicketStats } from "@/lib/supabase/maintenance"
import { ReportBuilder } from "@/components/reports/report-builder"
import { getSOSDriverIds } from "@/lib/supabase/sos"
import { getSystemLogs } from "@/lib/supabase/logs"
import { getExecutiveDashboardUnified } from "@/lib/supabase/financial-analytics"
import { ActivityFeed } from "@/components/dashboard/activity-feed"

export default async function ReportsPage() {
  const [
    { count: jobCount }, 
    driverStats, 
    vehicleStats, 
    fuelStats, 
    maintenanceStats,
    sosIds,
    logs,
    unified
  ] = await Promise.all([
    getAllJobs(1, 1),
    getDriverStats(),
    getVehicleStats(),
    getTodayFuelStats(),
    getRepairTicketStats(),
    getSOSDriverIds(),
    getSystemLogs({ limit: 10 }),
    getExecutiveDashboardUnified(),
  ])

  const jobStats = {
    total: unified?.kpi?.jobs?.current ?? 0,
    pending: unified?.statusDist?.find((s: any) => ['New', 'Requested', 'Assigned', 'Pending'].includes(s.name))
                ? unified.statusDist.filter((s: any) => ['New', 'Requested', 'Assigned', 'Pending'].includes(s.name)).reduce((a: number, b: any) => a + b.value, 0)
                : 0,
    inProgress: unified?.statusDist?.find((s: any) => ['In Progress', 'In Transit', 'Active'].includes(s.name))
                 ? unified.statusDist.filter((s: any) => ['In Progress', 'In Transit', 'Active'].includes(s.name)).reduce((a: number, b: any) => a + b.value, 0)
                 : 0,
    delivered: unified?.statusDist?.find((s: any) => ['Completed', 'Delivered', 'Finished', 'Closed'].includes(s.name))
                   ? unified.statusDist.filter((s: any) => ['Completed', 'Delivered', 'Finished', 'Closed'].includes(s.name)).reduce((a: number, b: any) => a + b.value, 0)
                   : 0
  }

  return (
    <DashboardLayout>
      {/* Elite Tactical Reporting Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 bg-background/60 backdrop-blur-3xl p-8 rounded-3xl border border-border/5 shadow-xl relative group ring-1 ring-border/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/20 rounded-lg shadow-lg">
                    <BarChart3 className="text-primary" size={16} />
                </div>
                <h2 className="text-[10px] font-bold font-black text-primary uppercase tracking-[0.4em]">Operations Intelligence Archive</h2>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tighter flex items-center gap-4 uppercase premium-text-gradient italic leading-none">
                Reporting Hub
            </h1>
            <p className="text-muted-foreground font-bold text-sm tracking-wide opacity-80 uppercase tracking-widest leading-relaxed italic">
              Strategic Analytics & Tactical Data Extraction
            </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <Link href="/reports/cost-per-trip">
            <button className="h-11 px-6 rounded-xl bg-violet-500 text-white font-black uppercase tracking-widest hover:bg-violet-600 transition-all shadow-lg flex items-center gap-2 group/btn text-[10px]">
                <DollarSign size={16} className="group-hover/btn:scale-110 transition-transform" />
                Profit Analysis
                <ArrowRight size={14} className="ml-1 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </Link>
          <div className="flex items-center gap-3 bg-muted/50 p-2.5 rounded-xl border border-border/10 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold font-black text-muted-foreground uppercase tracking-widest">Live Engine</span>
            </div>
            <div className="w-px h-4 bg-muted/80" />
            <div className="flex items-center gap-2">
                <ShieldCheck size={12} className="text-primary" />
                <span className="text-[10px] font-bold font-black text-muted-foreground uppercase tracking-widest italic">Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      <StatsGrid columns={5} stats={[
        { label: "Fleet Missions", value: jobCount || 0, icon: <Package size={16} />, color: "indigo" },
        { label: `Units (${driverStats.active})`, value: driverStats.total, icon: <Users size={16} />, color: "blue" },
        { label: `Fleet (${vehicleStats.active})`, value: vehicleStats.total, icon: <Truck size={16} />, color: "purple" },
        { label: "Energy Log", value: `฿${fuelStats.totalAmount.toLocaleString()}`, icon: <Fuel size={16} />, color: "emerald" },
        { label: "Integrity", value: maintenanceStats.pending, icon: <Wrench size={16} />, color: "amber" },
      ]} />

      <div className="space-y-8 mt-10">
        <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(255,30,133,0.8)]" />
            <div>
                <h3 className="text-xl font-black text-foreground tracking-tighter uppercase italic">Strategic Configurator</h3>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] mt-0.5 italic">Define Parameters for Extraction</p>
            </div>
        </div>
        <div className="glass-panel p-0.5 rounded-3xl border border-border/5 bg-background/20 shadow-2xl">
            <ReportBuilder />
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="mt-16 space-y-8">
        <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 bg-accent rounded-full shadow-[0_0_15px_rgba(182,9,0,0.8)]" />
            <div>
                <h3 className="text-xl font-black text-foreground tracking-tighter uppercase italic">System Activity Log</h3>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] mt-0.5 italic">Real-time Operational Stream</p>
            </div>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-border/5 bg-background/20 shadow-2xl">
            <ActivityFeed jobStats={jobStats} sosCount={sosIds.length} logs={logs} />
        </div>
      </div>

      <div className="mt-16 text-center mb-20">
        <div className="inline-flex items-center gap-3 px-6 py-2 glass-panel rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-opacity">
            <Zap size={12} className="text-primary" /> Intelligence Core v9.4 • Matrix Synced
        </div>
      </div>
    </DashboardLayout>
  )
}

