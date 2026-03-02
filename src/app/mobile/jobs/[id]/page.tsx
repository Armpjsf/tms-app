import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { getJobById } from "@/lib/supabase/jobs"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, User, Package, CheckCircle, ArrowRight, Calendar } from "lucide-react"
import { JobActionButton } from "@/components/mobile/job-action-button"
import { JobWorkflow } from "@/components/mobile/job-workflow"
import { NavigationButton } from "@/components/mobile/navigation-button"
import { RouteStrip } from "@/components/mobile/route-strip"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}

export default async function JobDetailPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const success = searchParams.success;
  
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const job = await getJobById(params.id)

  if (!job) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">
            ไม่พบข้อมูลงาน
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-16">
      <MobileHeader title={`งาน #${job.Job_ID.slice(-4)}`} showBack />
      
      {/* Success Notification */}
      {success && (
        <div className="px-4 py-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-600">
                <CheckCircle className="animate-in zoom-in duration-300" />
                <div className="text-sm">
                    <p className="font-bold uppercase tracking-tight">
                        {success === 'pickup' ? 'รับสินค้าเรียบร้อย!' : 'ส่งงานเรียบร้อย!'}
                    </p>
                    <p className="opacity-80 font-medium">บันทึกข้อมูลเข้าระบบแล้ว</p>
                </div>
            </div>
        </div>
      )}

      <div className="px-4 py-2">
        <JobWorkflow currentStatus={job.Job_Status || 'New'} />
      </div>

      {/* Route Strip — Dribbble-inspired Origin → Destination */}
      <div className="px-4 py-2">
        <RouteStrip 
          origin={job.Origin_Location}
          destination={job.Dest_Location || job.Route_Name}
          destinations={job.original_destinations_json}
          status={job.Job_Status}
        />
      </div>

      <div className="px-4 space-y-4">
        {/* Status Banner */}
        <div className={`p-5 rounded-[1.5rem] flex items-center justify-between shadow-sm border ${
             job.Job_Status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/20' : 
             job.Job_Status === 'In Progress' ? 'bg-white border-emerald-500/20 shadow-emerald-500/5' :
             'bg-white border-gray-100'
        }`}>
            <div>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Status</p>
                <p className={`text-lg font-black tracking-tight ${
                    job.Job_Status === 'Completed' ? 'text-emerald-600' : 
                    job.Job_Status === 'In Progress' ? 'text-emerald-500' :
                    'text-gray-900'
                }`}>{job.Job_Status}</p>
            </div>
            {job.Job_Status !== 'Completed' && (
                <NavigationButton job={job} />
            )}
        </div>

        {/* Date Summary Card */}
        <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-black/5 overflow-hidden">
            <div className="p-5 grid grid-cols-2 divide-x divide-gray-100">
                <div className="pr-4 flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-500 mt-0.5">
                        <Calendar size={16} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">วันที่รับสินค้า</p>
                        <p className="text-gray-900 text-sm font-black">
                            {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                        </p>
                    </div>
                </div>
                <div className="pl-4 flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500 mt-0.5">
                        <Calendar size={16} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">วันที่ส่ง</p>
                        <p className="text-gray-900 text-sm font-black">
                            {job.Delivery_Date ? new Date(job.Delivery_Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Customer Info Card */}
        <Card className="bg-white border-gray-100 rounded-[2rem] shadow-xl shadow-black/5 overflow-hidden">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-inner">
                        <User className="text-emerald-500" size={24} />
                    </div>
                    <div>
                        <h3 className="text-gray-900 font-black text-xl tracking-tight leading-none mb-1">{job.Customer_Name}</h3>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Customer ID: {job.Customer_ID}</p>
                    </div>
                </div>
                
                <div className="h-px bg-gray-50 -mx-6" />
                
                <div className="space-y-5">
                     <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 bg-orange-50 rounded-xl text-orange-500">
                            <MapPin size={18} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Delivery Destination</p>
                            <p className="text-gray-900 text-sm font-bold leading-relaxed">{job.Dest_Location || job.Route_Name}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 bg-emerald-50 rounded-xl text-emerald-500">
                            <Phone size={18} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Contact Channel</p>
                            <p className="text-emerald-600 text-sm font-black underline decoration-2 underline-offset-4">02-xxx-xxxx</p>
                        </div>
                     </div>
                </div>
            </CardContent>
        </Card>

        {/* Cargo Details Card */}
        <Card className="bg-white border-gray-100 rounded-[2rem] shadow-xl shadow-black/5">
             <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-gray-900 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                        <Package size={18} className="text-emerald-500" /> 
                        Cargo Details
                    </h4>
                </div>
                <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100 shadow-inner">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">ประเภทสินค้า</span>
                        <span className="text-gray-900 font-black">{job.Cargo_Type || '-'}</span>
                    </div>
                    {(job.Weight_Kg ?? 0) > 0 && (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200/50">
                            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">น้ำหนัก</span>
                            <span className="text-emerald-600 font-black text-lg">{job.Weight_Kg?.toLocaleString()} Kg</span>
                        </div>
                    )}
                    {(job.Volume_Cbm ?? 0) > 0 && (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200/50">
                            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">ปริมาตร</span>
                            <span className="text-blue-600 font-black">{job.Volume_Cbm} CBM</span>
                        </div>
                    )}
                    {job.Notes && (
                        <div className="pt-2 border-t border-gray-200/50">
                            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider block mb-1">หมายเหตุ</span>
                            <p className="text-gray-700 text-sm">{job.Notes}</p>
                        </div>
                    )}
                </div>
             </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="pt-2">
            <JobActionButton job={job} />
        </div>

        {/* Payment Preview Card */}
        {job.Show_Price_To_Driver && (
            <Card className="bg-slate-900 border-emerald-500/20 rounded-[2rem] shadow-2xl relative overflow-hidden group mb-8">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <CheckCircle size={120} className="text-emerald-500" />
                </div>
                <CardContent className="p-6 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <CheckCircle size={20} className="text-emerald-400" /> 
                        </div>
                        <h4 className="text-white font-black text-xs uppercase tracking-[0.2em]">Estimate Earning</h4>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col items-center">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Trip Value</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter">
                            ฿{(job.Cost_Driver_Total || 0).toLocaleString()}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                            Verified Rates <ArrowRight size={10} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  )
}
