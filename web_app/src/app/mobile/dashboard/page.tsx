import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Truck, CheckCircle, Clock, MapPin } from "lucide-react"

export default async function MobileDashboard() {
  const session = await getDriverSession()
  if (!session) redirect("/login")

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
            <span className="text-2xl font-bold text-white">2</span>
            <span className="text-xs text-slate-400">งานที่ต้องทำ</span>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
            <span className="text-2xl font-bold text-white">5</span>
            <span className="text-xs text-slate-400">งานเสร็จแล้ว</span>
          </CardContent>
        </Card>
      </div>

      {/* Current/Next Job Preview */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">งานปัจจุบัน</h3>
            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">In Progress</span>
        </div>
        <Card className="bg-slate-900 border-white/10">
          <CardContent className="p-4 space-y-3">
             <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Truck className="text-orange-400" size={20} />
                </div>
                <div>
                    <h4 className="text-white font-medium">JOB-6702-001</h4>
                    <p className="text-slate-400 text-sm">บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)</p>
                </div>
             </div>
             
             <div className="pl-13 space-y-2 relative">
                {/* Timeline Line */}
                <div className="absolute left-[5px] top-1 bottom-1 w-0.5 bg-slate-800" />
                
                <div className="flex items-start gap-3 relative">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 relative z-10" />
                    <div>
                        <p className="text-slate-300 text-xs">รับสินค้า: คลังสินค้า A1</p>
                        <p className="text-slate-500 text-[10px]">08:30 น.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 relative">
                     <div className="w-3 h-3 rounded-full border-2 border-orange-500 bg-slate-900 mt-1 relative z-10" />
                    <div>
                        <p className="text-slate-300 text-xs">ส่งสินค้า: สาขาบางนา</p>
                        <p className="text-slate-500 text-[10px]">กำลังเดินทาง...</p>
                    </div>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
