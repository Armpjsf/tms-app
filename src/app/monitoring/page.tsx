export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Activity, 
  Truck,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react"
import { getTodayJobStats } from "@/lib/supabase/jobs"
import { getDriverStats } from "@/lib/supabase/drivers"
import { getVehicleStats } from "@/lib/supabase/vehicles"
import { getSOSCount } from "@/lib/supabase/sos"

export default async function MonitoringPage() {
  const [jobStats, driverStats, vehicleStats, sosCount] = await Promise.all([
    getTodayJobStats(),
    getDriverStats(),
    getVehicleStats(),
    getSOSCount(),
  ])

  // คำนวณ Delivery Rate
  const deliveryRate = jobStats.total > 0 
    ? ((jobStats.delivered / jobStats.total) * 100).toFixed(1) 
    : 0

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="text-cyan-400" />
          Monitoring
        </h1>
        <p className="text-slate-400">ติดตามสถานะระบบแบบ Real-time</p>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card variant="glass" className="border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Delivery Rate</p>
                <p className="text-3xl font-bold text-emerald-400">{deliveryRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="text-emerald-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className={sosCount > 0 ? "border-red-500/50" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">SOS Alerts</p>
                <p className={`text-3xl font-bold ${sosCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {sosCount}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                sosCount > 0 ? 'bg-red-500/20 animate-pulse' : 'bg-emerald-500/20'
              }`}>
                <AlertTriangle className={sosCount > 0 ? 'text-red-400' : 'text-emerald-400'} size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">คนขับ Active</p>
                <p className="text-3xl font-bold text-indigo-400">{driverStats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Users className="text-indigo-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">รถ Active</p>
                <p className="text-3xl font-bold text-purple-400">{vehicleStats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Truck className="text-purple-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Package className="text-indigo-400" size={20} />
              สถานะงานวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-slate-300">งานทั้งหมด</span>
                </div>
                <span className="text-2xl font-bold text-white">{jobStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">ส่งสำเร็จ</span>
                </div>
                <span className="text-2xl font-bold text-emerald-400">{jobStats.delivered}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-300">กำลังจัดส่ง</span>
                </div>
                <span className="text-2xl font-bold text-amber-400">{jobStats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-300">รอดำเนินการ</span>
                </div>
                <span className="text-2xl font-bold text-blue-400">{jobStats.pending}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex">
                {jobStats.total > 0 && (
                  <>
                    <div 
                      className="bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(jobStats.delivered / jobStats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-amber-500 transition-all duration-500"
                      style={{ width: `${(jobStats.inProgress / jobStats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-blue-500 transition-all duration-500"
                      style={{ width: `${(jobStats.pending / jobStats.total) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="text-cyan-400" size={20} />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-400" size={20} />
                  <span className="text-white">API Server</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">Online</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-400" size={20} />
                  <span className="text-white">Database</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-400" size={20} />
                  <span className="text-white">GPS Tracker</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Clock className="text-slate-400" size={20} />
                  <span className="text-white">Last Update</span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date().toLocaleTimeString('th-TH')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
