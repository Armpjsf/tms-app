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

interface JobActionButtonProps {
  job: any
}

export function JobActionButton({ job }: JobActionButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true)
    try {
        const result = await updateJobStatus(job.Job_ID, newStatus)
        if (!result.success) {
            alert(result.message)
        }
    } catch (e) {
        alert("เกิดข้อผิดพลาด")
    } finally {
        setLoading(false)
    }
  }

  // POD Flow
  const handlePOD = () => {
    // Navigate to camera/POD page (to be implemented or simple alert for now)
    // Assuming we have a camera page or we just complete it directly for this demo
    // The user mentioned "บันทึกส่งงาน (POD)" existing, so we simulate that
    router.push(`/mobile/jobs/${job.Job_ID}/complete`)
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
            let colorClass = "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
            let nextAction = ""
            let onClick = () => {}

            switch(job.Job_Status) {
                case 'Assigned': 
                case 'New':
                    label = "กดรับงาน"
                    nextAction = "เมื่อได้รับงานนี้แล้ว ให้กดปุ่มเพื่อยืนยันการรับงาน"
                    onClick = () => handleStatusUpdate('Accepted')
                    break
                
                case 'Accepted':
                    label = "ถึงจุดรับสินค้า"
                    icon = <MapPin />
                    colorClass = "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                    nextAction = "เมื่อเดินทางถึงสถานที่รับสินค้าแล้ว ให้กดปุ่มเพื่อแจ้งระบบ"
                    onClick = () => handleStatusUpdate('Arrived Pickup')
                    break

                case 'Arrived Pickup':
                    label = "ถ่ายรูปรับสินค้า / ออกเดินทาง"
                    icon = <Camera />
                    colorClass = "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                    nextAction = "กรุณาถ่ายรูปสินค้าและเซ็นชื่อ เพื่อยืนยันการรับของ"
                    onClick = () => router.push(`/mobile/jobs/${job.Job_ID}/pickup`)
                    break

                case 'In Transit':
                    label = "ถึงจุดส่งสินค้า"
                    icon = <MapPin />
                    colorClass = "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
                    nextAction = "เมื่อเดินทางถึงสถานที่ส่งสินค้าแล้ว ให้กดปุ่มเพื่อแจ้งระบบ"
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
                        <Button disabled={true} className="w-full h-14 text-lg bg-slate-700 text-slate-400">
                             ไม่ทราบสถานะ ({job.Job_Status})
                        </Button>
                    )
            }

            return (
                <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 italic text-center px-4">
                        {nextAction}
                    </p>
                    <Button 
                        onClick={onClick}
                        disabled={loading}
                        className={cn(
                            "w-full h-16 text-lg shadow-lg gap-3 font-bold transition-all active:scale-95",
                            colorClass
                        )}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : icon}
                        {label}
                        <ArrowRight size={20} className="ml-1 opacity-50" />
                    </Button>
                </div>
            )
        })()}
    </div>
  )
}
