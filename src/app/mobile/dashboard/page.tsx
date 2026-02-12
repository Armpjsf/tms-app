import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Truck, CheckCircle, Clock, MapPin } from "lucide-react"
import { getDriverDashboardStats } from "@/lib/supabase/jobs"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function MobileDashboard() {
  const session = await getDriverSession()
  if (!session) redirect("/login")

  const { stats, currentJob } = await getDriverDashboardStats(session.driverId)

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="Dashboard" />
      
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">สวัสดี, {session.driverName}</h2>
        <p className="text-slate-400 text-sm">พร้อมสำหรับการทำงานวันนี้ไหม?</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-blue-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.total}</span>
            <span className="text-xs text-slate-400">งานที่ต้องทำวันนี้</span>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
            <span className="text-2xl font-bold text-white">{stats.completed}</span>
            <span className="text-xs text-slate-400">งานเสร็จแล้ว</span>
          </CardContent>
        </Card>
      </div>

      {/* Current/Next Job Preview */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">งานปัจจุบัน / ถัดไป</h3>
            {currentJob && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                    ['In Progress', 'In Transit'].includes(currentJob.Job_Status) 
                        ? 'text-blue-400 bg-blue-500/10' 
                        : 'text-amber-400 bg-amber-500/10'
                }`}>
                    {currentJob.Job_Status}
                </span>
            )}
        </div>
        
        {currentJob ? (
            <Link href={`/mobile/jobs/${currentJob.Job_ID}`}>
                <Card className="bg-slate-900 border-white/10 active:scale-95 transition-transform">
                  <CardContent className="p-4 space-y-3">
                     <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <Truck className="text-orange-400" size={20} />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">{currentJob.Job_ID}</h4>
                            <p className="text-slate-400 text-sm">{currentJob.Customer_Name}</p>
                        </div>
                     </div>
                     
                     <div className="pl-13 space-y-2 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[5px] top-1 bottom-1 w-0.5 bg-slate-800" />
                        
                        <div className="flex items-start gap-3 relative">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 relative z-10" />
                            <div>
                                <p className="text-slate-300 text-xs text-ellipsis line-clamp-1">รับ: {currentJob.Origin_Location || 'ไม่ระบุ'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 relative">
                             <div className="w-3 h-3 rounded-full border-2 border-orange-500 bg-slate-900 mt-1 relative z-10" />
                            <div>
                                <p className="text-slate-300 text-xs text-ellipsis line-clamp-1">ส่ง: {currentJob.Dest_Location || currentJob.Route_Name || 'ไม่ระบุ'}</p>
                            </div>
                        </div>
                     </div>
                  </CardContent>
                </Card>
            </Link>
        ) : (
            <Card className="bg-slate-900/50 border-white/5 border-dashed">
                <CardContent className="p-8 text-center">
                    <p className="text-slate-500">ไม่มีงานค้างอยู่ในขณะนี้</p>
                </CardContent>
            </Card>
        )}
      </div>

    </div>
  )
}
