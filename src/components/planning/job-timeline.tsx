"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Clock, User, ArrowRight, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { getJobTimeline } from "@/app/calendar/actions"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

interface TimelineLog {
  id: string
  created_at: string
  user_id: string
  username: string
  role: string
  action_type: string
  details: Record<string, unknown>
  target_id?: string
}

export function JobTimeline({ jobId }: { jobId: string }) {
  const { t, language } = useLanguage()
  const [logs, setLogs] = useState<TimelineLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      const data = await getJobTimeline(jobId)
      setLogs(data as TimelineLog[])
      setLoading(false)
    }
    fetchLogs()
  }, [jobId])

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
        <Clock className="animate-spin text-primary" size={32} />
        <p className="text-xs font-black uppercase tracking-widest italic">{t('jobs.dialog.msg_retrieving_history')}</p>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-30 italic">
        <Info size={40} />
        <p className="text-sm font-black uppercase tracking-widest">{t('jobs.dialog.msg_no_activity')}</p>
      </div>
    )
  }

  const ACTION_LABELS: Record<string, string> = {
    CREATE: t('timeline.action_create'),
    UPDATE: t('timeline.action_update'),
    DELETE: t('timeline.action_delete'),
  }

  return (
    <div className="relative space-y-8 p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
      {/* Vertical Line Line */}
      <div className="absolute left-[31px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-primary/50 via-border to-transparent" />

      {logs.map((log, index) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative pl-12 group"
        >
          {/* Timeline Node */}
          <div className={cn(
            "absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center border-2 border-background shadow-xl z-20 group-hover:scale-125 transition-transform",
            log.action_type === 'CREATE' ? "bg-emerald-500 text-white" :
            log.action_type === 'DELETE' ? "bg-rose-500 text-white" :
            "bg-primary text-white"
          )}>
            {log.action_type === 'CREATE' ? <CheckCircle2 size={18} /> : 
             log.action_type === 'UPDATE' ? <Clock size={18} /> : <AlertCircle size={18} />}
          </div>

          <div className="bg-muted/30 border border-border/5 p-5 rounded-[2rem] group-hover:bg-muted/40 transition-colors shadow-sm relative overflow-hidden">
             {/* Action Ticker */}
             <div className="flex items-center justify-between mb-3">
                <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    log.action_type === 'CREATE' ? "bg-emerald-500/20 text-emerald-400" :
                    log.action_type === 'UPDATE' ? "bg-primary/20 text-primary" : "bg-rose-500/20 text-rose-400"
                )}>
                    {ACTION_LABELS[log.action_type] || log.action_type}
                </span>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest tabular-nums">
                    {new Date(log.created_at).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}
                </span>
             </div>

             {/* Description */}
             <div className="flex items-start gap-3">
                 <div className="flex flex-col gap-1 flex-1">
                    <p className="text-sm font-black text-foreground uppercase tracking-tighter leading-relaxed">
                        {log.details?.status_change ? (
                             <span className="flex items-center gap-2">
                                {String(log.details.old_status || 'Unknown')} <ArrowRight size={12} className="text-muted-foreground" /> {String(log.details.new_status || 'Unknown')}
                             </span>
                        ) : (
                            String(log.details?.message || t('jobs.dialog.msg_params_updated'))
                        )}
                    </p>
                    <div className="flex items-center gap-2 mt-2 opacity-60">
                        <User size={12} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{log.username} ({log.role})</span>
                    </div>
                 </div>
             </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
