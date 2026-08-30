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
import { useLanguage } from "@/components/providers/language-provider"

interface ActivityFeedProps {
  jobStats: {
    total: number
    pending: number
    inProgress: number
    delivered: number
  }
  sosCount: number
  logs?: Record<string, unknown>[]
}

type ActivityItem = {
  icon: React.ElementType
  label: string
  time: string
  color: string
  bgColor: string
  borderColor: string
  timestamp?: string
}

function getDetailsDescription(details: unknown) {
  if (details && typeof details === 'object' && 'description' in details) {
    const description = (details as { description?: unknown }).description
    return typeof description === 'string' ? description : undefined
  }
  return undefined
}

export function ActivityFeed({ jobStats, sosCount, logs = [] }: ActivityFeedProps) {
  const { t } = useLanguage()
  const stats = jobStats || { total: 0, pending: 0, inProgress: 0, delivered: 0 }
  const sCount = sosCount || 0

  const formatLogTime = (dateStr?: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleString('th-TH', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    }).replace(',', '')
  }

  // Combine real logs with summary items
  const activities: ActivityItem[] = [
    ...(sCount > 0 ? [{
      icon: AlertTriangle,
      label: t('dashboard.activity.sos_active', { count: sCount }),
      time: t('dashboard.activity.critical'),
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
    }] : []),
    // Real system logs mapping
    ...(logs.map(log => ({
      icon: log.action_type === 'CREATE' ? Package : log.action_type === 'APPROVE' ? CheckCircle2 : Activity,
      label: `${String(log.module || 'System')}: ${getDetailsDescription(log.details) || String(log.action_type || '')}`,
      time: typeof log.username === 'string' ? log.username : 'System',
      color: log.action_type === 'CREATE' ? 'text-primary' : 'text-accent',
      bgColor: log.action_type === 'CREATE' ? 'bg-primary/10' : 'bg-accent/10',
      borderColor: log.action_type === 'CREATE' ? 'border-primary/20' : 'border-accent/20',
      timestamp: typeof log.created_at === 'string' ? log.created_at : undefined
    }))),
    ...(stats.total > 0 && logs.length === 0 ? [{
      icon: Package,
      label: t('dashboard.activity.missions_created', { count: stats.total }),
      time: t('dashboard.activity.system'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    }] : []),
    ...(stats.inProgress > 0 ? [{
      icon: Truck,
      label: t('dashboard.activity.units_in_transit', { count: stats.inProgress }),
      time: t('dashboard.activity.active'),
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/20',
    }] : []),
    ...(stats.delivered > 0 ? [{
      icon: CheckCircle2,
      label: t('dashboard.activity.missions_completed', { count: stats.delivered }),
      time: t('dashboard.activity.success'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    }] : []),
    ...(stats.pending > 0 ? [{
      icon: Clock,
      label: t('dashboard.activity.missions_queued', { count: stats.pending }),
      time: t('dashboard.activity.pending'),
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border/5',
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
        activities.map((rawActivity, index) => {
          const activity = rawActivity
          const Icon = activity.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-muted/30 cursor-default bg-card group",
                  activity.borderColor
              )}
            >
              <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  activity.bgColor,
                  activity.color
              )}>
                <Icon size={16} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{activity.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("text-xs font-medium", activity.color)}>
                        {activity.time}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span className="text-xs font-medium text-muted-foreground truncate">
                        {activity.timestamp ? formatLogTime(activity.timestamp) : t('dashboard.activity.cycle_refreshed')}
                    </span>
                </div>
              </div>
            </motion.div>
          )
        })
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border">
          <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-muted-foreground">{t('dashboard.activity.operational_silence')}</p>
        </div>
      )}
    </motion.div>
  )
}

