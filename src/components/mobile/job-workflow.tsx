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
                "mt-3 text-[11px] font-black text-center uppercase tracking-wider transition-colors duration-500 break-words leading-tight",
                isCompleted || isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
      
      {/* Guidance Overlay - LARGER & CLEARER */}
      {currentIndex < STEPS.length - 1 && normalizedStatus !== 'Completed' && (
        <div className="mt-10 p-7 bg-card border-2 border-primary/20 rounded-[2.5rem] flex items-start gap-6 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Clock size={100} />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary border border-primary/10 shadow-inner">
             <Clock className="animate-spin-slow" size={26} strokeWidth={2.5} />
          </div>
          <div className="space-y-2 relative z-10">
            <p className="text-xs font-black text-primary uppercase tracking-[0.4em] opacity-70">Mission Protocol</p>
            <p className="text-lg font-bold text-foreground leading-relaxed italic">
               {currentIndex === -1 ? 'ตรวจพบงานใหม่ กรุณากด "รับงาน" เพื่อเริ่มภารกิจ' : 
                currentIndex === 0 ? 'ยืนยันรับงานแล้ว เดินทางไปยังจุดรับสินค้าและแจ้งระบบเมื่อถึง' :
                currentIndex === 1 ? 'ถึงจุดรับแล้ว ตรวจสอบสินค้า ถ่ายรูป และกดออกเดินทาง' :
                currentIndex === 2 ? 'อยู่ระหว่างการจัดส่ง นำทางไปยังจุดหมายและแจ้งเมื่อถึง' :
                'ถึงจุดหมายแล้ว ส่งมอบสินค้า ถ่ายรูป และให้ลูกค้าเซ็นชื่อเพื่อปิดงาน'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
