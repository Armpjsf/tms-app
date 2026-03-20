"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { PremiumCard, PremiumCardHeader, PremiumCardTitle } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { 
  Plus,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  History,
  ArrowRight,
  FileSpreadsheet,
  LayoutDashboard,
  TrendingUp,
  LayoutList,
  Trello,
  Inbox
} from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { ExcelImport } from "@/components/ui/excel-import"
import { RecentJobItem } from "@/components/planning/recent-job-item"
import { Job } from "@/lib/supabase/jobs"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Route } from "@/lib/supabase/routes"
import { Customer } from "@/lib/supabase/customers"
import { Subcontractor } from "@/types/subcontractor"
import { JobFormData } from "@/app/planning/actions"
import { JobDialog } from "@/components/planning/job-dialog"
import { CreateJobButton } from "@/components/planning/create-job-button"
import { KanbanBoard } from "@/components/planning/kanban-board"
import { useRouter } from "next/navigation"
import { useRealtime } from "@/hooks/useRealtime"
import { RealtimeIndicator } from "@/components/ui/realtime-indicator"

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

    // เปิดระบบ Real-time: รีเฟรชหน้าจอเมื่อข้อมูลงานเปลี่ยน
    useRealtime('Jobs_Main', (payload) => {
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
            className="space-y-8"
        >
            {/* Header Section */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-emerald-500 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                            <LayoutDashboard size={32} />
                        </div>
                        Planning Board
                    </h1>
                    <p className="text-emerald-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Strategic Fleet Operations Command</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 relative z-10">
                    {/* View Toggle */}
                    <div className="flex bg-slate-900/50 p-1.5 rounded-2xl mr-2 border border-slate-800/50">
                        <button 
                            onClick={() => setView('list')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest",
                                view === 'list' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <LayoutList size={16} />
                            List
                        </button>
                        <button 
                            onClick={() => setView('kanban')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest",
                                view === 'kanban' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <Trello size={16} />
                            Kanban
                        </button>
                        <button 
                            onClick={() => setView('requests')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest relative",
                                view === 'requests' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <Inbox size={16} />
                            Requests
                            {requestCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-slate-950 animate-pulse">
                                    {requestCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <Link href="/jobs/history">
                        <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900">
                            <History size={20} className="mr-2" />
                            Job History
                        </PremiumButton>
                    </Link>
                    <ExcelImport 
                        trigger={
                            <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl">
                                <FileSpreadsheet size={20} className="mr-2" /> 
                                นำเข้า Excel
                            </PremiumButton>
                        }
                        title="นำเข้างาน (Jobs)"
                        onImport={createBulkJobs}
                        templateData={[
                            { 
                                Job_ID: "JOB-001", 
                                Plan_Date: "2024-03-20", 
                                Customer_Name: "ลูกค้า A", 
                                Route_Name: "BKK-CNX", 
                                Driver_ID: "DRV-001",
                                Vehicle_Plate: "1กข-1234",
                                Weight_Kg: 1500,
                                Volume_Cbm: 2.5,
                                Price_Cust_Total: 5000,
                                Cost_Driver_Total: 3500,
                                Notes: "ด่วนพิเศษ",
                                Ref_No: "SO-12345"
                            }
                        ]}
                        templateFilename="template_jobs.xlsx"
                    />
                    <CreateJobButton 
                        drivers={drivers} 
                        vehicles={vehicles}
                        customers={customers}
                        routes={routes}
                        subcontractors={subcontractors}
                    />
                </div>
            </motion.div>

            {/* Bento Stats Grid */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Operations', value: stats.total, icon: Package, color: 'emerald', bg: 'emerald' },
                    { label: 'Awaiting Assignment', value: stats.pending, icon: Clock, color: 'amber', bg: 'amber' },
                    { label: 'Active In-Transit', value: stats.inProgress, icon: Truck, color: 'blue', bg: 'blue' },
                    { label: 'Successful Delivery', value: stats.delivered, icon: CheckCircle2, color: 'emerald', bg: 'teal' },
                ].map((stat, idx) => (
                    <PremiumCard key={idx} className="group p-8 border-none bg-white/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div className={cn(
                                "p-4 rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 text-white",
                                stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                                stat.color === 'amber' ? "bg-amber-500 shadow-amber-500/20" :
                                stat.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" : "bg-teal-500 shadow-teal-500/20"
                            )}>
                                <stat.icon size={24} />
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/5 rounded-full border border-black/5">
                                <TrendingUp size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">LIVE DATA</span>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                            <p className="text-5xl font-black text-gray-900 tracking-tighter leading-none">{stat.value}</p>
                        </div>
                        {/* High-end numeric glow */}
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-8xl font-black text-slate-100/50 pointer-events-none select-none">
                            {idx + 1}
                        </div>
                    </PremiumCard>
                ))}
            </motion.div>

            {/* Content Area */}
            <motion.div variants={item}>
                {view === 'list' || view === 'requests' ? (
                    <PremiumCard className="p-0 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.1)] border-none bg-white rounded-br-[5rem] rounded-tl-[3rem]">
                        <PremiumCardHeader className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                            <PremiumCardTitle icon={<Package className="text-emerald-400" />} className="text-white relative z-10">
                               {view === 'requests' ? "ASSET REQUESTS" : "LIVE MONITORING FEED"}
                            </PremiumCardTitle>
                            <Link href="/jobs/history" className="relative z-10">
                                <PremiumButton variant="ghost" size="sm" className="text-[10px] tracking-[0.2em] text-slate-400 hover:text-white hover:bg-white/5">
                                    ARCHIVE DATA <ArrowRight className="w-4 h-4 ml-2" />
                                </PremiumButton>
                            </Link>
                        </PremiumCardHeader>
                            
                            {filteredJobs.length === 0 ? (
                                <div className="text-center py-20 bg-background/20">
                                    <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gray-200 shadow-inner">
                                        <Package className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 font-bold mb-6">
                                        {view === 'requests' ? "ไม่มีคำขอใหม่จากลูกค้า" : "ยังไม่มีงานที่วางแผนไว้สำหรับวันนี้"}
                                    </p>
                                    <div className="flex justify-center gap-3">
                                        {view !== 'requests' && (
                                            <JobDialog 
                                                mode="create" 
                                                drivers={drivers} 
                                                vehicles={vehicles}
                                                customers={customers}
                                                routes={routes}
                                                subcontractors={subcontractors}
                                                canViewPrice={canViewPrice}
                                                canDelete={canDelete}
                                                trigger={
                                                    canCreate ? (
                                                        <PremiumButton className="h-14 px-10 rounded-2xl">
                                                            <Plus size={24} className="mr-2" />
                                                            เริ่มแผนงานแรก
                                                        </PremiumButton>
                                                    ) : <></>
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 bg-white/50">
                                    {filteredJobs.map((job) => (
                                        <motion.div 
                                            key={job.Job_ID}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            whileHover={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
                                            className="transition-colors"
                                        >
                                            <RecentJobItem 
                                                job={job}
                                                drivers={drivers}
                                                vehicles={vehicles}
                                                customers={customers}
                                                routes={routes}
                                                subcontractors={subcontractors}
                                                canViewPrice={canViewPrice}
                                                canDelete={canDelete}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                            
                            {filteredJobs.length > 0 && (
                                <div className="p-6 bg-gray-50/30 text-center border-t border-gray-50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                                        Logistics Intelligence Engine • Today&apos;s Activity
                                    </p>
                                </div>
                            )}
                    </PremiumCard>
                ) : (
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
                )}
            </motion.div>
        </motion.div>
    )
}
