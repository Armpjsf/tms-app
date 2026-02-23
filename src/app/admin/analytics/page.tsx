
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MonthFilter } from "@/components/analytics/month-filter"
import { isSuperAdmin } from "@/lib/permissions"
import { cookies } from "next/headers"
import { DashboardContent } from "@/components/analytics/dashboard-content"
import { getMaintenanceSchedule } from "@/lib/supabase/maintenance-schedule"
import { AlertTriangle } from "lucide-react"

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
            <p className="text-slate-400">
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
    <div className="space-y-12 pb-20">
        {maintenance.overdue.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500 rounded-lg text-white">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-red-400 font-bold">แจ้งเตือนเร่งด่วน: พบรถ {maintenance.overdue.length} คันเกินกำหนดซ่อมบำรุง</p>
                        <p className="text-red-400/60 text-xs">กรุณาตรวจสอบและดำเนินการเพื่อความปลอดภัย</p>
                    </div>
                </div>
                <Link href="/maintenance">
                    <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                        จัดการทันที
                    </Button>
                </Link>
            </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-border pb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-1">Executive Dashboard</h1>
              <p className="text-muted-foreground text-lg">Strategic Insights & Operational Performance {branchId && branchId !== 'All' ? `(${branchId})` : ''}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border p-2 rounded-xl">
                  {/* MonthFilter is client-side and renders immediately */}
                  <MonthFilter />
              </div>
              {/* Export Button moved inside DashboardContent to access data */}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-slate-800/50 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[400px] bg-slate-800/50 rounded-xl" />
        <div className="h-[400px] bg-slate-800/50 rounded-xl" />
      </div>
      <div className="h-64 bg-slate-800/50 rounded-xl" />
    </div>
  )
}
