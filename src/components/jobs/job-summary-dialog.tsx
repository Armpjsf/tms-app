"use client"

import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  ClipboardList, 
  MapPin, 
  Truck, 
  User, 
  Calendar, 
  CheckCircle2, 
  ExternalLink,
  Package,
  FileText
} from "lucide-react"
import Image from "next/image"
import { Job } from "@/lib/supabase/jobs"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { getJobGPSData } from "@/lib/actions/gps-actions"

const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), { 
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-slate-900 animate-pulse rounded-xl" />
})

interface GPSPoint {
  lat: number
  lng: number
  timestamp: string
}

interface JobGPSData {
  route: [number, number][]
  latest: GPSPoint | null
}

type JobSummaryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job | any
}

export function JobSummaryDialog({ open, onOpenChange, job }: JobSummaryDialogProps) {
  const [gpsData, setGpsData] = useState<JobGPSData | null>(null)
  const [loadingGps, setLoadingGps] = useState(false)

  const jobId = job?.Job_ID
  const driverName = job?.Driver_Name
  const planDate = job?.Plan_Date

  useEffect(() => {
    async function fetchGps() {
      if (open && jobId) {
        setLoadingGps(true)
        try {
          const data = await getJobGPSData(jobId, driverName, planDate)
          setGpsData(data as JobGPSData) // Cast to the defined JobGPSData type
        } finally {
          setLoadingGps(false)
        }
      }
    }
    fetchGps()
  }, [open, jobId, driverName, planDate])

  if (!job) return null

  const pickupPhotos = job.Pickup_Photo_Url ? job.Pickup_Photo_Url.split(',').filter(Boolean) : []
  const podPhotos = job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',').filter(Boolean) : []
  const signature = job.Signature_Url
  const pickupSignature = job.Pickup_Signature_Url

  // Timeline Logic
  const steps = [
    { key: 'New', label: 'สร้างงาน', icon: <Calendar size={18} /> },
    { key: 'Assigned', label: 'จัดรถแล้ว', icon: <User size={18} /> },
    { key: 'Picked Up', label: 'รับของแล้ว', icon: <Package size={18} /> },
    { key: 'In Transit', label: 'กำลังส่ง', icon: <Truck size={18} /> },
    { key: 'Completed', label: 'เสร็จสิ้น', icon: <CheckCircle2 size={18} /> },
  ]

  const getCurrentStepIndex = () => {
    const status = job.Job_Status
    if (['Delivered', 'Completed', 'Complete'].includes(status)) return 4
    if (status === 'In Transit') return 3
    if (status === 'Picked Up') return 2
    if (status === 'Assigned') return 1
    return 0
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-200 p-0">
        <DialogTitle className="sr-only">Job Summary - {job.Job_ID}</DialogTitle>
        <DialogDescription className="sr-only">
          Detailed summary for job {job.Job_ID} including timeline, photos, and signatures.
        </DialogDescription>
        
        {/* Banner / Header */}
        <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900 p-6 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 mb-1">
                        <ClipboardList size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">สรุปผลการดำเนินงาน / Job Summary</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">{job.Job_ID}</h2>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        currentStepIndex === 4 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                    }`}>
                        {job.Job_Status}
                    </span>
                    <p className="text-xs text-slate-500">{job.Plan_Date}</p>
                </div>
            </div>

            {/* Premium Stepper (Horizontal) */}
            <div className="mt-8 relative px-4">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                <div 
                    className="absolute top-1/2 left-8 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500" 
                    style={{ width: `${(currentStepIndex / 4) * (100 - 16)}%` }}
                />
                
                <div className="flex justify-between relative z-10">
                    {steps.map((step, idx) => {
                        const isCompleted = idx <= currentStepIndex
                        const isCurrent = idx === currentStepIndex
                        return (
                            <div key={step.key} className="flex flex-col items-center group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                                    isCurrent 
                                    ? 'bg-indigo-500 border-indigo-400 text-white scale-110 shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                                    : isCompleted 
                                    ? 'bg-slate-900 border-indigo-500 text-indigo-400' 
                                    : 'bg-slate-950 border-slate-800 text-slate-600'
                                }`}>
                                    {step.icon}
                                </div>
                                <span className={`text-[10px] mt-2 font-medium transition-colors ${
                                    isCompleted ? 'text-indigo-400' : 'text-slate-600'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        <div className="p-6 space-y-8 pb-12">
            {/* Grid 1: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-white font-bold border-l-4 border-indigo-500 pl-3">
                        <User size={18} className="text-indigo-400" />
                        <span>ข้อมูลทั่วไป</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 grid grid-cols-2 gap-y-4">
                        <div>
                            <p className="text-[10px] uppercase text-slate-500 mb-1">ลูกค้า (Customer)</p>
                            <p className="text-sm font-medium">{job.Customer_Name}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-slate-500 mb-1">เส้นทาง (Route)</p>
                            <p className="text-sm font-medium">{job.Route_Name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-slate-500 mb-1">ทะเบียนรถ (Vehicle)</p>
                            <p className="text-sm font-medium">{job.Vehicle_Plate || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-slate-500 mb-1">คนขับ (Driver)</p>
                            <p className="text-sm font-medium">{job.Driver_Name || '-'}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-white font-bold border-l-4 border-indigo-500 pl-3">
                        <MapPin size={18} className="text-emerald-400" />
                        <span>สถานที่และเวลา</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-4">
                        <div className="flex gap-3">
                            <div className="mt-1"><div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" /></div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-500">ต้นทาง (Origin)</p>
                                <p className="text-xs text-slate-300">{job.Origin_Location || '-'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="mt-1"><MapPin size={14} className="text-emerald-500" /></div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-500">ปลายทาง (Destination)</p>
                                <p className="text-xs text-white font-medium">{job.Dest_Location || '-'}</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Map Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between text-white font-bold border-l-4 border-amber-500 pl-3">
                    <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-amber-400" />
                        <span>แผนที่ติดตามงาน (Live Tracking Map)</span>
                    </div>
                    {gpsData?.latest && (
                        <span className="text-[10px] text-slate-500">Update: {new Date(gpsData.latest.timestamp).toLocaleTimeString('th-TH')}</span>
                    )}
                </div>
                <div className="h-[300px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-900 flex items-center justify-center">
                    {loadingGps ? (
                        <div className="flex flex-col items-center gap-3">
                            <Truck className="h-8 w-8 text-slate-700 animate-bounce" />
                            <span className="text-[10px] text-slate-600 uppercase tracking-widest">กำลังดึงพิกัด...</span>
                        </div>
                    ) : (gpsData?.latest || (gpsData?.route && gpsData.route.length > 0)) ? (
                        <LeafletMap 
                            height="300px"
                            center={gpsData?.latest ? [gpsData.latest.lat, gpsData.latest.lng] : (gpsData?.route?.[0] as [number, number])}
                            zoom={14}
                            routeHistory={gpsData?.route as [number, number][]}
                            drivers={gpsData?.latest ? [{
                                id: job.Driver_Name,
                                name: job.Driver_Name,
                                lat: gpsData.latest.lat,
                                lng: gpsData.latest.lng,
                                status: job.Job_Status as string
                            }] : []}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-600">
                             <MapPin size={32} />
                             <p className="text-xs">ไม่พบข้อมูลพิกัดสำหรับงานนี้</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Grid 2: Media Section (Photos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pickup Section */}
                <section className="space-y-4">
                     <div className="flex items-center justify-between text-white font-bold border-l-4 border-cyan-500 pl-3">
                        <div className="flex items-center gap-2">
                            <Package size={18} className="text-cyan-400" />
                            <span>จุดรับสินค้า (Pickup Info)</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{pickupPhotos.length} รูป</span>
                    </div>
                    
                    <div className="space-y-4">
                        {pickupPhotos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {pickupPhotos.map((url: string, i: number) => (
                                    <div key={i} className="aspect-video relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                        <Image src={url} alt="Pickup" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <ExternalLink size={20} className="text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-24 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 text-xs italic">
                                ไม่มีรูปที่จุดรับ
                            </div>
                        )}

                        {/* Signature */}
                        <div className="bg-white/5 rounded-xl p-3 border border-slate-800">
                             <p className="text-[10px] uppercase text-slate-500 mb-2">ลายเซ็น ณ จุดรับ</p>
                             <div className="h-24 relative flex items-center justify-center bg-white/5 rounded bg-slate-100">
                                {pickupSignature ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={pickupSignature} alt="Pickup Signature" className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <span className="text-slate-400 text-[10px] italic">ไม่มีข้อมูลลายเซ็น</span>
                                )}
                             </div>
                        </div>
                    </div>
                </section>

                 {/* Delivery Section */}
                 <section className="space-y-4">
                     <div className="flex items-center justify-between text-white font-bold border-l-4 border-emerald-500 pl-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-emerald-400" />
                            <span>การส่งสินค้า (POD Info)</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{podPhotos.length} รูป</span>
                    </div>

                    <div className="space-y-4">
                         {podPhotos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {podPhotos.map((url: string, i: number) => (
                                    <div key={i} className={`aspect-video relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer ${i === 0 && 'col-span-2 aspect-[21/9]'}`} onClick={() => window.open(url, '_blank')}>
                                        <Image src={url} alt="POD" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                        {i === 0 && (
                                            <div className="absolute top-2 left-2 bg-blue-600 text-[10px] px-2 py-0.5 rounded font-bold text-white shadow-lg">
                                                DIGITAL REPORT
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <ExternalLink size={20} className="text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-24 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 text-xs italic">
                                ไม่มีรูปที่จุดส่ง
                            </div>
                        )}

                        {/* Signature */}
                        <div className="bg-white/5 rounded-xl p-3 border border-slate-800">
                             <p className="text-[10px] uppercase text-slate-500 mb-2">ลายเซ็นผู้รับสินค้า</p>
                             <div className="h-24 relative flex items-center justify-center bg-white/5 rounded bg-slate-100">
                                {signature ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={signature} alt="Delivery Signature" className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <span className="text-slate-400 text-[10px] italic">ไม่มีข้อมูลลายเซ็น</span>
                                )}
                             </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        {/* Action Footer */}
        <div className="sticky bottom-0 bg-slate-900/80 backdrop-blur-md p-4 border-t border-slate-800 flex justify-between items-center gap-3">
             <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
                ปิดหน้าต่าง
             </Button>
             <div className="flex gap-2">
                <Button variant="outline" className="gap-2 border-slate-700 text-slate-300" onClick={() => window.print()}>
                    <FileText size={16} />
                    พิมพ์รายงาน
                </Button>
                {podPhotos.length > 0 && (
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => window.open(podPhotos[0], '_blank')}>
                        <ExternalLink size={16} />
                        ดูใบงานตัวจริง
                    </Button>
                )}
             </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
