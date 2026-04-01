"use client"

import { CheckCircle2, Clock, MapPin, Package, Truck, Zap, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export type JobStep = 'New' | 'Accepted' | 'Arrived Pickup' | 'In Transit' | 'Arrived Dropoff' | 'Completed'

interface JobWorkflowProps {
  currentStatus: string
  className?: string
}

const STEPS: { status: JobStep; label: string; icon: React.ElementType; description: string }[] = [
  { status: 'Accepted', label: 'รับงาน', icon: ShieldCheck, description: 'ยืนยันรับภารกิจ' },
  { status: 'Arrived Pickup', label: 'จุดรับ', icon: MapPin, description: 'ถึงจุดรับสินค้า' },
  { status: 'In Transit', label: 'ขนส่ง', icon: Truck, description: 'กำลังเดินทาง' },
  { status: 'Arrived Dropoff', label: 'จุดส่ง', icon: MapPin, description: 'ถึงจุดหมาย' },
  { status: 'Completed', label: 'สำเร็จ', icon: Package, description: 'ส่งมอบเรียบร้อย' }
]

export function JobWorkflow({ currentStatus, className }: JobWorkflowProps) {
  // Normalize status
  const normalizedStatus = (currentStatus === 'New' || currentStatus === 'Assigned') ? 'Pending' : currentStatus as JobStep
  
  const getStepIndex = (status: string) => {
    if (status === 'Pending') return -1
    return STEPS.findIndex(s => s.status === status)
  }

  const currentIndex = getStepIndex(normalizedStatus)

  return (
    <div className={cn("py-6", className)}>
      <div className="relative flex justify-between px-2">
        {/* Background Tactical Line */}
        <div className="absolute top-6 left-0 w-full h-1 bg-muted/50 rounded-full" />
        
        {/* Active Progress Line */}
        <div 
          className="absolute top-6 left-0 h-1 bg-gradient-to-r from-primary to-accent transition-all duration-700 shadow-[0_0_15px_rgba(255,30,133,0.4)]" 
          style={{ width: `${Math.max(0, (currentIndex / (STEPS.length - 1)) * 100)}%` }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex || normalizedStatus === 'Completed'
          const isActive = index === currentIndex && normalizedStatus !== 'Completed'
          const StepIcon = step.icon

          return (
            <div key={step.status} className="flex flex-col items-center relative z-10 w-1/5 px-1">
              <div 
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 shadow-2xl",
                  isCompleted ? "bg-primary border-primary text-white" : 
                  isActive ? "bg-card border-primary/50 text-primary ring-8 ring-primary/5 animate-pulse" : 
                  "bg-card border-border/5 text-muted-foreground"
                )}
              >
                <StepIcon size={20} className={isActive ? "animate-bounce" : ""} />
              </div>
              <p className={cn(
                "mt-3 text-[9px] font-black text-center uppercase tracking-wider transition-colors duration-500 break-words leading-tight",
                isCompleted || isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
      
      {/* Tactical Guidance Overlay */}
      {currentIndex < STEPS.length - 1 && normalizedStatus !== 'Completed' && (
        <div className="mt-10 p-6 bg-card border-2 border-primary/10 rounded-[2.5rem] flex items-start gap-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Clock size={80} />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
             <Clock className="animate-spin-slow" size={22} strokeWidth={2.5} />
          </div>
          <div className="space-y-2 relative z-10">
            <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">ขั้นตอนปัจจุบัน</p>
            <p className="text-base font-bold text-foreground leading-relaxed">
               {currentIndex === -1 ? 'ตรวจพบงานใหม่ กรุณากด "รับงาน" เพื่อเริ่มเข้าสู่ระบบการขนส่ง' : 
                currentIndex === 0 ? 'ยืนยันรับงานเรียบร้อย กรุณาเดินทางไปยังจุดรับสินค้าและแจ้งระบบเมื่อถึงที่หมาย' :
                currentIndex === 1 ? 'ถึงจุดรับสินค้าแล้ว กรุณาตรวจสอบความถูกต้อง ถ่ายรูปสินค้า และกดออกเดินทาง' :
                currentIndex === 2 ? 'กำลังอยู่ระหว่างการขนส่ง กรุณานำทางไปยังจุดหมายปลายทางและแจ้งระบบเมื่อถึง' :
                'ถึงจุดหมายแล้ว กรุณาทำการส่งมอบ ถ่ายรูปหลักฐาน และให้ลูกค้าเซ็นชื่อเพื่อจบงาน'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
