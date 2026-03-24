"use client"

import { CheckCircle2, Clock, MapPin, Package, Truck, Zap, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export type JobStep = 'New' | 'Accepted' | 'Arrived Pickup' | 'In Transit' | 'Arrived Dropoff' | 'Completed'

interface JobWorkflowProps {
  currentStatus: string
  className?: string
}

const STEPS: { status: JobStep; label: string; icon: React.ElementType; description: string }[] = [
  { status: 'Accepted', label: 'ASSIGNED', icon: ShieldCheck, description: 'Mission briefing received' },
  { status: 'Arrived Pickup', label: 'ORIGIN', icon: MapPin, description: 'Secure payload at base' },
  { status: 'In Transit', label: 'TRANSIT', icon: Truck, description: 'Tactical deployment underway' },
  { status: 'Arrived Dropoff', label: 'TARGET', icon: MapPin, description: 'Securing drop zone' },
  { status: 'Completed', label: 'DELIVERED', icon: Package, description: 'Mission success verified' }
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
    <div className={cn("py-6", className)}>
      <div className="relative flex justify-between px-2">
        {/* Background Tactical Line */}
        <div className="absolute top-6 left-0 w-full h-1 bg-white/5 rounded-full" />
        
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
            <div key={step.status} className="flex flex-col items-center relative z-10 w-1/5">
              <div 
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 shadow-2xl",
                  isCompleted ? "bg-primary border-primary text-white" : 
                  isActive ? "bg-secondary border-primary/50 text-primary ring-8 ring-primary/10 animate-pulse" : 
                  "bg-slate-900 border-white/5 text-slate-700"
                )}
              >
                <StepIcon size={20} className={isActive ? "animate-bounce" : ""} />
              </div>
              <p className={cn(
                "mt-3 text-base font-bold font-black text-center uppercase tracking-widest transition-colors duration-500",
                isCompleted || isActive ? "text-white" : "text-slate-700"
              )}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
      
      {/* Tactical Guidance Overlay */}
      {currentIndex < STEPS.length - 1 && normalizedStatus !== 'Completed' && (
        <div className="mt-10 p-6 glass-panel border-primary/20 rounded-[2rem] flex items-start gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-2 duration-500 delay-300">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
             <Clock className="text-primary animate-spin-slow" size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold font-black text-primary uppercase tracking-[0.3em]">Current Protocol:</p>
            <p className="text-lg font-bold text-slate-300 font-bold leading-relaxed">
               {currentIndex === -1 ? 'New mission detected. Tap "ACCEPT MISSION" to engage deployment protocols.' : 
                currentIndex === 0 ? 'Asset transit initiated. Proceed to ORIGIN point and secure the payload.' :
                currentIndex === 1 ? 'Payload reached. Verify cargo integrity, document assets, and clear for transit.' :
                currentIndex === 2 ? 'Mission in critical path. Navigate to TARGET drop zone and ensure secure arrival.' :
                'Drop zone reached. Finalize delivery, collect biometric signatures, and close mission file.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

