"use client"

import { useState, useTransition, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Truck, 
  User, 
  Plus, 
  Zap, 
  Target, 
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CalendarJob, getJobsForMonth, getJobById } from "./actions"
import { JobDialog } from "@/components/planning/job-dialog"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Route } from "@/lib/supabase/routes"
import { Job } from "@/lib/supabase/jobs"
import { PremiumButton } from "@/components/ui/premium-button"
import { useLanguage } from "@/components/providers/language-provider"
import { toast } from "sonner"

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-500",
  Pending: "bg-amber-500",
  Confirmed: "bg-[#00f2ff]", // Cyan
  "In Progress": "bg-[#7000ff]", // Electric Purple
  Delivered: "bg-[#00ff88]", // Neon Green
  Completed: "bg-[#00ff88]",
  Finished: "bg-[#00ff88]",
  Closed: "bg-slate-600",
  Cancelled: "bg-primary", // Magenta for cancelled
}

interface Props {
  initialJobs: CalendarJob[]
  initialYear: number
  initialMonth: number
  drivers: Driver[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes: Route[]
}

export function CalendarClient({ 
  initialJobs, 
  initialYear, 
  initialMonth,
  drivers,
  vehicles,
  customers,
  routes
}: Props) {
  const { t, language } = useLanguage()
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [jobs, setJobs] = useState<CalendarJob[]>(initialJobs)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const STATUS_LABELS: Record<string, string> = {
    Draft: t('common.pending'),
    Pending: t('common.pending'),
    Confirmed: t('common.success'),
    "In Progress": t('common.loading'),
    Delivered: t('common.success'),
    Completed: t('common.success'),
    Finished: t('common.success'),
    Closed: t('common.success'),
    Cancelled: t('common.error'),
  }

  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  const changeMonth = (delta: number) => {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 1) { newMonth = 12; newYear-- }
    if (newMonth > 12) { newMonth = 1; newYear++ }
    setMonth(newMonth)
    setYear(newYear)
    setSelectedDate(null)
    startTransition(async () => {
      const data = await getJobsForMonth(newYear, newMonth)
      setJobs(data)
    })
  }

  const goToToday = () => {
    const now = new Date()
    const newYear = now.getFullYear()
    const newMonth = now.getMonth() + 1
    setYear(newYear)
    setMonth(newMonth)
    setSelectedDate(formatDate(now))
    startTransition(async () => {
      const data = await getJobsForMonth(newYear, newMonth)
      setJobs(data)
    })
  }

  const handleEditJob = async (jobId: string) => {
    try {
      setLoadingEdit(true)
      const fullJob = await getJobById(jobId)
      if (fullJob) {
        setEditingJob(fullJob)
        setIsEditOpen(true)
      } else {
        toast.error(t('calendar.error_data'))
      }
    } catch (err) {
      console.error(err)
      toast.error(t('calendar.error_uplink'))
    } finally {
      setLoadingEdit(false)
    }
  }

  const jobsByDate: Record<string, CalendarJob[]> = {}
  jobs.forEach((job: CalendarJob) => {
    const d = job.Plan_Date
    if (!jobsByDate[d]) jobsByDate[d] = []
    jobsByDate[d].push(job)
  })

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayStr = formatDate(new Date())
  const selectedJobs = selectedDate ? (jobsByDate[selectedDate] || []) : []
  const statusCounts: Record<string, number> = {}
  jobs.forEach((j: CalendarJob) => { statusCounts[j.Job_Status] = (statusCounts[j.Job_Status] || 0) + 1 })

