"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { 
    Calendar, 
    LayoutGrid, 
    List, 
    Plus, 
    Zap, 
    Inbox,
    Clock,
    Truck,
    CheckCircle2
} from "lucide-react"
import { Job } from "@/lib/supabase/jobs"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Route } from "@/lib/supabase/routes"
import { Subcontractor } from "@/types/subcontractor"
import { JobFormData } from "@/app/planning/actions"
import { JobDialog } from "@/components/planning/job-dialog"
import { JobGrid } from "@/components/planning/job-grid"
import { KanbanBoard } from "@/components/planning/kanban-board"
import { useRouter } from "next/navigation"
import { useRealtime } from "@/hooks/useRealtime"
import { RealtimeIndicator } from "@/components/ui/realtime-indicator"
import { useLanguage } from "@/components/providers/language-provider"

interface PlanningClientProps {
    stats: {
        total: number
        pending: number
        inProgress: number
        delivered: number
    }
    todayJobs: Job[]
    requestedJobs: Job[]
    jobCreationData: {
        drivers: Driver[]
        vehicles: Vehicle[]
        customers: Customer[]
        routes: Route[]
        subcontractors: Subcontractor[]
    }
    canViewPrice: boolean
    canDelete: boolean
    canCreate: boolean
    createBulkJobs: (data: Partial<JobFormData>[]) => Promise<{ success: boolean; message: string }>
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
}

export function PlanningClient({ 
    stats, 
    todayJobs, 
    requestedJobs,
    jobCreationData, 
    canViewPrice, 
    canDelete, 
    canCreate,
    createBulkJobs
}: PlanningClientProps) {
    const { drivers, vehicles, customers, routes, subcontractors } = jobCreationData
    const [view, setView] = useState<'list' | 'kanban' | 'requests'>('list')
    const router = useRouter()
    const { t } = useLanguage()

    // Real-time: Jobs_Main
    useRealtime('Jobs_Main', () => {
        console.log("Job Update Detected - Refreshing Planning Data...")
        router.refresh()
    })

    const filteredJobs = useMemo(() => {
        if (view === 'requests') {
            return requestedJobs
        }
        return todayJobs.filter(j => j.Job_Status !== 'Requested').slice(0, 10)
    }, [todayJobs, requestedJobs, view])

    const requestCount = requestedJobs.length

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-20"
        >
            {/* Planning Command Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3 italic">
                        <Calendar className="text-primary" size={32} />
                        {t('planning.title')}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <RealtimeIndicator isLive={true} className="bg-white/5 border-white/10" />
                        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-base font-bold">
                            Tactical Mission Orchestration
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-bold font-black transition-all",
                                view === 'list' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <List size={14} />
                            {t('planning.list_view')}
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-bold font-black transition-all",
                                view === 'kanban' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <LayoutGrid size={14} />
                            {t('planning.kanban_view')}
                        </button>
                        <button
                            onClick={() => setView('requests')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-bold font-black transition-all relative",
                                view === 'requests' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <Inbox size={14} />
                            {t('planning.requests')}
                            {requestCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-base font-bold flex items-center justify-center rounded-full border-2 border-[#050110]">
                                    {requestCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {canCreate && (
                        <div className="flex items-center gap-3 ml-2">
                            <JobDialog 
                                drivers={drivers} 
                                vehicles={vehicles} 
                                customers={customers}
                                routes={routes}
                                subcontractors={subcontractors}
                                trigger={
                                    <button className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xl hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 group">
                                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                                        {t('planning.new_job')}
                                    </button>
                                }
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Tactical Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    label={t('planning.stats_total')}
                    value={stats.total} 
                    icon={<Zap size={20} />}
                    color="primary"
                />
                <StatCard 
                    label={t('planning.stats_pending')}
                    value={stats.pending} 
                    icon={<Clock size={20} />}
                    color="yellow"
                />
                <StatCard 
                    label={t('planning.stats_in_progress')}
                    value={stats.inProgress} 
                    icon={<Truck size={20} />}
                    color="blue"
                />
                <StatCard 
                    label={t('planning.stats_delivered')}
                    value={stats.delivered} 
                    icon={<CheckCircle2 size={20} />}
                    color="green"
                />
            </div>

            {/* Main Content Area */}
            <motion.div variants={item} className="relative z-10 min-h-[500px]">
                {view === 'kanban' ? (
                    <KanbanBoard 
                        jobs={todayJobs}
                        drivers={drivers}
                        vehicles={vehicles}
                        customers={customers}
                        routes={routes}
                        subcontractors={subcontractors}
                        canViewPrice={canViewPrice}
                        canDelete={canDelete}
                    />
                ) : (
                    <JobGrid 
                        jobs={filteredJobs} 
                        drivers={drivers}
                        vehicles={vehicles}
                        customers={customers}
                        routes={routes}
                        subcontractors={subcontractors}
                        canViewPrice={canViewPrice}
                        canDelete={canDelete}
                    />
                )}
            </motion.div>
        </motion.div>
    )
}

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: 'primary' | 'yellow' | 'blue' | 'green' }) {
    const colorMap = {
        primary: "text-primary bg-primary/10 border-primary/20",
        yellow: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        green: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    }

    return (
        <motion.div 
            variants={item}
            className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-500"
        >
            <div className={cn("absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity", colorMap[color])}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-base font-bold font-black text-slate-500 uppercase tracking-[0.3em] mb-2">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white tracking-tighter italic">{value}</span>
                    <span className="text-slate-600 text-base font-bold font-bold uppercase tracking-widest">Units</span>
                </div>
            </div>
            <div className={cn("absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-700", 
                color === 'primary' ? 'bg-primary' : 
                color === 'yellow' ? 'bg-amber-500' : 
                color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'
            )} />
        </motion.div>
    )
}

