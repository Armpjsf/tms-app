export const dynamic = 'force-dynamic'
export const revalidate = 0

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { StatsGrid } from "@/components/ui/stats-grid"
import { DataSection } from "@/components/ui/data-section"
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
  ArrowLeft,
  XCircle,
  ListFilter
} from "lucide-react"
import { getAllJobs } from "@/lib/supabase/jobs"
import { getJobCreationData } from "@/app/planning/actions"
import { ExcelExport } from "@/components/ui/excel-export"
import { JobHistoryActions } from "@/components/jobs/job-history-actions"
import { HistoryStatusFilter } from "@/components/jobs/history-status-filter"
import NextImage from "next/image"

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
    "In Transit": { label: "กำลังเดินทาง", color: "text-amber-400 bg-amber-500/20", icon: <Truck size={14} /> },
    Delivered: { label: "ส่งแล้ว", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Completed: { label: "เสร็จสิ้น", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Complete: { label: "เสร็จสิ้น", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Failed: { label: "ล้มเหลว", color: "text-red-400 bg-red-500/20", icon: <AlertCircle size={14} /> },
    Cancelled: { label: "ยกเลิก", color: "text-slate-400 bg-slate-500/20", icon: <AlertCircle size={14} /> },
  }

  return (
    <DashboardLayout>
      <PageHeader
        icon={<History size={28} />}
        title="ประวัติงาน"
        subtitle="ประวัติงานทั้งหมดที่ผ่านมา"
        actions={
          <div className="flex gap-2">
            <Link href="/planning">
              <Button variant="outline" className="h-11 rounded-xl border-slate-800 bg-slate-950/50 hover:bg-slate-900 text-slate-300 hover:text-white">
                <ArrowLeft className="h-5 w-5 mr-2" />
                กลับ
              </Button>
            </Link>
            {canExport && (
            <ExcelExport 
               data={historyJobs} 
               filename={`job_history_${new Date().toISOString().split('T')[0]}`}
               title="ประวัติงาน"
               trigger={
                 <Button variant="outline" className="h-11 rounded-xl border-slate-800 bg-slate-950/50 hover:bg-slate-900 text-slate-300 hover:text-white">
                     <Download className="w-4 h-4 mr-2" /> Export Excel
                 </Button>
               }
            />
            )}
          </div>
        }
      />

      {/* Filters */}
      <DataSection title="ตัวกรอง" icon={<ListFilter size={18} />}>
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
                className="bg-slate-900/60 border-slate-800 text-foreground rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">วันที่สิ้นสุด</Label>
              <Input
                type="date"
                defaultValue={dateTo}
                name="to"
                className="bg-slate-900/60 border-slate-800 text-foreground rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <HistoryStatusFilter initialValue={status} />
            </div>
            <button type="submit" className="hidden" /> 
          </form>
      </DataSection>

      <div className="mt-6">
      <StatsGrid columns={4} stats={[
        { label: "ทั้งหมด", value: count || 0, icon: <Package size={20} />, color: "indigo" },
        { label: "สำเร็จ", value: jobs?.filter(j => ['Delivered', 'Complete', 'Completed'].includes(j?.Job_Status || '')).length || 0, icon: <CheckCircle2 size={20} />, color: "emerald" },
        { label: "ล้มเหลว", value: jobs?.filter(j => j?.Job_Status === 'Failed').length || 0, icon: <AlertCircle size={20} />, color: "red" },
        { label: "ยกเลิก", value: jobs?.filter(j => j?.Job_Status === 'Cancelled').length || 0, icon: <XCircle size={20} />, color: "purple" },
      ]} />
      </div>

      <DataSection title="รายการงาน" icon={<History size={18} />} noPadding>
          {historyJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              ไม่พบประวัติงาน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Job ID</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">วันที่</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">ลูกค้า</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">เส้นทาง</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">คนขับ</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">ทะเบียน</th>
                    <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase">รูปถ่าย/ลายเซ็น</th>
                    {canViewPrice && <th className="text-right p-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">ราคาค่าขนส่ง</th>}
                    {canViewPrice && <th className="text-right p-4 text-xs font-bold text-red-600 dark:text-red-400 uppercase">ต้นทุนรถ</th>}
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">สถานะ</th>
                    <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyJobs.map((job) => (
                    <tr 
                      key={job.Job_ID} 
                      className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors"
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
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                             {job.Photo_Proof_Url && (
                                <div className="relative w-10 h-10 rounded-lg border border-slate-800 overflow-hidden bg-muted group">
                                    <NextImage 
                                        src={job.Photo_Proof_Url.split(',')[0]} 
                                        alt="POD Photo" 
                                        fill 
                                        className="object-cover group-hover:scale-110 transition-transform" 
                                    />
                                    <a href={job.Photo_Proof_Url.split(',')[0]} target="_blank" rel="noreferrer" className="absolute inset-0 z-10" />
                                </div>
                             )}
                             {job.Signature_Url && (
                                <div className="relative w-14 h-10 rounded-lg border border-slate-800 overflow-hidden bg-white group">
                                    <NextImage 
                                        src={job.Signature_Url} 
                                        alt="Signature" 
                                        fill 
                                        className="object-contain p-1 group-hover:scale-110 transition-transform" 
                                    />
                                    <a href={job.Signature_Url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10" />
                                </div>
                             )}
                             {!job.Photo_Proof_Url && !job.Signature_Url && (
                                <span className="text-muted-foreground/30 text-xs">-</span>
                             )}
                        </div>
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
          
          <div className="p-4 border-t border-slate-800">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
      </DataSection>
    </DashboardLayout>
  )
}
