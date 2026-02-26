import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { getJobById } from "@/lib/supabase/jobs"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, User, Package, Navigation, Camera, CheckSquare } from "lucide-react"
import { JobActionButton } from "@/components/mobile/job-action-button"

import { JobWorkflow } from "@/components/mobile/job-workflow"

type Props = {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage(props: Props) {
  const params = await props.params;
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const job = await getJobById(params.id)

  if (!job) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
            ไม่พบข้อมูลงาน
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16">
      <MobileHeader title={`งาน #${job.Job_ID.slice(-4)}`} showBack />
      
      <div className="px-4 py-2">
        <JobWorkflow currentStatus={job.Job_Status || 'New'} />
      </div>

      <div className="px-4 space-y-4">
        {/* Status Banner */}
        <div className={`p-4 rounded-xl flex items-center justify-between ${
             job.Job_Status === 'Completed' ? 'bg-emerald-500/10 border border-emerald-500/20' : 
             job.Job_Status === 'In Progress' ? 'bg-blue-500/10 border border-blue-500/20' :
             'bg-slate-800 border border-slate-700'
        }`}>
            <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Status</p>
                <p className={`font-bold ${
                    job.Job_Status === 'Completed' ? 'text-emerald-400' : 
                    job.Job_Status === 'In Progress' ? 'text-blue-400' :
                    'text-white'
                }`}>{job.Job_Status}</p>
            </div>
            {job.Job_Status !== 'Completed' && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Navigation size={16} /> นำทาง
                </Button>
            )}
        </div>

        {/* Customer Info */}
        <Card className="bg-slate-900 border-white/10">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                        <User className="text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">{job.Customer_Name}</h3>
                        <p className="text-slate-400 text-sm">Customer ID: {job.Customer_ID}</p>
                    </div>
                </div>
                
                <div className="h-px bg-slate-800" />
                
                <div className="space-y-3">
                     <div className="flex items-start gap-3">
                        <MapPin className="text-orange-500 mt-1" size={18} />
                        <div>
                            <p className="text-slate-500 text-xs">ปลายทาง</p>
                            <p className="text-slate-200 text-sm">{job.Dest_Location || job.Route_Name}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <Phone className="text-emerald-500 mt-1" size={18} />
                        <div>
                            <p className="text-slate-500 text-xs">เบอร์ติดต่อ</p>
                            <p className="text-slate-200 text-sm text-blue-400 underline">02-xxx-xxxx</p>
                        </div>
                     </div>
                </div>
            </CardContent>
        </Card>

        {/* Cargo Info */}
        <Card className="bg-slate-900 border-white/10">
             <CardContent className="p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Package size={18} className="text-indigo-400" /> 
                    รายการสินค้า
                </h4>
                <div className="bg-slate-950 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-300">สินค้าทั่วไป (General)</span>
                        <span className="text-white font-medium">10 กล่อง</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-300">น้ำหนักรวม</span>
                        <span className="text-white font-medium">150 Kg</span>
                    </div>
                </div>
             </CardContent>
        </Card>
      
      
        {/* Action Button */}
        <JobActionButton job={job} />

      </div>
    </div>
  )
}
