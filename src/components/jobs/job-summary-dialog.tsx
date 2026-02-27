"use client"

import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  MapPin, 
  Truck, 
  User, 
  Calendar, 
  CheckCircle2, 
  Package,
  FileText,
  Check,
  FileX,
  Eye,
  ClipboardList,
  ExternalLink
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Job } from "@/lib/supabase/jobs"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { getJobGPSData } from "@/lib/actions/gps-actions"
import { cn } from "@/lib/utils"
import { OrderTimeline } from "@/components/ui/order-timeline"
// @ts-expect-error - Leaflet may not have types in some environments
import { DriverLocation } from "@/components/maps/leaflet-map"

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

  const jobId = job?.Job_ID
  const driverName = job?.Driver_Name
  const planDate = job?.Plan_Date

  useEffect(() => {
    async function fetchGps() {
      if (open && jobId) {
        setLoadingGps(true)
        try {
          const data = await getJobGPSData(jobId, job.Driver_ID, planDate)
          setGpsData(data as JobGPSData)
        } finally {}
      }
    }
    fetchGps()
  }, [open, jobId, job?.Driver_ID, planDate])

  if (!job) return null

  const pickupPhotos = job.Pickup_Photo_Url ? job.Pickup_Photo_Url.split(',').filter(Boolean) : []
  const podPhotos = job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',').filter(Boolean) : []
  
  // Timeline Logic
  const steps = [
    { id: 'new', label: 'สร้างงาน', icon: Calendar },
    { id: 'assigned', label: 'จัดรถแล้ว', icon: User },
    { id: 'pickup', label: 'รับของแล้ว', icon: Package },
    { id: 'transit', label: 'กำลังส่ง', icon: Truck },
    { id: 'completed', label: 'เสร็จสิ้น', icon: CheckCircle2 },
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
  const gpsPoints = gpsData?.route || []
  const latestLocation = gpsData?.latest
  const mapDrivers: DriverLocation[] = latestLocation ? [{
    id: jobId || 'current',
    name: driverName || 'Driver',
    lat: latestLocation.lat,
    lng: latestLocation.lng,
    status: 'Latest Location',
    lastUpdate: latestLocation.timestamp
  }] : []
  const reportUrl = podPhotos.find(url => url.toUpperCase().includes('REPORT'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-slate-800 bg-slate-950 print:max-h-none print:overflow-visible">
        <DialogTitle className="sr-only">Job Summary - {job.Job_ID}</DialogTitle>
        <DialogDescription className="sr-only">
          Detailed summary for job {job.Job_ID} including timeline, photos, and signatures.
        </DialogDescription>

        <div className="printable-content">
          {/* Print only Header (Simple Text) */}
          <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
             <h1 className="text-2xl font-bold">รายงานสรุปผลการดำเนินงาน (Job Summary Report)</h1>
             <p className="text-sm">Job ID: {job.Job_ID} | วันที่: {job.Plan_Date}</p>
             <p className="text-sm">สถานะ: {job.Job_Status}</p>
          </div>

          {/* Web Header (No Print) */}
          <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md p-6 border-b border-slate-800 flex justify-between items-start no-print">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-indigo-500/20 p-2 rounded-lg">
                  <ClipboardList className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    สรุปผลการดำเนินงาน / Job Summary
                    <span className="h-1 w-1 rounded-full bg-indigo-400/50"></span>
                  </h2>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      {job.Job_ID}
                    </h1>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      job.Job_Status === 'Completed' 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      {job.Job_Status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          {/* Content Wrapper */}
          <div className="p-6 space-y-8">
            {/* Timeline + Info Grid — side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Vertical Order Timeline (Dribbble-inspired) */}
              <div className="lg:col-span-1 bg-slate-900/40 rounded-2xl border border-slate-800/50 p-5 no-print">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                  <h3 className="text-white font-bold text-sm">Order Timeline</h3>
                </div>
                <OrderTimeline 
                  currentStatus={job.Job_Status} 
                  planDate={job.Plan_Date}
                  createdAt={job.created_at}
                />
              </div>

              {/* Right: Basic Info Grid */}
              <div className="lg:col-span-2">

                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-white font-bold border-l-4 border-indigo-500 pl-3">
                        <User size={18} className="text-indigo-400" />
                        <span>ข้อมูลทั่วไป</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 grid grid-cols-2 gap-y-4">
                        <div>
                            <p className="text-[10px] uppercase text-slate-500 mb-1">ลูกค้า (Customer)</p>
                            <p className="text-sm font-medium">{job.Customer_Name || '-'}</p>
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
                            <p className="text-sm font-medium">{job.Driver_Name || job.Driver_ID || '-'}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-white font-bold border-l-4 border-emerald-500 pl-3">
                        <MapPin size={18} className="text-emerald-400" />
                        <span>สถานที่และเวลา</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-4">
                        <div className="flex gap-3">
                            <div className="mt-1"><div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" /></div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-500">ต้นทาง (Origin)</p>
                                <p className="text-xs text-slate-300">{job.Origin_Location || job.Location_Origin_Name || '-'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="mt-1"><MapPin size={14} className="text-emerald-500" /></div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-500">ปลายทาง (Destination)</p>
                                <p className="text-xs white font-medium">{job.Dest_Location || job.Location_Destination_Name || '-'}</p>
                            </div>
                        </div>
                    </div>
                </section>
              </div>
            </div>{/* end Grid */}

            {/* GPS Map Section */}
            <section className="space-y-4 no-print">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin size={16} className="text-indigo-400" />
                ตำแหน่งล่าสุด
              </h3>
              <div className="h-[250px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner relative">
                {(job.Tracking_LAT && job.Tracking_LNG) || gpsPoints.length > 0 || latestLocation ? (
                  <LeafletMap 
                    routeHistory={gpsPoints as [number, number][]}
                    drivers={mapDrivers}
                    center={latestLocation ? [latestLocation.lat, latestLocation.lng] : undefined}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 backdrop-blur-sm">
                    <MapPin size={32} className="mb-2 opacity-20" />
                    <p className="text-xs font-medium">ไม่พบข้อมูลพิกัดสำหรับงานนี้</p>
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pickup Info */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                    <Package size={16} className="text-indigo-400" />
                    จุดรับสินค้า (Pickup Info)
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase no-print">{pickupPhotos.length} รูป</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {pickupPhotos.map((url, i) => (
                    <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                      <Image 
                        src={url} 
                        alt={`Pickup proof ${i}`} 
                        fill 
                        className="object-cover transition-transform duration-500 hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink size={20} className="text-white" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">ลายเซ็น ณ จุดรับ</p>
                  <div className="h-24 flex items-center justify-center border border-dashed border-slate-800 rounded-lg relative overflow-hidden bg-white/5">
                    {job.Signature_Pickup_Url || job.Pickup_Signature_Url ? (
                      <Image 
                        src={job.Signature_Pickup_Url || job.Pickup_Signature_Url} 
                        alt="Pickup Signature" 
                        fill 
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-slate-600 text-xs italic">ไม่มีข้อมูลลายเซ็น</span>
                    )}
                  </div>
                </div>
              </section>

              {/* POD Info */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    การส่งสินค้า (POD Info)
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase no-print">{podPhotos.length} รูป</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {podPhotos.map((url, i) => {
                    const isReport = url.toUpperCase().includes('REPORT');
                    return (
                      <div key={i} className={cn(
                        "relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer",
                        isReport && "col-span-2 aspect-video ring-2 ring-indigo-500/30"
                      )} onClick={() => window.open(url, '_blank')}>
                        <Image 
                          src={url} 
                          alt={`POD proof ${i}`} 
                          fill 
                          className="object-cover transition-transform duration-500 hover:scale-110"
                        />
                        {isReport && (
                          <div className="absolute top-3 left-3 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <FileText size={10} />
                            DIGITAL REPORT
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink size={20} className="text-white" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">ลายเซ็นผู้รับสินค้า</p>
                  <div className="h-24 flex items-center justify-center border border-dashed border-slate-800 rounded-lg relative overflow-hidden bg-white/5">
                    {job.Signature_Proof_Url || job.Signature_Url ? (
                      <Image 
                        src={job.Signature_Proof_Url || job.Signature_Url} 
                        alt="POD Signature" 
                        fill 
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-slate-600 text-xs italic">ไม่มีข้อมูลลายเซ็น</span>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="sticky bottom-0 bg-slate-900/80 backdrop-blur-md p-4 border-t border-slate-800 flex justify-between items-center gap-3 no-print">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
            ปิดหน้าต่าง
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-slate-700 text-slate-300" onClick={() => window.print()}>
              <FileText size={16} />
              พิมพ์รายงาน
            </Button>
            
            {reportUrl ? (
              <Button 
                asChild
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
              >
                <Link href={reportUrl} target="_blank">
                  <Eye size={16} />
                  ดูใบงานตัวจริง
                </Link>
              </Button>
            ) : (
              <Button 
                disabled
                variant="secondary"
                className="gap-2 opacity-50 transition-opacity"
              >
                <FileX size={16} />
                ไม่พบไฟล์ใบงาน
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
