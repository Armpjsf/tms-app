export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  CalendarDays, 
  Plus,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  History,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react"
import { getTodayJobStats, getTodayJobs } from "@/lib/supabase/jobs"
import { getJobCreationData, createBulkJobs } from "@/app/planning/actions"
import { JobDialog } from "@/components/planning/job-dialog"
import { CreateJobButton } from "@/components/planning/create-job-button"
import { ExcelImport } from "@/components/ui/excel-import"
import { RecentJobItem } from "@/components/planning/recent-job-item"
// ...

export default async function PlanningPage() {
  const [stats, todayJobs, jobCreationData] = await Promise.all([
    getTodayJobStats(),
    getTodayJobs(),
    getJobCreationData(),
  ])

  const { drivers, vehicles, customers, routes } = jobCreationData


  // Get a few recent jobs for quick preview
  const recentJobs = todayJobs.slice(0, 5)

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <CalendarDays className="text-indigo-400" />
            วางแผนงาน
          </h1>
          <p className="text-slate-400">จัดการงานและแผนการจัดส่งวันนี้</p>
        </div>
        <div className="flex gap-3">
          <Link href="/jobs/history">
            <Button variant="outline" className="gap-2 border-slate-700">
              <History size={18} />
              ดูประวัติงาน
            </Button>
          </Link>
          <ExcelImport 
                trigger={
                    <Button variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800">
                        <FileSpreadsheet size={16} /> 
                        นำเข้า Excel
                    </Button>
                }
                title="นำเข้างาน (Jobs)"
                onImport={createBulkJobs}
                templateData={[
                    { Customer_Name: "ลูกค้า A", Plan_Date: "2024-03-20", Job_ID: "JOB-001", Route_Name: "BKK-CNX" },
                    { Customer_Name: "ลูกค้า B", Plan_Date: "2024-03-21", Job_ID: "JOB-002", Route_Name: "BKK-HKT" }
                ]}
                templateFilename="template_jobs.xlsx"
            />
          <CreateJobButton 
              drivers={drivers || []} 
              vehicles={vehicles || []}
              customers={customers || []}
              routes={routes || []}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border-indigo-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-400">{stats.total}</p>
                <p className="text-sm text-slate-400">งานวันนี้</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
                <p className="text-sm text-slate-400">รอดำเนินการ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">{stats.inProgress}</p>
                <p className="text-sm text-slate-400">กำลังจัดส่ง</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/10 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-400">{stats.delivered}</p>
                <p className="text-sm text-slate-400">ส่งสำเร็จ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Jobs Quick Preview */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">งานวันนี้</h2>
            <Link href="/jobs/history">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                ดูทั้งหมด <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          
          {recentJobs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">ยังไม่มีงานวันนี้</p>
              <div className="flex justify-center gap-2">
                 <ExcelImport 
                    trigger={
                        <Button variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800">
                            <FileSpreadsheet size={16} /> 
                            นำเข้า Excel
                        </Button>
                    }
                    title="นำเข้างาน (Jobs)"
                    onImport={createBulkJobs}
                    templateData={[
                        { Customer_Name: "ลูกค้า A", Plan_Date: "2024-03-20", Job_ID: "JOB-001", Route_Name: "BKK-CNX" },
                        { Customer_Name: "ลูกค้า B", Plan_Date: "2024-03-21", Job_ID: "JOB-002", Route_Name: "BKK-HKT" }
                    ]}
                    templateFilename="template_jobs.xlsx"
                />
                <JobDialog 
                    mode="create" 
                    drivers={drivers} 
                    vehicles={vehicles}
                    customers={customers}
                    routes={routes}
                    trigger={
                        <Button className="gap-2">
                            <Plus size={18} />
                            สร้างงานใหม่
                        </Button>
                    }
                />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentJobs.map((job) => (
                <RecentJobItem 
                    key={job.Job_ID} 
                    job={job}
                    drivers={drivers || []}
                    vehicles={vehicles || []}
                    customers={customers || []}
                    routes={routes || []}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
