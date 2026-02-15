export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Activity, 
  Truck,
  MapPin,
  Clock,
  Phone,
  Navigation,
  AlertCircle
} from "lucide-react"
import { getJobsByStatus, Job } from "@/lib/supabase/jobs"
import { getActiveDrivers, Driver } from "@/lib/supabase/drivers"

export default async function MonitoringPage() {
  const [inProgressJobs, inTransitJobs, activeDrivers] = await Promise.all([
    getJobsByStatus('In Progress'),
    getJobsByStatus('In Transit'),
    getActiveDrivers(),
  ])

  const activeJobs = [...inProgressJobs, ...inTransitJobs].sort((a, b) => 
    new Date(b.Plan_Date || '').getTime() - new Date(a.Plan_Date || '').getTime()
  )

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Activity className="text-emerald-400" />
            Live Operations
            </h1>
            <p className="text-slate-400">ติดตามสถานะงานและรถที่กำลังวิ่งอยู่ (Real-time)</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">Live Updates</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Active Jobs (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Navigation className="text-blue-400" /> 
                    งานที่กำลังวิ่ง ({activeJobs.length})
                </h2>
            </div>
            
            {activeJobs.length === 0 ? (
                <Card className="bg-slate-900/50 border-slate-800 border-dashed">
                    <CardContent className="h-64 flex flex-col items-center justify-center text-slate-500">
                        <Truck size={48} className="mb-4 opacity-50" />
                        <p>ไม่มีงานที่กำลังวิ่งอยู่ในขณะนี้</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {activeJobs.map((job) => (
                        <Card key={job.Job_ID} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                            <CardContent className="p-5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                                            {job.Job_ID.slice(-4)}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{job.Customer_Name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Badge variant="outline" className={`
                                                    ${job.Job_Status === 'In Transit' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-blue-400 border-blue-500/20 bg-blue-500/10'}
                                                `}>
                                                    {job.Job_Status}
                                                </Badge>
                                                <span>• {job.Vehicle_Plate}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-400 text-sm flex items-center gap-1 justify-end">
                                            <Clock size={14} /> 
                                            เริ่มเมื่อ: {job.Plan_Date ? new Date(job.Plan_Date).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' }) : '-'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-4 text-sm">
                                    <div className="flex-1 flex items-start gap-2">
                                        <MapPin size={16} className="text-emerald-400 mt-0.5" />
                                        <div>
                                            <p className="text-slate-500 text-xs">จุดหมายปลายทาง</p>
                                            <p className="text-slate-300">{job.Dest_Location || 'ไม่ระบุ'}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex items-start gap-2">
                                        <Truck size={16} className="text-indigo-400 mt-0.5" />
                                        <div>
                                            <p className="text-slate-500 text-xs">คนขับ</p>
                                            <p className="text-slate-300">{job.Driver_Name || 'ไม่ระบุ'}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>

        {/* Right Column: Active Drivers (1/3 width) */}
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="text-emerald-400" /> 
                คนขับออนไลน์ ({activeDrivers.length})
            </h2>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-0">
                    {activeDrivers.length === 0 ? (
                         <div className="p-8 text-center text-slate-500">
                            ไม่พบคนขับที่ออนไลน์
                         </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {activeDrivers.map((driver) => (
                                <div key={driver.Driver_ID} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                                <Truck size={18} />
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{driver.Driver_Name}</p>
                                            <p className="text-xs text-slate-400">{driver.Vehicle_Plate}</p>
                                        </div>
                                    </div>
                                    <a href={`tel:${driver.Mobile_No}`} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                                        <Phone size={14} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Card className="bg-amber-500/10 border-amber-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2">
                        <AlertCircle size={16} />
                        การแจ้งเตือนด่วน
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-amber-400/80">
                        ขณะนี้ไม่มีการแจ้งเตือน SOS หรืออุบัติเหตุในระบบ
                    </p>
                </CardContent>
            </Card>
        </div>

      </div>
    </DashboardLayout>
  )
}
