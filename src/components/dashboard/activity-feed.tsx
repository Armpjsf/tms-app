"use client"

import { motion } from "framer-motion"
import { 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Truck,
  Activity,
  Package
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityFeedProps {
  jobStats: {
    total: number
    pending: number
    inProgress: number
    delivered: number
  }
  sosCount: number
}

export function ActivityFeed({ jobStats, sosCount }: ActivityFeedProps) {
  const stats = jobStats || { total: 0, pending: 0, inProgress: 0, delivered: 0 }
  const sCount = sosCount || 0

  const activities = [
    ...(sCount > 0 ? [{
      icon: AlertTriangle,
      label: `${sCount} SOS ALERTS ACTIVE`,
      time: 'CRITICAL',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
    }] : []),
    ...(stats.total > 0 ? [{
      icon: Package,
      label: `${stats.total} MISSIONS CREATED`,
      time: 'SYSTEM',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    }] : []),
    ...(stats.inProgress > 0 ? [{
      icon: Truck,
      label: `${stats.inProgress} UNITS IN TRANSIT`,
      time: 'ACTIVE',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/20',
    }] : []),
    ...(stats.delivered > 0 ? [{
      icon: CheckCircle2,
      label: `${stats.delivered} MISSIONS COMPLETED`,
      time: 'SUCCESS',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    }] : []),
    ...(stats.pending > 0 ? [{
      icon: Clock,
      label: `${stats.pending} MISSIONS QUEUED`,
      time: 'PENDING',
      color: 'text-slate-400',
      bgColor: 'bg-white/5',
      borderColor: 'border-white/5',
    }] : []),
  ]

  const hasActivities = activities.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4 font-sans"
    >
      {hasActivities ? (
        activities.map((activity, index) => {
          const Icon = activity.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                  "flex items-center gap-4 p-5 rounded-[2rem] border transition-all hover:scale-[1.02] cursor-default bg-[#0a0518]/40 backdrop-blur-xl group",
                  activity.borderColor
              )}
            >
              <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg",
                  activity.bgColor,
                  activity.color
              )}>
                <Icon size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate tracking-tight uppercase">{activity.label}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", activity.color)}>
                        {activity.time}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">CYCLE REFRESHED</span>
                </div>
              </div>
            </motion.div>
          )
        })
      ) : (
        <div className="p-12 text-center glass-panel rounded-[3rem] border-dashed border-white/5">
          <Activity className="w-12 h-12 text-slate-800 mx-auto mb-4 opacity-20" />
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Operational Silence</p>
        </div>
      )}
    </motion.div>
  )
}
