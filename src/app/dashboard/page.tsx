export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/dashboard/metric-card"
import { 
  CalendarDays, 
  Truck, 
  AlertTriangle, 
  Package,
  CheckCircle2,
} from "lucide-react"
import { getTodayJobStats, getWeeklyJobStats, getJobStatusDistribution, getTodayFinancials } from "@/lib/supabase/jobs"

import { createClient } from "@/utils/supabase/server"
import { WeeklyShipmentChart } from "@/components/dashboard/charts/weekly-shipment-chart"
import { JobStatusChart } from "@/components/dashboard/charts/job-status-chart"
import { isSuperAdmin, isCustomer } from "@/lib/permissions"
import { BranchFilter } from "@/components/dashboard/branch-filter"
import { getFinancialStats } from "@/lib/supabase/analytics"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { branch?: string }
}) {
  const customerMode = await isCustomer()
  const superAdmin = await isSuperAdmin()
  const branchId = searchParams?.branch

  // ดึงข้อมูลจาก Supabase (Pass branchId if SuperAdmin)
  const [jobStats, sosCount, weeklyStats, statusDist, financials, financialStats] = await Promise.all([
    getTodayJobStats(branchId),
    getSosCount(),
    getWeeklyJobStats(branchId),
    getJobStatusDistribution(branchId),
    getTodayFinancials(branchId),
    getFinancialStats(undefined, undefined, branchId), // New Financial Stats (Month to date)
  ])

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2">
            Operations Dashboard {branchId && branchId !== 'All' ? `(${branchId})` : ''}
           </h1>
           <p className="text-slate-400">
             ยินดีต้อนรับ! นี่คือภาพรวมของระบบวันนี้
           </p>
        </div>
        <BranchFilter isSuperAdmin={superAdmin} />
      </div>

      {/* Metrics Grid (Consolidated 5 KPIs) */}
      <div className={`grid grid-cols-1 md:grid-cols-3 ${customerMode ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4 mb-8`}>
        <MetricCard
          title="งานวันนี้"
          value={jobStats.total}
          icon={<Package size={20} />}
          gradient="primary"
          trend={jobStats.total > 0 ? { value: jobStats.inProgress, label: "กำลังดำเนินการ" } : undefined}
        />
        <MetricCard
          title="ความสำเร็จ"
          value={`${jobStats.total > 0 ? Math.round((jobStats.delivered / jobStats.total) * 100) : 0}%`}
          icon={<CheckCircle2 size={20} />}
          gradient="success"
          trend={{ value: jobStats.delivered, label: "งานเสร็จสิ้น" }}
        />
        <MetricCard
          title="แจ้งเตือน/ปัญหา"
          value={sosCount + jobStats.pending}
          icon={<AlertTriangle size={20} />}
          gradient="danger"
          trend={{ value: sosCount, label: "SOS Alerts" }}
        />
        {!customerMode && (
          <MetricCard
            title="กำไรสุทธิ (เดือนนี้)"
            value={`฿${financialStats.netProfit.toLocaleString()}`}
            icon={<Truck size={20} />}
            gradient="warning"
            trend={{ value: financialStats.revenue, label: "รายรับรวม" }}
          />
        )}
        <MetricCard
          title="รายได้วันนี้ (Est.)"
          value={`฿${financials.revenue.toLocaleString()}`}
          icon={<CalendarDays size={20} />}
          gradient="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
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

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 size={20} className="text-emerald-400" />
              สัดส่วนสถานะงาน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobStatusChart data={statusDist} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// ฟังก์ชันเสริมสำหรับนับ SOS
import { getCustomerId as getAuthCustomerId } from "@/lib/permissions"

async function getSosCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const customerId = await getAuthCustomerId()

    let dbQuery = supabase
      .from('Jobs_Main')
      .select('*', { count: 'exact', head: true })
      .eq('Job_Status', 'SOS')
    
    if (customerId) {
        dbQuery = dbQuery.eq('Customer_ID', customerId)
    }

    const { count, error } = await dbQuery

    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}
