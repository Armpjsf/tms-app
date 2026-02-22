import { getPublicJobDetails } from "@/lib/actions/tracking-actions"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  Package, 
  Truck, 
  MapPin, 
  Calendar, 
  Camera, 
  User, 
  CheckCircle2, 
  ClipboardList,
  ExternalLink
} from "lucide-react"
import Image from "next/image"
import Link from 'next/link'
import { ShareTrackingButton } from "@/components/tracking/share-tracking-button"
import { TrackingMap } from "@/components/tracking/tracking-map"

export const dynamic = 'force-dynamic'

export default async function TrackingPage(props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params
  const { jobId } = params
  const job = await getPublicJobDetails(jobId)

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
        <div className="bg-slate-900 p-8 rounded-full border border-slate-800 shadow-2xl">
            <Package className="h-20 w-20 text-slate-700" />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-white mb-2">ไม่พบข้อมูลงานขนส่ง</h1>
            <p className="text-slate-400 max-w-xs">กรุณาตรวจสอบหมายเลขงาน (Job ID) หรือลิงก์ที่ได้รับจากผู้ให้บริการอีกครั้ง</p>
        </div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm font-bold">กลับหน้าแรก</Link>
      </div>
    )
  }

  // Stepper Logic (Same as internal Job Summary for consistency)
  const steps = [
    { key: 'New', label: 'สร้างงาน', icon: <Calendar size={18} /> },
    { key: 'Assigned', label: 'จัดรถแล้ว', icon: <User size={18} /> },
    { key: 'Picked Up', label: 'รับของแล้ว', icon: <Package size={18} /> },
    { key: 'In Transit', label: 'กำลังส่ง', icon: <Truck size={18} /> },
    { key: 'Completed', label: 'เสร็จสิ้น', icon: <CheckCircle2 size={18} /> },
  ]

  const getCurrentStepIndex = () => {
    const status = job.status
    if (['Delivered', 'Completed', 'Complete'].includes(status)) return 4
    if (status === 'In Transit') return 3
    if (status === 'Picked Up') return 2
    if (status === 'Assigned') return 1
    return 0
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 px-4 pt-4">
      {/* Premium Header Card */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
        
        <div className="p-6 md:p-8 space-y-8">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                        <ClipboardList size={14} />
                        <span>Live Tracking Portfolio</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{job.jobId}</h1>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge className={`px-4 py-1.5 rounded-full text-xs font-bold border-0 shadow-lg ${
                        currentStepIndex === 4 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-indigo-600 text-white'
                    }`}>
                        {job.status}
                    </Badge>
                </div>
            </div>

            {/* Premium Stepper (Horizontal) */}
            <div className="relative px-2 py-4">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                <div 
                    className="absolute top-1/2 left-8 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-700 ease-out" 
                    style={{ width: `${(currentStepIndex / 4) * (100 - 16)}%` }}
                />
                
                <div className="flex justify-between relative z-10">
                    {steps.map((step, idx) => {
                        const isCompleted = idx <= currentStepIndex
                        const isCurrent = idx === currentStepIndex
                        return (
                            <div key={step.key} className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                                    isCurrent 
                                    ? 'bg-indigo-500 border-indigo-400 text-white scale-110 shadow-[0_0_20px_rgba(99,102,241,0.6)]' 
                                    : isCompleted 
                                    ? 'bg-slate-900 border-indigo-500 text-indigo-400' 
                                    : 'bg-slate-950 border-slate-800 text-slate-700'
                                }`}>
                                    {step.icon}
                                </div>
                                <span className={`text-[10px] mt-2 font-bold transition-colors hidden sm:block ${
                                    isCompleted ? 'text-indigo-400' : 'text-slate-700'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* Map Section */}
      {job.lastLocation && (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl rounded-3xl">
            <div className="bg-slate-900/50 p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <MapPin size={16} className="text-emerald-400" />
                    <span>ตำแหน่งพิกัดล่าสุด</span>
                </div>
                <div className="text-[10px] text-slate-500">
                    อัพเดทเมื่อ: {new Date(job.lastLocation.timestamp).toLocaleTimeString('th-TH')}
                </div>
            </div>
            <div className="h-[300px] w-full">
                <TrackingMap 
                    lastLocation={job.lastLocation}
                    driverName={job.driverName}
                    status={job.status}
                />
            </div>
        </Card>
      )}

      {/* Detailed Info Section */}
      <div className="grid grid-cols-1 gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold border-l-4 border-indigo-500 pl-3">
                        <Truck size={18} className="text-indigo-400" />
                        <span>ข้อมูลการจัดส่ง</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                        <p className="text-[10px] uppercase text-slate-500 mb-1">ทะเบียนรถ</p>
                        <p className="text-sm font-bold text-white">{job.vehiclePlate}</p>
                    </div>
                    <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                        <p className="text-[10px] uppercase text-slate-500 mb-1">พนักงานขับรถ</p>
                        <p className="text-sm font-bold text-white">{job.driverName || '-'}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                        <div className="mt-1"><div className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" /></div>
                        <div>
                            <p className="text-[10px] uppercase text-slate-500 mb-1">ต้นทาง (Origin)</p>
                            <p className="text-sm text-slate-200">{job.origin}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                        <div className="mt-1"><MapPin size={16} className="text-emerald-500" /></div>
                        <div>
                            <p className="text-[10px] uppercase text-slate-500 mb-1">ปลายทาง (Destination)</p>
                            <p className="text-sm text-white font-bold">{job.destination}</p>
                        </div>
                    </div>
                </div>
          </section>

          {/* Media Section (Photos) */}
          {(job.pickupPhotos.length > 0 || job.podPhotos.length > 0) && (
              <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center gap-2 text-white font-bold border-l-4 border-purple-500 pl-3">
                        <Camera size={18} className="text-purple-400" />
                        <span>หลักฐานการดำเนินงาน</span>
                    </div>

                    <div className="space-y-8">
                        {/* Pickup Photos */}
                        {job.pickupPhotos.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-400 px-1">รูปถ่ายรับสินค้า (Pickup)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {job.pickupPhotos.map((url, i) => (
                                        <div key={i} className="aspect-video relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner group cursor-pointer">
                                            <Image src={url} alt="Pickup" fill className="object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <ExternalLink size={24} className="text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* POD Photos */}
                        {job.podPhotos.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-400 px-1">รูปถ่ายส่งสินค้า (POD)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {job.podPhotos.map((url, i) => (
                                        <div key={i} className="aspect-video relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner group cursor-pointer">
                                            <Image src={url} alt="POD" fill className="object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <ExternalLink size={24} className="text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Signatures */}
                        {(job.signature || job.pickupSignature) && (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                {job.pickupSignature && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase text-slate-500 text-center">ลายเซ็นจุดรับ</p>
                                        <div className="h-20 bg-white rounded-xl overflow-hidden relative border border-slate-800">
                                            <Image src={job.pickupSignature} alt="Pickup Sig" fill className="object-contain p-2" />
                                        </div>
                                    </div>
                                )}
                                {job.signature && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase text-slate-500 text-center">ลายเซ็นผู้รับสินค้า</p>
                                        <div className="h-20 bg-white rounded-xl overflow-hidden relative border border-slate-800">
                                            <Image src={job.signature} alt="POD Sig" fill className="object-contain p-2" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
              </section>
          )}
      </div>

      {/* Share Section */}
      <div className="text-center pt-8">
        <p className="text-xs text-slate-600 mb-4 font-medium uppercase tracking-widest">
             © 2024 LOGIS-PRO 360. Logistics Evolved.
        </p>
      </div>

      {/* Sticky Mobile Share Button */}
      <ShareTrackingButton jobId={job.jobId} />
    </div>
  )
}
