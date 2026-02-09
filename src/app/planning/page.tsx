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
} from "lucide-react"
import { getTodayJobStats, getTodayJobs } from "@/lib/supabase/jobs"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { JobDialog } from "@/components/planning/job-dialog"

export default async function PlanningPage() {
  const [stats, todayJobs, drivers, vehicles] = await Promise.all([
    getTodayJobStats(),
    getTodayJobs(),
    getAllDrivers(),
    getAllVehicles(),
  ])

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
          <JobDialog 
              mode="create" 
              drivers={drivers.data} 
              vehicles={vehicles.data}
              trigger={
                  <Button size="lg" className="gap-2">
                      <Plus size={20} />
                      สร้างงานใหม่
                  </Button>
              }
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
              <JobDialog 
                  mode="create" 
                  drivers={drivers.data} 
                  vehicles={vehicles.data}
                  trigger={
                      <Button className="gap-2">
                          <Plus size={18} />
                          สร้างงานใหม่
                      </Button>
                  }
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentJobs.map((job) => (
                <div key={job.Job_ID} className="p-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{job.Job_ID}</p>
                        <p className="text-sm text-slate-400">{job.Customer_Name || "-"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.Job_Status === 'Complete' || job.Job_Status === 'Delivered' 
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : job.Job_Status === 'In Transit' || job.Job_Status === 'Picked Up'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {job.Job_Status}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">{job.Plan_Date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
