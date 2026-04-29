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
import { toast } from "sonner"
import { parseISO, isAfter, startOfDay } from "date-fns"

interface Destination {
    name: string
    lat: string
    lng: string
    [key: string]: unknown
}

interface Job {
    Job_ID: string
    Job_Status: string
    Plan_Date: string | null
    Delivery_Date: string | null
    original_destinations_json: Destination[]
    Notes: string | null
    [key: string]: unknown
}

interface JobActionButtonProps {
  job: Job
}

export function JobActionButton({ job }: JobActionButtonProps) {
  const [loading, setLoading] = useState(false)
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null)
  const router = useRouter()

  const currentStatus = optimisticStatus || job.Job_Status

  const handleStatusUpdate = async (newStatus: string) => {
    const today = startOfDay(new Date())

    // 1. Block Future Jobs (Task 2)
    if (job.Plan_Date) {
        const planDate = startOfDay(parseISO(job.Plan_Date))
        if (isAfter(planDate, today)) {
            toast.error("ไม่สามารถเริ่มงานได้ก่อนวันเริ่มงานจริง", {
                description: `งานนี้กำหนดเริ่มวันที่ ${new Date(job.Plan_Date).toLocaleDateString('th-TH')}`
            })
            return
        }
    }

    // 2. Block Early Arrival at Dropoff for Long-haul (Task 3)
    if (newStatus === 'Arrived Dropoff' && job.Delivery_Date) {
        const deliveryDate = startOfDay(parseISO(job.Delivery_Date))
        if (isAfter(deliveryDate, today)) {
            toast.error("ยังไม่ถึงกำหนดส่งงาน", {
                description: `งานนี้กำหนดส่งวันที่ ${new Date(job.Delivery_Date).toLocaleDateString('th-TH')}`
            })
            return
        }
    }

    setLoading(true)
    setOptimisticStatus(newStatus)
    try {
        const result = await updateJobStatus(job.Job_ID, newStatus)
        if (!result.success) {
            toast.error(result.message)
            setOptimisticStatus(null)
        } else {
            toast.success("อัปเดตสถานะเรียบร้อย")
        }
    } catch {
        toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ")
        setOptimisticStatus(null)
    } finally {
        setLoading(false)
    }
  }

  // POD Flow
  const handlePOD = () => {
    // 1. Block Future Delivery (Task 3)
    if (job.Delivery_Date) {
        const deliveryDate = startOfDay(parseISO(job.Delivery_Date))
        const today = startOfDay(new Date())
        
        if (isAfter(deliveryDate, today)) {
            toast.error("ยังไม่ถึงกำหนดส่งงาน", {
                description: `งานนี้กำหนดส่งวันที่ ${new Date(job.Delivery_Date).toLocaleDateString('th-TH')}`
            })
            return
        }
    }
    router.push(`/mobile/jobs/${job.Job_ID}/complete`)
  }


  if (currentStatus === 'Completed') {
    const isVerified = job.Verification_Status === 'Verified'

    return (
        <div className="flex flex-col gap-2">
            <div className="text-center p-3 bg-emerald-500/10 rounded-xl text-emerald-400 font-medium flex items-center justify-center gap-2 text-xs">
                <CheckSquare size={18} /> งานเสร็จสิ้นแล้ว {isVerified && "(ตรวจสอบแล้ว)"}
            </div>
            {!isVerified && (
                <Button 
                    onClick={handlePOD}
                    variant="outline"
                    className="w-full h-12 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 font-bold"
                >
                    แก้ไขจำนวนสินค้า
                </Button>
            )}
        </div>
    )
  }

  return (
    <div className="space-y-3">
        {/* Dynamic Buttons */}
        {(() => {
            let label = ""
            let icon = <CheckSquare />
            let colorClass = "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
            let nextAction = ""
            let onClick = () => {}

            switch(currentStatus) {
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
                    nextAction = "ขั้นตอนสุดท้าย: ถ่ายรูปหลักฐานการส่งมอบ"
                    onClick = handlePOD
                    break

                default:
                    return (
                        <Button disabled={true} className="w-full h-12 text-sm bg-slate-700 text-muted-foreground">
                             ไม่ทราบสถานะ ({currentStatus})
                        </Button>
                    )
            }

            return (
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-muted-foreground italic text-center px-4 uppercase tracking-[0.2em]">
                        {nextAction}
                    </p>
                    <Button 
                        onClick={onClick}
                        disabled={loading}
                        className={cn(
                            "w-full h-16 text-lg shadow-lg gap-4 font-black uppercase tracking-widest transition-all active:scale-95 rounded-2xl relative overflow-hidden group",
                            colorClass
                        )}
                    >
                        {/* Premium Shine Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10 flex items-center justify-center gap-4">
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : icon}
                            {label}
                            <ArrowRight size={20} className="ml-1 opacity-40 group-hover:translate-x-2 transition-transform duration-500" />
                        </div>
                    </Button>
                </div>
            )
        })()}
    </div>
  )
}

