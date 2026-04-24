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
    CheckCircle2,
    FileSpreadsheet
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
import { ExcelImport } from "@/components/ui/excel-import"
import { PremiumButton } from "../ui/premium-button"

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
    branchId: string
    selectedDate: string
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
    createBulkJobs,
    branchId,
    selectedDate
}: PlanningClientProps) {
    const { drivers, vehicles, customers, routes, subcontractors } = jobCreationData
    const [view, setView] = useState<'list' | 'kanban' | 'requests'>('list')
    const router = useRouter()
    const { t } = useLanguage()

    // Real-time: Jobs_Main
    useRealtime('Jobs_Main', () => {
        router.refresh()
    })

    const handleDateChange = (newDate: string) => {
        const params = new URLSearchParams(window.location.search)
        params.set('date', newDate)
        router.push(`/planning?${params.toString()}`)
    }

    const setYesterday = () => {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() - 1)
        handleDateChange(d.toLocaleDateString('en-CA'))
    }

    const setToday = () => {
        handleDateChange(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }))
    }

    const filteredJobs = useMemo(() => {
        if (view === 'requests') {
            return requestedJobs
        }
        return todayJobs.filter(j => j.Job_Status !== 'Requested')
    }, [todayJobs, requestedJobs, view])

    const requestCount = requestedJobs.length

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6 pb-20"
        >
            {/* Planning Command Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3 italic uppercase premium-text-gradient">
                        <Calendar className="text-primary" size={24} />
                        {t('planning.title')}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <RealtimeIndicator isLive={true} className="bg-muted/50 border-border/10" />
                        <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px] italic">
                            {t('planning.mission_orchestration')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-muted/50 p-1 rounded-xl border border-border/10 shadow-inner">
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                view === 'list' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <List size={14} />
                            {t('planning.list_view')}
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                view === 'kanban' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <LayoutGrid size={14} />
                            {t('planning.kanban_view')}
                        </button>
                        <button
                            onClick={() => setView('requests')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative",
                                view === 'requests' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Inbox size={14} />
                            {t('planning.requests')}
                            {requestCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-black flex items-center justify-center rounded-full border-2 border-background">
                                    {requestCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/10 shadow-inner ml-2">
                        <button 
                            onClick={setYesterday}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all"
                        >
                            เมื่อวาน
                        </button>
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold text-primary px-2 focus:ring-0 cursor-pointer"
                        />
                        <button 
                            onClick={setToday}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all"
                        >
                            วันนี้
                        </button>
                    </div>

                    {canCreate && (
                        <div className="flex items-center gap-2 ml-2">
                            <ExcelImport 
                                trigger={
                                    <PremiumButton variant="outline" className="h-11 px-5 rounded-xl border-border/10 hover:border-primary/50 text-muted-foreground gap-2 text-xs font-black uppercase tracking-widest">
                                        <FileSpreadsheet size={16} /> {t('common.tactical.bulk_import') || 'Import'}
                                    </PremiumButton>
                                }
                                title={t('planning.import_title') || 'Import Jobs'}
                                onImport={(data) => createBulkJobs(data, branchId === 'All' ? null : branchId)}
                                templateData={[{
                                    Job_ID: "JOB-001",
                                    Plan_Date: new Date().toISOString().split('T')[0],
                                    Customer_Name: "บริษัท สยามคูโบต้าคอร์ปอเรชั่น จำกัด",
                                    Route_Name: "BKK-CNX",
                                    Driver_ID: "D001",
                                    Vehicle_Plate: "80-1234 กทม.",
                                    Weight_Kg: 1500,
                                    Volume_Cbm: 10,
                                    Price_Cust_Total: 5500,
                                    Cost_Driver_Total: 3500,
                                    Ref_No: "SO-12345",
                                    Notes: "ด่วนพิเศษ",
                                    Branch_ID: "HQ"
                                }]}
                                templateFilename="logispro_jobs_template.xlsx"
                            />
                            <JobDialog 
                                drivers={drivers} 
                                vehicles={vehicles} 
                                customers={customers}
                                routes={routes}
                                subcontractors={subcontractors}
                                trigger={
                                    <button className="flex items-center gap-2 bg-primary text-foreground px-6 py-2.5 h-11 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg active:scale-95 group whitespace-nowrap">
                                        <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
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
                    icon={<Zap size={18} />}
                    color="primary"
                />
                <StatCard 
                    label={t('planning.stats_pending')}
                    value={stats.pending} 
                    icon={<Clock size={18} />}
                    color="yellow"
                />
                <StatCard 
                    label={t('planning.stats_in_progress')}
                    value={stats.inProgress} 
                    icon={<Truck size={18} />}
                    color="blue"
                />
                <StatCard 
                    label={t('planning.stats_delivered')}
                    value={stats.delivered} 
                    icon={<CheckCircle2 size={18} />}
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
    const { t } = useLanguage()
    const colorMap = {
        primary: "text-primary bg-primary/10 border-primary/20",
        yellow: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        green: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    }

    return (
        <motion.div 
            variants={item}
            className="bg-muted/40 backdrop-blur-md border border-border/5 p-4 rounded-xl relative overflow-hidden group hover:bg-muted transition-all duration-500"
        >
            <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity", colorMap[color])}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">{label}</p>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-foreground tracking-tighter italic">{value}</span>
                    <span className="text-muted-foreground text-[10px] font-bold font-black uppercase tracking-widest">{t('common.units')}</span>
                </div>
            </div>
            <div className={cn("absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-700", 
                color === 'primary' ? 'bg-primary' : 
                color === 'yellow' ? 'bg-amber-500' : 
                color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'
            )} />
        </motion.div>
    )
}

