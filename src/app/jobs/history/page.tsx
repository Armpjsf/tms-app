import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { 
  History, 
  CalendarDays,
  Truck,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  ArrowLeft,
} from "lucide-react"
import { getAllJobs } from "@/lib/supabase/jobs"
import { getJobCreationData } from "@/app/planning/actions"
import { ExcelExport } from "@/components/ui/excel-export"
import { JobHistoryActions } from "@/components/jobs/job-history-actions"

import { isCustomer, hasPermission } from "@/lib/permissions"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function JobHistoryPage(props: Props) {
  const customerMode = await isCustomer()
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const dateFrom = (searchParams.from as string) || ''
  const dateTo = (searchParams.to as string) || ''
  const status = (searchParams.status as string) || ''
  const limit = 25

  // Fetch jobs and creation data for dialog
  const [jobsResult, creationData, canViewPrice, canDelete, canExport] = await Promise.all([
    getAllJobs(page, limit, query, status),
    getJobCreationData(),
    hasPermission('job_price_view'),
    hasPermission('job_delete'),
    hasPermission('job_export')
  ])

  const { data: jobs, count } = jobsResult
  const { drivers, vehicles, customers, routes } = creationData
  
  // Use jobs directly as they are already filtered
  const historyJobs = jobs

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    New: { label: "ใหม่", color: "text-blue-400 bg-blue-500/20", icon: <Package size={14} /> },
    Assigned: { label: "มอบหมายแล้ว", color: "text-indigo-400 bg-indigo-500/20", icon: <Truck size={14} /> },
    "Picked Up": { label: "รับแล้ว", color: "text-cyan-400 bg-cyan-500/20", icon: <Package size={14} /> },
    "In Transit": { label: "กำลังส่ง", color: "text-amber-400 bg-amber-500/20", icon: <Truck size={14} /> },
    Delivered: { label: "ส่งแล้ว", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Complete: { label: "เสร็จสิ้น", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Failed: { label: "ล้มเหลว", color: "text-red-400 bg-red-500/20", icon: <AlertCircle size={14} /> },
    Cancelled: { label: "ยกเลิก", color: "text-slate-400 bg-slate-500/20", icon: <AlertCircle size={14} /> },
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/planning">
            <Button variant="outline" size="icon" className="border-border bg-card hover:bg-muted">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <History className="text-primary" />
              ประวัติงาน
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ประวัติงานทั้งหมดที่ผ่านมา</p>
          </div>
        </div>
        <div className="flex gap-2">
           {canExport && (
           <ExcelExport 
              data={historyJobs} 
              filename={`job_history_${new Date().toISOString().split('T')[0]}`}
              title="ประวัติงาน"
              trigger={
                <Button variant="outline" className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground">
                    <Download className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              }
           />
           )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="p-4">
          <form className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <SearchInput placeholder="ค้นหา Job ID, ลูกค้า, เส้นทาง..." />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> วันที่เริ่มต้น
              </Label>
              <Input
                type="date"
                defaultValue={dateFrom}
                name="from"
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">วันที่สิ้นสุด</Label>
              <Input
                type="date"
                defaultValue={dateTo}
                name="to"
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm flex items-center gap-1">
                <Filter className="w-3 h-3" /> สถานะ
              </Label>
              <select
                name="status"
                defaultValue={status}
                className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground"
              >
                <option value="">ทั้งหมด</option>
                <option value="New">ใหม่</option>
                <option value="Assigned">มอบหมายแล้ว</option>
                <option value="In Progress">กำลังดำเนินงาน</option>
                <option value="Complete">เสร็จสิ้น</option>
                <option value="Delivered">ส่งแล้ว</option>
                <option value="Failed">ล้มเหลว</option>
                <option value="Cancelled">ยกเลิก</option>
              </select>
            </div>
            {/* Added implicit submit button for non-search inputs if needed, or rely on Enter/Form submission logic */}
            <button type="submit" className="hidden" /> 
          </form>
        </CardContent>
      </Card>

      {/* Summary Stats (Compact) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ทั้งหมด</span>
            <span className="text-lg font-bold text-foreground">{count || 0}</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-emerald-600 dark:text-emerald-400/80">สำเร็จ</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
               {jobs?.filter(j => j?.Job_Status === 'Complete' || j?.Job_Status === 'Delivered').length || 0}
            </span>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-red-600 dark:text-red-400/80">ล้มเหลว</span>
            <span className="text-lg font-bold text-red-700 dark:text-red-400">
               {jobs?.filter(j => j?.Job_Status === 'Failed').length || 0}
            </span>
        </div>
        <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400/80">ยกเลิก</span>
            <span className="text-lg font-bold text-slate-700 dark:text-slate-400">
               {jobs?.filter(j => j?.Job_Status === 'Cancelled').length || 0}
            </span>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-foreground text-sm font-medium">รายการงาน</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              ไม่พบประวัติงาน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Job ID</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">วันที่</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">ลูกค้า</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">เส้นทาง</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">คนขับ</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">ทะเบียน</th>
                    {canViewPrice && <th className="text-right p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">ราคาแอร์</th>}
                    {canViewPrice && <th className="text-right p-4 text-xs font-medium text-red-600 dark:text-red-400 uppercase">ต้นทุนรถ</th>}
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">สถานะ</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyJobs.map((job) => (
                    <tr 
                      key={job.Job_ID} 
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-primary font-medium text-sm">{job.Job_ID}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Clock size={14} className="text-muted-foreground" />
                          {job.Plan_Date || "-"}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-foreground font-medium text-sm">{job.Customer_Name || "-"}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-foreground">
                          <MapPin size={14} className="text-muted-foreground" />
                          {job.Route_Name || `${job.Origin_Location || "-"} → ${job.Dest_Location || "-"}`}
                        </div>
                      </td>
                      <td className="p-4 text-foreground text-sm">
                        {job.Driver_Name || "-"}
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {job.Vehicle_Plate || "-"}
                      </td>
                      {canViewPrice && (
                        <td className="p-4 text-right overflow-hidden">
                            <div className="font-medium text-emerald-600 dark:text-emerald-400 text-sm">
                                {typeof job.Price_Cust_Total === 'number' 
                                    ? job.Price_Cust_Total.toLocaleString() 
                                    : (Number(job.Price_Cust_Total) || 0).toLocaleString()}
                            </div>
                        </td>
                      )}
                      {canViewPrice && (
                        <td className="p-4 text-right overflow-hidden">
                            <div className="text-muted-foreground text-sm">
                                {typeof job.Cost_Driver_Total === 'number' 
                                    ? job.Cost_Driver_Total.toLocaleString() 
                                    : (Number(job.Cost_Driver_Total) || 0).toLocaleString()}
                            </div>
                        </td>
                      )}
                      <td className="p-4">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[job.Job_Status]?.color || 'text-muted-foreground bg-muted'
                        }`}>
                          {statusConfig[job.Job_Status]?.icon}
                          {statusConfig[job.Job_Status]?.label || job.Job_Status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                          {!customerMode && (
                              <JobHistoryActions 
                                  job={job}
                                  drivers={drivers}
                                  vehicles={vehicles}
                                  customers={customers}
                                  routes={routes}
                                  canViewPrice={canViewPrice}
                                  canDelete={canDelete}
                              />
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="p-4 border-t border-border">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
