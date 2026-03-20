import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MonthFilter } from "@/components/analytics/month-filter"
import { isSuperAdmin } from "@/lib/permissions"
import { cookies } from "next/headers"
import { DashboardContent } from "@/components/analytics/dashboard-content"
import { getMaintenanceSchedule } from "@/lib/supabase/maintenance-schedule"
import { AlertTriangle, LayoutDashboard, ArrowLeft, ShieldAlert, BarChart3, Zap } from "lucide-react"
import { PremiumButton } from "@/components/ui/premium-button"

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams.branch || cookieStore.get("selectedBranch")?.value || 'All'
  const superAdmin = await isSuperAdmin()
  const maintenance = await getMaintenanceSchedule()

  if (!superAdmin) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center bg-[#050110]/50 backdrop-blur-3xl rounded-[4rem] border border-white/5 m-10">
            <div className="p-8 bg-rose-500/20 rounded-full text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
                <ShieldAlert size={64} />
            </div>
            <div className="space-y-2">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Access Unauthorized</h1>
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">
                    Insufficient Credentials for Strategic Intelligence Access
                </p>
            </div>
            <Link href="/dashboard">
                <PremiumButton variant="outline" className="border-white/10 text-white h-14 px-10 rounded-2xl">
                    RETURN TO SECURE TERMINAL
                </PremiumButton>
            </Link>
        </div>
     )
  }

  return (
    <div className="space-y-12 pb-20 p-10 bg-[#050110]">
        {maintenance.overdue.length > 0 && (
            <div className="bg-[#0a0518] border-2 border-rose-500/30 p-10 rounded-br-[6rem] rounded-tl-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_50px_rgba(244,63,94,0.1)] relative overflow-hidden group">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)]" />
                <div className="flex items-center gap-8 relative z-10">
                    <div className="p-5 bg-rose-600 rounded-[2rem] text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] group-hover:scale-110 transition-transform duration-500">
                        <AlertTriangle size={32} className="animate-pulse" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Critical Fleet Divergence: {maintenance.overdue.length} Units</p>
                        <p className="text-rose-500 font-black text-[10px] uppercase tracking-[0.4em] mt-3 italic">Immediate structural intervention mandatory for network integrity</p>
                    </div>
                </div>
                <Link href="/maintenance" className="relative z-10">
                    <PremiumButton className="bg-rose-600 hover:bg-rose-700 text-white border-0 h-16 px-10 rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_15px_30px_rgba(244,63,94,0.3)]">
                        INITIATE RECOVERY
                    </PremiumButton>
                </Link>
            </div>
        )}

        {/* Global Strategic Header */}
        <div className="bg-[#0a0518] p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                <div>
                   <Link href="/dashboard" className="flex items-center gap-3 text-primary hover:text-white transition-all mb-8 w-fit group/back">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover/back:bg-primary transition-colors">
                           <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Back to Hub</span>
                    </Link>
                    <div className="flex items-center gap-6 mb-4">
                       <div className="p-4 bg-primary/20 rounded-[2rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary">
                          <BarChart3 size={40} strokeWidth={2.5} />
                       </div>
                       <div>
                          <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none mb-2">Strategic Intelligence</h1>
                          <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] opacity-80 italic">High-Fidelity performance node registry // Tier-0 Access</p>
                       </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="bg-white/5 border border-white/5 p-2 rounded-3xl backdrop-blur-3xl flex items-center gap-2">
                       <MonthFilter />
                    </div>
                    <div className="px-8 py-5 bg-primary/10 rounded-3xl border-2 border-primary/20 flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Live Intelligence Feed: ACTIVE</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Main Intelligence Grid */}
        <Suspense fallback={<AnalyticsContentSkeleton />}>
            <DashboardContent 
                startDate={searchParams.startDate} 
                endDate={searchParams.endDate} 
                branchId={branchId} 
            />
        </Suspense>
      </div>
  )
}

function AnalyticsContentSkeleton() {
  return (
    <div className="space-y-12 animate-pulse p-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-56 bg-[#0a0518] rounded-br-[4rem] rounded-tl-[2rem] border border-white/5 shadow-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 h-[600px] bg-[#0a0518] rounded-br-[6rem] rounded-tl-[3rem] shadow-3xl border border-white/5" />
        <div className="h-[600px] bg-[#0a0518] rounded-br-[6rem] rounded-tl-[3rem] shadow-3xl border border-white/5" />
      </div>
    </div>
  )
}
