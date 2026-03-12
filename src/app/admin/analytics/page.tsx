import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MonthFilter } from "@/components/analytics/month-filter"
import { isSuperAdmin } from "@/lib/permissions"
import { cookies } from "next/headers"
import { DashboardContent } from "@/components/analytics/dashboard-content"
import { getMaintenanceSchedule } from "@/lib/supabase/maintenance-schedule"
import { AlertTriangle, LayoutDashboard, ArrowLeft } from "lucide-react"
import { PremiumButton } from "@/components/ui/premium-button"

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams.branch || cookieStore.get("selectedBranch")?.value || 'All'
  const superAdmin = await isSuperAdmin()
  const maintenance = await getMaintenanceSchedule()

  if (!superAdmin) {
     // ... (keep existing access denied)
     return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <h1 className="text-3xl font-bold text-red-500">Access Denied</h1>
            <p className="text-gray-500">
                คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (สำหรับ Super Admin เท่านั้น) <br/>
                กรุณาติดต่อผู้ดูแลระบบหากต้องการสิทธิ์
            </p>
            <Link href="/dashboard">
                <Button variant="secondary">กลับสู่ Dashboard ปกติ</Button>
            </Link>
        </div>
     )
  }

  return (
    <div className="space-y-12 pb-20 p-10">
        {maintenance.overdue.length > 0 && (
            <div className="bg-slate-950 border border-red-500/30 p-8 rounded-br-[4rem] rounded-tl-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-red-500/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                    <div className="p-4 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-600/30 group-hover:scale-110 transition-transform duration-500">
                        <AlertTriangle size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <p className="text-xl font-black text-white tracking-tight uppercase">Critical Asset Overdue: {maintenance.overdue.length} Units</p>
                        <p className="text-red-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 italic">Immediate strategic intervention required for fleet integrity</p>
                    </div>
                </div>
                <Link href="/maintenance" className="relative z-10">
                    <PremiumButton variant="secondary" className="bg-red-600 hover:bg-red-700 text-white border-0 h-12 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        Strategic Intervention
                    </PremiumButton>
                </Link>
            </div>
        )}

        {/* Bespoke Obsidian Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-16 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <Link href="/dashboard" className="flex items-center gap-2 text-indigo-400 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em] w-fit">
                    <ArrowLeft className="w-4 h-4" /> Command Central
                </Link>
                <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl shadow-2xl shadow-indigo-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                        <LayoutDashboard size={32} />
                    </div>
                    Strategic INTELLIGENCE
                </h1>
                <p className="text-indigo-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">High-Fidelity Operational Performance Registry {branchId && branchId !== 'All' ? `// ${branchId}` : ''}</p>
            </div>

            <div className="flex flex-wrap items-center gap-6 relative z-10">
                <div className="flex items-center gap-3 px-6 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
                   <MonthFilter />
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Live Sync: ACTIVE</span>
                </div>
            </div>
        </div>

        {/* Content Section - Suspended independently */}
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
    <div className="space-y-12 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-44 bg-slate-950 rounded-br-[3rem] rounded-tl-[1.5rem] border border-slate-900 shadow-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[500px] bg-white rounded-br-[5rem] rounded-tl-[3rem] shadow-2xl border border-slate-50" />
        <div className="h-[500px] bg-white rounded-br-[5rem] rounded-tl-[3rem] shadow-2xl border border-slate-50" />
      </div>
      <div className="h-80 bg-white rounded-br-[4rem] rounded-tl-[2rem] shadow-2xl border border-slate-50" />
    </div>
  )
}
