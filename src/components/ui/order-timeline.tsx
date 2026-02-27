"use client"

import { cn } from "@/lib/utils"
import { 
  Calendar, 
  User, 
  Package, 
  Truck, 
  CheckCircle2,
  Clock,
  MapPin
} from "lucide-react"

interface OrderTimelineProps {
  currentStatus: string
  planDate?: string
  createdAt?: string
  className?: string
}

const STEPS = [
  { 
    id: 'new', 
    label: 'สร้างงาน', 
    labelEn: 'Order Created',
    icon: Calendar, 
    description: 'สร้างคำสั่งงานเข้าระบบ',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    activeColor: 'text-indigo-400',
    activeBg: 'bg-indigo-500/20',
    completedColor: 'text-emerald-400',
    completedBg: 'bg-emerald-500/20',
  },
  { 
    id: 'assigned', 
    label: 'จัดรถแล้ว', 
    labelEn: 'Truck Assigned',
    icon: User, 
    description: 'มอบหมายงานให้คนขับ',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    activeColor: 'text-blue-400',
    activeBg: 'bg-blue-500/20',
    completedColor: 'text-emerald-400',
    completedBg: 'bg-emerald-500/20',
  },
  { 
    id: 'pickup', 
    label: 'รับสินค้าแล้ว', 
    labelEn: 'Picked Up',
    icon: Package, 
    description: 'รับสินค้าจากต้นทาง',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    activeColor: 'text-amber-400',
    activeBg: 'bg-amber-500/20',
    completedColor: 'text-emerald-400',
    completedBg: 'bg-emerald-500/20',
  },
  { 
    id: 'transit', 
    label: 'กำลังขนส่ง', 
    labelEn: 'On Route',
    icon: Truck, 
    description: 'กำลังเดินทางไปปลายทาง',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    activeColor: 'text-orange-400',
    activeBg: 'bg-orange-500/20',
    completedColor: 'text-emerald-400',
    completedBg: 'bg-emerald-500/20',
    showBadge: true,
  },
  { 
    id: 'completed', 
    label: 'ส่งมอบสำเร็จ', 
    labelEn: 'Delivered',
    icon: CheckCircle2, 
    description: 'ยืนยันการส่งมอบสินค้า',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    activeColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/20',
    completedColor: 'text-emerald-400',
    completedBg: 'bg-emerald-500/20',
  },
]

function getStepIndex(status: string): number {
  if (['Delivered', 'Completed', 'Complete'].includes(status)) return 4
  if (status === 'In Transit') return 3
  if (status === 'Picked Up') return 2
  if (status === 'Assigned') return 1
  return 0
}

export function OrderTimeline({ currentStatus, planDate, createdAt, className }: OrderTimelineProps) {
  const currentIndex = getStepIndex(currentStatus)

  return (
    <div className={cn("py-2", className)}>
      <div className="relative">
        {STEPS.map((step, index) => {
          const isCompleted = index <= currentIndex
          const isActive = index === currentIndex
          const isPending = index > currentIndex
          const Icon = step.icon
          const isLast = index === STEPS.length - 1

          return (
            <div key={step.id} className="relative flex gap-4">
              {/* Vertical Line Connector */}
              {!isLast && (
                <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%-16px)]">
                  <div className={cn(
                    "w-full h-full rounded-full transition-colors duration-500",
                    isCompleted && index < currentIndex ? "bg-emerald-500/50" : "bg-slate-800"
                  )} />
                </div>
              )}

              {/* Icon Circle */}
              <div className="relative z-10 flex-shrink-0">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                  isCompleted && !isActive
                    ? `${step.completedBg} border-emerald-500/30 ${step.completedColor}`
                    : isActive
                    ? `${step.activeBg} border-current ${step.activeColor} shadow-lg ring-4 ring-current/10`
                    : `${step.bgColor} border-slate-800 ${step.color}`
                )}>
                  <Icon size={18} />
                </div>
              </div>

              {/* Content */}
              <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                <div className="flex items-center gap-3">
                  <div>
                    <p className={cn(
                      "text-sm font-bold transition-colors",
                      isCompleted ? "text-white" : "text-slate-500"
                    )}>
                      {step.label}
                    </p>
                    <p className={cn(
                      "text-[10px] font-medium uppercase tracking-wider",
                      isCompleted ? "text-slate-400" : "text-slate-600"
                    )}>
                      {step.labelEn}
                    </p>
                  </div>
                  {isActive && step.showBadge && (
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-bold rounded-full border border-orange-500/30 animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                
                {/* Timestamp Row */}
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={10} className={isCompleted ? "text-slate-500" : "text-slate-700"} />
                  <span className={cn(
                    "text-[10px]",
                    isCompleted ? "text-slate-500" : "text-slate-700"
                  )}>
                    {index === 0 && createdAt 
                      ? new Date(createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
                      : index === 0 && planDate
                      ? planDate
                      : isCompleted
                      ? 'เสร็จสิ้น'
                      : 'รอดำเนินการ'
                    }
                  </span>
                </div>

                {/* Description */}
                <p className={cn(
                  "text-[11px] mt-1",
                  isCompleted ? "text-slate-500" : "text-slate-700"
                )}>
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