  return (
    <div className="space-y-8 pb-20">
      {/* Tactical Header */}
      <div className="bg-background p-10 rounded-br-[5rem] rounded-tl-[3rem] border border-border/5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
               <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(255,30,133,1)]" />
               <h1 className="text-4xl font-black text-foreground tracking-widest uppercase leading-none">{t('navigation.calendar')}</h1>
            </div>
            <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-base font-bold">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
             <PremiumButton onClick={goToToday} variant="outline" className="border-border/10 hover:border-primary/50 text-muted-foreground h-14 px-8 rounded-2xl">
                {t('calendar.today')}
             </PremiumButton>
             <PremiumButton onClick={() => setIsDialogOpen(true)} className="h-14 px-8 rounded-2xl gap-3 shadow-[0_15px_30px_rgba(255,30,133,0.3)]">
                <Plus size={20} /> {t('navigation.request_mission')}
             </PremiumButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-2">
         {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="bg-card hover:bg-muted/30 border border-border/40 p-5 rounded-[2rem] flex items-center justify-between group transition-all shadow-sm">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{STATUS_LABELS[status] || status}</span>
                    <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">{count}</span>
                </div>
                <div className={cn("w-1.5 h-12 rounded-full shadow-sm", STATUS_COLORS[status] || "bg-slate-500")} />
            </div>
         ))}
      </div>

      {/* Main Calendar Matrix */}
      <div className="bg-background rounded-[3.5rem] border border-border/5 shadow-2xl overflow-hidden">
        {/* Navigation Control */}
        <div className="flex items-center justify-between px-10 py-10 bg-muted/20 border-b border-border/5">
          <button onClick={() => changeMonth(-1)} className="p-4 rounded-2xl bg-background hover:bg-primary hover:text-white transition-all text-muted-foreground border border-border/10 shadow-sm">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
             <h2 className="text-4xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
                {t(`months.${monthKeys[month-1]}` as any)} <span className="text-primary italic px-3 py-1 bg-primary/10 rounded-xl">{language === 'th' ? year + 543 : year}</span>
             </h2>
             {isPending && <div className="text-xs font-black text-primary uppercase tracking-[0.3em] animate-pulse mt-2">{t('calendar.syncing')}</div>}
          </div>
          <button onClick={() => changeMonth(1)} className="p-4 rounded-2xl bg-background hover:bg-primary hover:text-white transition-all text-muted-foreground border border-border/10 shadow-sm">
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Day Header Matrix */}
        <div className="grid grid-cols-7 bg-muted/5 border-b border-border/5">
          {dayKeys.map((dayKey, i) => {
            const dayConfig = [
              { text: "text-rose-500", bg: "bg-rose-500/5" },    // Sun - Red
              { text: "text-amber-500", bg: "bg-amber-500/5" },  // Mon - Yellow
              { text: "text-pink-500", bg: "bg-pink-500/5" },    // Tue - Pink
              { text: "text-emerald-600", bg: "bg-emerald-600/5" }, // Wed - Green
              { text: "text-orange-500", bg: "bg-orange-500/5" }, // Thu - Orange
              { text: "text-sky-500", bg: "bg-sky-500/5" },     // Fri - Blue
              { text: "text-violet-500", bg: "bg-violet-500/5" }  // Sat - Purple
            ][i];
            
            return (
              <div key={i} className={cn(
                "text-center py-6 text-sm font-black uppercase tracking-[0.3em]",
                dayConfig.text,
                dayConfig.bg
              )}>
                {t(`days.${dayKey}` as any)}
              </div>
            );
          })}
        </div>

        {/* Temporal Grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={i} className="min-h-[140px] border-b border-r border-white/[0.03] bg-black/20" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayJobs = jobsByDate[dateStr] || []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const dayOfWeek = new Date(year, month - 1, day).getDay()

            return (
              <motion.div
                key={dateStr}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  "min-h-[140px] border-b border-r border-white/[0.03] p-4 cursor-pointer relative group transition-all",
                  isSelected && "bg-primary/10 ring-2 ring-primary inset-0 z-10",
                  isToday && "bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                   <span className={cn(
                     "text-xl font-black tracking-tighter w-12 h-12 flex items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
                     isToday ? "bg-primary text-white shadow-[0_10px_30px_rgba(255,30,133,0.4)]" : 
                     dayOfWeek === 0 ? "text-rose-600 bg-rose-50" : 
                     dayOfWeek === 6 ? "text-indigo-600 bg-indigo-50" :
                     "text-foreground/80 bg-muted/30 group-hover:text-primary group-hover:bg-primary/5"
                   )}>
                     {day}
                   </span>
                   {dayJobs.length > 0 && (
                     <div className="px-3 py-1 rounded-xl bg-primary text-[10px] font-black text-white shadow-lg shadow-primary/20 uppercase tracking-tighter">
                        {dayJobs.length} {t('calendar.ops')}
                     </div>
                   )}
                </div>

                <div className="space-y-1.5">
                   {dayJobs.slice(0, 3).map(job => (
                      <div key={job.Job_ID} className={cn(
                        "h-6 px-2 rounded-md flex items-center gap-2 border border-border/5 transition-colors group/bar overflow-hidden relative"
                      )}>
                        {/* Side Indicator */}
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1 shadow-sm", STATUS_COLORS[job.Job_Status] || "bg-slate-500")} />
                        
                        {/* Tinted Background */}
                        <div className={cn("absolute inset-0 opacity-10", STATUS_COLORS[job.Job_Status] || "bg-slate-500")} />

                        <span className="relative z-10 text-xs font-black text-foreground uppercase truncate tracking-tighter pl-1.5">
                          {job.Customer_Name || job.Job_ID}
                        </span>
                      </div>
                   ))}
                   {dayJobs.length > 3 && (
                     <div className="text-xs font-black text-muted-foreground uppercase tracking-widest text-center py-1 opacity-60">
                        + {dayJobs.length - 3} {t('calendar.more')}
                     </div>
                   )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Selected Node Interface */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-background rounded-[4rem] border border-border/5 shadow-3xl overflow-hidden mt-12"
          >
            <div className="px-10 py-8 border-b border-border/5 bg-black/40 flex items-center justify-between relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 blur-[60px] pointer-events-none" />
               <div className="relative z-10 flex items-center gap-4">
                  <Target className="text-primary" size={24} />
                  <h3 className="text-xl font-black text-foreground uppercase tracking-widest">
                    {t('calendar.node_selected') || 'NODE'}: {new Date(selectedDate + 'T00:00:00').toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
               </div>
               <div className="bg-primary/20 text-primary border-primary/30 font-black text-base font-bold tracking-widest px-6 h-10 flex items-center rounded-full border">
                  {selectedJobs.length} {t('navigation.monitoring')}
               </div>
            </div>

             <div className="p-10">
               {selectedJobs.length === 0 ? (
                 <div className="py-20 flex flex-col items-center opacity-30">
                    <Zap size={48} className="text-muted-foreground mb-6" />
                    <p className="text-foreground">{t('calendar.no_missions')}</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedJobs.map(job => (
                        <div 
                          key={job.Job_ID} 
                          onClick={() => handleEditJob(job.Job_ID)}
                          className={cn(
                            "bg-card border border-border/40 rounded-[2.5rem] p-8 hover:bg-muted/10 transition-all group relative overflow-hidden shadow-sm cursor-pointer",
                            loadingEdit && "opacity-50 pointer-events-none cursor-wait"
                          )}
                        >
                            <div className={cn("absolute top-0 right-0 w-1.5 h-20 rounded-bl-3xl", STATUS_COLORS[job.Job_Status] || "bg-slate-500")} />
                            
                             <div className="flex items-center justify-between mb-6">
                               <div className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2", "bg-muted/30 border border-border/10")}>
                                 <div className={cn("w-2 h-2 rounded-full", STATUS_COLORS[job.Job_Status] || "bg-slate-500")} />
                                 <span className="text-foreground">{STATUS_LABELS[job.Job_Status] || job.Job_Status}</span>
                               </div>
                               <span className="text-xs font-black text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-[0.2em]">{job.Job_ID.slice(-8)}</span>
                            </div>

                            <h4 className="text-xl font-black text-foreground uppercase tracking-tighter mb-6 truncate leading-none">
                              {job.Customer_Name || t('common.loading')}
                            </h4>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm font-black text-muted-foreground">
                                   <MapPin size={14} className="text-primary" />
                                   <span className="truncate uppercase">{job.Route_Name || job.Dest_Location}</span>
                                </div>
                                <div className="flex items-center gap-6 border-t border-border/10 pt-4">
                                   <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                                      {loadingEdit ? <Loader2 size={12} className="animate-spin" /> : <User size={12} />} {job.Driver_Name?.split(' ')[0] || t('common.auto')}
                                    </div>
                                   <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                                      <Truck size={12} /> {job.Vehicle_Plate}
                                   </div>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <JobDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode="create"
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        defaultDate={selectedDate || undefined}
      />

       {/* Edit Modal */}
       {editingJob && (
          <JobDialog
            mode="edit"
            job={editingJob}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            drivers={drivers}
            vehicles={vehicles}
            customers={customers}
            routes={routes}
            canDelete
          />
       )}
    </div>
  )
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
