"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  CheckSquare, 
  Camera, 
  Loader2,
  ArrowRight,
  MapPin
} from "lucide-react"
import { updateJobStatus } from "@/app/mobile/jobs/actions"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { optimizeRoute } from "@/lib/ai/route-optimizer"
import { updateJob } from "@/app/planning/actions"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

interface Destination {
    name: string
    lat: string
    lng: string
    [key: string]: unknown
}

interface Job {
    Job_ID: string
    Job_Status: string
    original_destinations_json: Destination[]
    Notes: string | null
    [key: string]: unknown
}

interface JobActionButtonProps {
  job: Job
}

export function JobActionButton({ job }: JobActionButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true)
    try {
        const result = await updateJobStatus(job.Job_ID, newStatus)
        if (!result.success) {
            toast.error(result.message)
        } else {
            toast.success("อัปเดตสถานะเรียบร้อย")
        }
    } catch {
        toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ")
    } finally {
        setLoading(false)
    }
  }

  // POD Flow
  const handlePOD = () => {
    router.push(`/mobile/jobs/${job.Job_ID}/complete`)
  }

  const handleOptimizeRoute = async () => {
    setLoading(true)
    try {
        // 1. Get current position
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const origin = {
            name: "Current Location",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        // 2. Prepare destinations
        const dests = job.original_destinations_json || [];
        if (!Array.isArray(dests) || dests.length < 2) {
            toast.info("งานนี้มีจุดหมายเดียว ไม่จำเป็นต้องจัดลำดับใหม่ครับ");
            return;
        }

        // Validate if all dests have lat/lng
        const validDests = dests.map(d => ({
            name: d.name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lng)
        })).filter(d => !isNaN(d.lat) && !isNaN(d.lng));

        if (validDests.length < dests.length) {
            toast.warning("บางจุดหมายไม่มีพิกัด (Lat/Lon) กรุณาแจ้งผู้ควบคุมงานเพื่ออัปเดตข้อมูลพิกัดก่อนครับ");
            return;
        }

        // 3. Call AI Optimizer
        const result = await optimizeRoute(origin, validDests);

        if (result.success) {
            const reordered = result.optimizedOrder.map(idx => dests[idx]);
            
            // 4. Update Job in DB
            const updateRes = await updateJob(job.Job_ID, {
                original_destinations_json: JSON.stringify(reordered),
                Notes: (job.Notes || "") + `\n[AI Optimized Route: ${new Date().toLocaleTimeString()}]`
            });

            if (updateRes.success) {
                toast.success(`AI จัดลำดับเส้นทางใหม่พื่อประหยัดเวลาไปได้ประมาณ ${result.estimatedDurationMinutes} นาที`);
                router.refresh();
            } else {
                toast.error("ไม่สามารถบันทึกลำดับเส้นทางใหม่ได้");
            }
        }
    } catch {
        toast.error("ไม่สามารถเข้าถึงตำแหน่งปัจจุบันของคุณได้ กรุณาเปิด GPS");
    } finally {
        setLoading(false)
    }
  }

  if (job.Job_Status === 'Completed') {
    return (
        <div className="text-center p-4 bg-emerald-500/10 rounded-xl text-emerald-400 font-medium flex items-center justify-center gap-2">
            <CheckSquare /> งานเสร็จสิ้นแล้ว
        </div>
    )
  }

  return (
    <div className="space-y-4">
        {/* Dynamic Buttons */}
        {(() => {
            let label = ""
            let icon = <CheckSquare />
            let colorClass = "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
            let nextAction = ""
            let onClick = () => {}

            switch(job.Job_Status) {
                case 'Assigned': 
                case 'New':
                    label = "กดรับงาน"
                    nextAction = "กดปุ่มเพื่อยืนยันการรับงานนี้"
                    onClick = () => handleStatusUpdate('Accepted')
                    break
                
                case 'Accepted':
                    label = "ถึงจุดรับของ"
                    icon = <MapPin />
                    colorClass = "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                    nextAction = "เมื่อเดินทางถึงสถานที่รับของแล้ว ให้กดปุ่มเพื่อแจ้งระบบ"
                    onClick = () => handleStatusUpdate('Arrived Pickup')
                    break

                case 'Arrived Pickup':
                    label = "ถ่ายรูปรับสินค้า / ออกเดินทาง"
                    icon = <Camera />
                    colorClass = "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                    nextAction = "กรุณาถ่ายรูปสินค้าและเซ็นชื่อ เพื่อยืนยันการรับของ"
                    onClick = () => router.push(`/mobile/jobs/${job.Job_ID}/pickup`)
                    break

                case 'In Transit':
                    label = "ถึงจุดส่งของ"
                    icon = <MapPin />
                    colorClass = "bg-teal-600 hover:bg-teal-700 shadow-teal-500/20"
                    nextAction = "เมื่อเดินทางถึงสถานที่ส่งของแล้ว ให้กดปุ่มเพื่อแจ้งระบบ"
                    onClick = () => handleStatusUpdate('Arrived Dropoff')
                    break

                case 'Arrived Dropoff':
                    label = "บันทึกส่งงาน (POD)"
                    icon = <Camera />
                    colorClass = "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                    nextAction = "ขั้นตอนสุดท้าย: ถ่ายรูปหลักฐานการส่งมอบและให้ลูกค้าเซ็นชื่อ"
                    onClick = handlePOD
                    break

                default:
                    return (
                        <Button disabled={true} className="w-full h-14 text-lg bg-slate-700 text-gray-500">
                             ไม่ทราบสถานะ ({job.Job_Status})
                        </Button>
                    )
            }

            return (
                <div className="space-y-3">
                    {/* Route Optimization Option */}
                    {(job.Job_Status === 'Accepted' || job.Job_Status === 'In Transit' || job.Job_Status === 'Arrived Pickup') && (
                        <Button
                            variant="outline"
                            onClick={handleOptimizeRoute}
                            disabled={loading}
                            className="w-full h-14 rounded-2xl border-emerald-500/30 bg-emerald-50/50 text-emerald-700 font-black gap-2 hover:bg-emerald-100 transition-all border-dashed"
                        >
                            <Sparkles className="text-emerald-500 animate-pulse" size={18} />
                            วิเคราะห์เส้นทางที่ดีที่สุดด้วย AI
                        </Button>
                    )}

                    <p className="text-[11px] text-gray-500 italic text-center px-4">
                        {nextAction}
                    </p>
                    <Button 
                        onClick={onClick}
                        disabled={loading}
                        className={cn(
                            "w-full h-20 text-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] gap-4 font-black uppercase tracking-widest transition-all active:scale-95 rounded-[2rem] relative overflow-hidden group",
                            colorClass
                        )}
                    >
                        {/* Premium Shine Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10 flex items-center justify-center gap-4">
                            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : icon}
                            {label}
                            <ArrowRight size={24} className="ml-1 opacity-40 group-hover:translate-x-2 transition-transform duration-500" />
                        </div>
                    </Button>
                </div>
            )
        })()}
    </div>
  )
}
