"use client"

import { motion } from "framer-motion"
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Truck,
  Activity,
  Phone,
  MessageSquare
} from "lucide-react"

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
  const activities = [
    ...(jobStats.total > 0 ? [{
      icon: Package,
      label: `${jobStats.total} งานถูกสร้างวันนี้`,
      time: 'วันนี้',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/10',
    }] : []),
    ...(jobStats.inProgress > 0 ? [{
      icon: Truck,
      label: `${jobStats.inProgress} งานกำลังดำเนินการ`,
      time: 'กำลังดำเนินการ',
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/10',
    }] : []),
    ...(jobStats.delivered > 0 ? [{
      icon: CheckCircle2,
      label: `${jobStats.delivered} งานส่งมอบสำเร็จ`,
      time: 'เสร็จสิ้น',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/10',
    }] : []),
    ...(sosCount > 0 ? [{
      icon: AlertTriangle,
      label: `${sosCount} แจ้งเตือน SOS`,
      time: 'ต้องตรวจสอบ',
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/10',
    }] : []),
    ...(jobStats.pending > 0 ? [{
      icon: Clock,
      label: `${jobStats.pending} งานรอดำเนินการ`,
      time: 'รอมอบหมาย',
      color: 'text-gray-900',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/10',
    }] : []),
  ]

  const hasActivities = activities.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-2xl"
    >
      <div className="p-6 border-b border-gray-100 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-primary rounded-full" />
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Activity size={18} />
          </div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Activity Feed</h2>
          <span className="text-[10px] font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">TODAY</span>
        </div>
      </div>

      <div className="p-4 space-y-1">
        {hasActivities ? (
          activities.map((activity, index) => {
            const Icon = activity.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl ${activity.bgColor} border ${activity.borderColor} hover:scale-[1.01] transition-transform cursor-default`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activity.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{activity.label}</p>
                </div>
                <span className={`text-[10px] font-bold ${activity.color} shrink-0`}>
                  {activity.time}
                </span>
              </motion.div>
            )
          })
        ) : (
          <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <Activity className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-gray-500">No updates for today</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
