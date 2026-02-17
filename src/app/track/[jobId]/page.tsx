import { getPublicJobDetails } from "@/lib/actions/tracking-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Package, Truck, MapPin, Calendar, Camera, User } from "lucide-react"
import Image from "next/image"

export const dynamic = 'force-dynamic'

export default async function TrackingPage(props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params
  const { jobId } = params
  const job = await getPublicJobDetails(jobId)

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <Package className="h-16 w-16 text-slate-600" />
        <h1 className="text-2xl font-bold text-white">ไม่พบข้อมูลงานขนส่ง</h1>
        <p className="text-slate-400">กรุณาตรวจสอบหมายเลขงาน (Job ID) หรือลิงก์ที่ได้รับอีกครั้ง</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'Completed':
          case 'Delivered': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
          case 'In Progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
          case 'Pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
          case 'Cancelled': return 'bg-red-500/20 text-red-400 border-red-500/50'
          default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50'
      }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">TMS Tracking</h1>
        <p className="text-slate-400 text-sm">ติดตามสถานะการจัดส่งของคุณ</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Tracking Number</p>
                <h2 className="text-2xl font-mono text-white tracking-widest">{job.trackingCode}</h2>
            </div>
            <Badge variant="outline" className={`${getStatusColor(job.status)} px-3 py-1 capitalize`}>
                {job.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            
            {/* Route Info */}
            <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                <div className="relative">
                    <div className="absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 border-slate-600 bg-slate-900"></div>
                    <p className="text-xs text-slate-500 mb-1">ต้นทาง (Origin)</p>
                    <p className="text-white font-medium">{job.origin}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar size={12} /> {new Date(job.pickupDate || job.planDate).toLocaleDateString('th-TH')}
                    </p>
                </div>
                <div className="relative">
                    <div className={`absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 ${job.status === 'Delivered' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600 bg-slate-900'}`}></div>
                    <p className="text-xs text-slate-500 mb-1">ปลายทาง (Destination)</p>
                    <p className="text-white font-medium">{job.destination}</p>
                    {job.deliveryDate && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                            <Calendar size={12} /> ส่งถึงเมื่อ: {new Date(job.deliveryDate).toLocaleString('th-TH')}
                        </p>
                    )}
                </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Driver Info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-full">
                        <User size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">พนักงานขับรถ</p>
                        <p className="text-sm font-medium text-white">{job.driverName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-full">
                        <Truck size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">ทะเบียนรถ</p>
                        <p className="text-sm font-medium text-white">{job.vehiclePlate}</p>
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Photos & Proof */}
            {job.photos.length > 0 && (
                <div>
                     <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Camera size={16} /> รูปภาพสินค้า / หลักฐานการส่ง
                     </h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {job.photos.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700">
                                <Image 
                                    src={url} 
                                    alt={`Proof ${idx + 1}`} 
                                    fill 
                                    className="object-cover hover:scale-105 transition-transform" 
                                />
                            </div>
                        ))}
                     </div>
                </div>
            )}
            
            {job.signature && (
                 <div className="mt-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">ลายเซ็นผู้รับ</h3>
                    <div className="relative h-24 w-48 border border-slate-700 rounded-lg bg-white/5">
                        <Image 
                            src={job.signature} 
                            alt="Signature" 
                            fill 
                            className="object-contain p-2 inverted-colors" 
                        />
                    </div>
                 </div>
            )}

        </CardContent>
      </Card>
      
      <div className="text-center pt-8">
        <p className="text-xs text-slate-600">
             © 2024 LOGIS-PRO 360. All rights reserved.
        </p>
      </div>
    </div>
  )
}
