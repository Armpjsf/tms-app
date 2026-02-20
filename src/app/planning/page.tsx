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
import { hasPermission } from "@/lib/permissions"
// ...

export default async function PlanningPage() {
  const [stats, todayJobs, jobCreationData, canViewPrice, canDelete, canCreate] = await Promise.all([
    getTodayJobStats(),
    getTodayJobs(),
    getJobCreationData(),
    hasPermission('job_price_view'),
    hasPermission('job_delete'),
    hasPermission('job_create')
  ])

  const { drivers, vehicles, customers, routes } = jobCreationData


  // Get a few recent jobs for quick preview
  const recentJobs = todayJobs.slice(0, 5)

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <CalendarDays className="text-primary" />
            วางแผนงาน
          </h1>
          <p className="text-muted-foreground">จัดการงานและแผนการจัดส่งวันนี้</p>
        </div>
        <div className="flex gap-3">
          <Link href="/jobs/history">
            <Button variant="outline" className="gap-2 border-border hover:bg-muted text-muted-foreground hover:text-foreground">
              <History size={18} />
              ดูประวัติงาน
            </Button>
          </Link>
          <ExcelImport 
                trigger={
                    <Button variant="outline" className="gap-2 border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                        <FileSpreadsheet size={16} /> 
                        นำเข้า Excel
                    </Button>
                }
                title="นำเข้างาน (Jobs)"
                onImport={createBulkJobs}
                templateData={[
                    { 
                        Job_ID: "JOB-001", 
                        Plan_Date: "2024-03-20", 
                        Delivery_Date: "2024-03-21",
                        Customer_Name: "ลูกค้า A", 
                        Route_Name: "BKK-CNX",
                        Driver_ID: "DRV-001",
                        Vehicle_Plate: "1กข-1234",
                        Price_Cust_Total: 5000,
                        Cost_Driver_Total: 1200,
                        Notes: "ระวังแตก"
                    },
                    { 
                        Job_ID: "JOB-002", 
                        Plan_Date: "2024-03-21", 
                        Delivery_Date: "2024-03-22",
                        Customer_Name: "ลูกค้า B", 
                        Route_Name: "BKK-HKT",
                        Driver_ID: "",
                        Vehicle_Plate: "",
                        Price_Cust_Total: 8500,
                        Cost_Driver_Total: 2000,
                        Notes: ""
                    }
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
        <Card className="bg-indigo-500/10 border-indigo-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{stats.total}</p>
                <p className="text-sm text-muted-foreground">งานวันนี้</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">รอดำเนินการ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">กำลังจัดส่ง</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{stats.delivered}</p>
                <p className="text-sm text-muted-foreground">ส่งสำเร็จ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Jobs Quick Preview */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">งานวันนี้</h2>
            <Link href="/jobs/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                ดูทั้งหมด <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          
          {recentJobs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">ยังไม่มีงานวันนี้</p>
              <div className="flex justify-center gap-2">
                 <ExcelImport 
                    trigger={
                        <Button variant="outline" className="gap-2 border-border hover:bg-muted text-muted-foreground hover:text-foreground">
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
                    canViewPrice={canViewPrice}
                    canDelete={canDelete}
                    trigger={
                        canCreate ? (
                        <Button className="gap-2">
                            <Plus size={18} />
                            สร้างงานใหม่
                        </Button>
                        ) : <></>
                    }
                />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentJobs.map((job) => (
                <RecentJobItem 
                    key={job.Job_ID} 
                    job={job}
                    drivers={drivers || []}
                    vehicles={vehicles || []}
                    customers={customers || []}
                    routes={routes || []}
                    canViewPrice={canViewPrice}
                    canDelete={canDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
