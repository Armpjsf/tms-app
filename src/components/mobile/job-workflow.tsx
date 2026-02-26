"use client"

import { CheckCircle2, Clock, MapPin, Package, Truck } from "lucide-react"
import { cn } from "@/lib/utils"

export type JobStep = 'New' | 'Accepted' | 'Arrived Pickup' | 'In Transit' | 'Arrived Dropoff' | 'Completed'

interface JobWorkflowProps {
  currentStatus: string
  className?: string
}

const STEPS: { status: JobStep; label: string; icon: React.ElementType; description: string }[] = [
  { status: 'Accepted', label: 'รับงาน', icon: CheckCircle2, description: 'เตรียมตัวออกเดินทาง' },
  { status: 'Arrived Pickup', label: 'ถึงจุดรับ', icon: MapPin, description: 'ตรวจสอบสิ่งของ' },
  { status: 'In Transit', label: 'ระหว่างทาง', icon: Truck, description: 'กำลังเดินทางส่งของ' },
  { status: 'Arrived Dropoff', label: 'ถึงจุดส่ง', icon: MapPin, description: 'ตรวจสอบสถานที่ส่ง' },
  { status: 'Completed', label: 'ส่งงานสำเร็จ', icon: Package, description: 'บันทึกรูปภาพและลายเซ็น' }
]

export function JobWorkflow({ currentStatus, className }: JobWorkflowProps) {
  // Normalize status
  const normalizedStatus = currentStatus === 'New' || currentStatus === 'Assigned' ? 'Pending' : currentStatus as JobStep
  
  const getStepIndex = (status: string) => {
    if (status === 'Pending') return -1
    return STEPS.findIndex(s => s.status === status)
  }

  const currentIndex = getStepIndex(normalizedStatus)

  return (
    <div className={cn("py-4", className)}>
      <div className="relative flex justify-between">
        {/* Background Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-800" />
        
        {/* Progress Line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-emerald-500 transition-all duration-500" 
          style={{ width: `${Math.max(0, (currentIndex / (STEPS.length - 1)) * 100)}%` }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex || normalizedStatus === 'Completed'
          const isActive = index === currentIndex && normalizedStatus !== 'Completed'
          const StepIcon = step.icon

          return (
            <div key={step.status} className="flex flex-col items-center relative z-10 w-1/5">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted ? "bg-emerald-500 text-white" : 
                  isActive ? "bg-blue-600 text-white ring-4 ring-blue-600/20 animate-pulse" : 
                  "bg-slate-900 border-2 border-slate-700 text-slate-500"
                )}
              >
                <StepIcon size={18} />
              </div>
              <p className={cn(
                "mt-2 text-[10px] font-bold text-center",
                isCompleted || isActive ? "text-slate-200" : "text-slate-500"
              )}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
      
      {/* Dynamic Instruction */}
      {currentIndex < STEPS.length - 1 && normalizedStatus !== 'Completed' && (
        <div className="mt-6 p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg flex items-start gap-3">
          <Clock className="text-blue-400 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-bold text-blue-400">คำแนะนำขั้นตอนปัจจุบัน:</p>
            <p className="text-[11px] text-slate-300">
               {currentIndex === -1 ? 'คุณได้รับมอบหมายงานใหม่ กรุณากดปุ่ม "รับงาน" ด้านล่างเพื่อเริ่มดำเนินการ' : 
                currentIndex === 0 ? 'ขณะนี้คุณกำลังเดินทางไปรับสินค้า เมื่อถึงที่หมายแล้วให้กด "ถึงจุดรับสินค้า"' :
                currentIndex === 1 ? 'กรุณาถ่ายรูปสินค้าและเซ็นชื่อรับของ เพื่อยืนยันการรับสินค้าเข้าระบบ' :
                currentIndex === 2 ? 'กำลังเดินทางไปส่งสินค้า เมื่อถึงที่หมายแล้วให้กด "ถึงจุดส่งสินค้า"' :
                'ถึงที่หมายแล้ว กรุณาถ่ายรูปหลักฐานการส่งมอบสินค้าและให้ลูกค้าเซ็นชื่อเพื่อปิดงาน'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
