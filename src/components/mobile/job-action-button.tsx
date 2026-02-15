"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Navigation, 
  Package, 
  MapPin, 
  Truck, 
  CheckSquare, 
  Camera, 
  Loader2,
  ArrowRight
} from "lucide-react"
import { updateJobStatus } from "@/app/mobile/jobs/actions"
import { useRouter } from "next/navigation"

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
    <div className="space-y-3">
        {/* Status Stepper visualization (Optional but helpful) */}
        
        {/* Dynamic Buttons */}
        {(() => {
            switch(job.Job_Status) {
                case 'Assigned': 
                case 'New': // Handle potential variations
                    return (
                        <Button 
                            onClick={() => handleStatusUpdate('Accepted')}
                            disabled={loading}
                            className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 gap-2 font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <CheckSquare />}
                            กดรับงาน
                        </Button>
                    )
                
                case 'Accepted':
                    return (
                        <Button 
                            onClick={() => handleStatusUpdate('Arrived Pickup')}
                            disabled={loading}
                            className="w-full h-14 text-lg bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20 gap-2 font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <MapPin />}
                            ถึงจุดรับสินค้า
                        </Button>
                    )

                case 'Arrived Pickup':
                    return (
                        <Button 
                            onClick={() => router.push(`/mobile/jobs/${job.Job_ID}/pickup`)}
                            disabled={loading}
                            className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 gap-2 font-bold"
                        >
                            <Camera />
                            ถ่ายรูปรับสินค้า / ออกเดินทาง
                        </Button>
                    )

                case 'In Transit':
                    return (
                        <Button 
                            onClick={() => handleStatusUpdate('Arrived Dropoff')}
                            disabled={loading}
                            className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20 gap-2 font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <MapPin />}
                            ถึงจุดส่งสินค้า
                        </Button>
                    )

                case 'Arrived Dropoff':
                    return (
                         <Button 
                            onClick={handlePOD} // Opens POD page
                            disabled={loading}
                            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-2 font-bold"
                        >
                            <Camera />
                            บันทึกส่งงาน (POD)
                        </Button>
                    )

                default:
                    return (
                        <Button 
                            disabled={true}
                            className="w-full h-14 text-lg bg-slate-700 text-slate-400"
                        >
                            ไม่ทราบสถานะ ({job.Job_Status})
                        </Button>
                    )
            }
        })()}
    </div>
  )
}
