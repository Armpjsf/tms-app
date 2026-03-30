"use client"

import { useState } from "react"
import { motion, Variants } from "framer-motion"
import {
  Activity,
  TrendingUp,
  Truck,
  Leaf,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle
} from "lucide-react"
import { WeeklyShipmentChart } from "@/components/dashboard/charts/weekly-shipment-chart"
import { DashboardMap } from "@/components/dashboard/dashboard-map"
import { OrderBidding } from "@/components/logistics/order-bidding"
import { DailySummary } from "@/components/dashboard/daily-summary"
import { Job } from "@/lib/supabase/jobs"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"
import { RequestShipmentDialog } from "./request-shipment-dialog"

const container: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
}

const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

interface DriverStatus {
    Driver_ID: string
    Driver_Name: string
    Vehicle_Plate: string
    Last_Update: string | null
    Latitude: number | null
    Longitude: number | null
}

interface DashboardClientProps {
    branchId: string
    customerMode: boolean
    userName?: string | null
    jobStats: {
        total: number
        delivered: number
        inProgress: number
        pending: number
    }
    driverStats: {
        total: number
        active: number
        onJob: number
    }
    sosCount: number
    weeklyStats: {
        date: string
        total: number
        completed: number
    }[]
    fleetStatus: DriverStatus[] 
    marketplaceJobs: Job[]
    fleetHealth: number
}

export function DashboardClient({ 
    branchId, 
    customerMode, 
    userName,
    jobStats, 
    driverStats,
    sosCount,
    weeklyStats, 
    fleetStatus,
    marketplaceJobs,
    fleetHealth
}: DashboardClientProps) {
    const { t } = useLanguage()
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)

    return (
        <div className="space-y-12 font-sans">
            <RequestShipmentDialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen} />
            
            {/* Elite Command Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/20 rounded-xl shadow-lg shadow-accent/10">
                            <LayoutGrid className="text-accent" size={24} />
                        </div>
                        <h2 className="text-lg font-bold font-black text-accent uppercase tracking-[0.3em]">{t('dashboard.matrix_title')}</h2>
                    </div>
                    <h1 className="text-7xl font-black text-accent tracking-tighter premium-text-gradient uppercase italic">
                        {customerMode ? `${t('navigation.dashboard')}: ${userName || 'Alpha'}` : t('dashboard.title')}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="px-5 py-2 rounded-full bg-accent/10 border border-accent/20 text-base font-bold font-black uppercase tracking-[0.2em] flex items-center gap-3 text-accent transition-all duration-500">
                            <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_12px_rgba(182,9,0,1)]" />
                            {t('dashboard.system_integrity')}
                        </div>
                        {!customerMode && (
                            <p className="text-muted-foreground text-lg font-bold font-bold uppercase tracking-widest opacity-60">
                                {t('dashboard.node_execution')} {branchId || "Global"}
                            </p>
                        )}
                        {customerMode && (
                            <p className="text-muted-foreground text-lg font-bold font-bold uppercase tracking-widest opacity-60">
                                {t('dashboard.live_status')}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {customerMode && (
                        <button 
                            onClick={() => setIsRequestDialogOpen(true)}
                            className="h-16 px-12 bg-primary hover:bg-primary/90 text-foreground font-bold uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_rgba(255,30,133,0.3)] active:scale-95 border border-primary/30"
                        >
                            Today&apos;s Mission
                        </button>
                    )}
                    <div className="h-16 px-8 glass-panel rounded-3xl flex items-center gap-6 border-border/5 shadow-2xl">
                        <div className="text-right">
                            <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mb-1">{t('dashboard.fleet_utilization')}</p>
                            <p className="text-accent font-black text-2xl leading-none">{fleetHealth || 98}%</p>
                        </div>
                        <Activity className="text-accent" size={28} />
                    </div>
                </div>
            </div>

            {/* 1. Bento Grid Tactical Summary (NEW) */}
            <div className="w-full">
                <DailySummary 
                    stats={jobStats} 
                    driverStats={driverStats}
                    biddingCount={marketplaceJobs.length}
                    sosCount={sosCount}
                />
            </div>

            {/* Tactical Grid */}
            <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
                {/* 1. Asset Visualization (MAP) */}
                <motion.div variants={item} className="lg:col-span-8 h-[650px] glass-panel rounded-[4rem] relative group border-border/5 shadow-2xl overflow-hidden ring-1 ring-border/5 hover:ring-primary/20 transition-all duration-700">
                    <div className="absolute inset-0 z-0">
                        <DashboardMap drivers={fleetStatus} />
                    </div>
                    <div className="absolute top-10 left-10 z-10">
                        <div className="px-8 py-4 glass-panel rounded-3xl border-border/10 backdrop-blur-3xl shadow-2xl">
                            <p className="text-lg font-bold font-black text-primary uppercase tracking-[0.2em] mb-1.5">{t('dashboard.live_matrix')}</p>
                            <h3 className="text-foreground font-black text-2xl tracking-tighter">{(fleetStatus || []).length} {t('dashboard.units_deployed')}</h3>
                        </div>
                    </div>
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]" />
                </motion.div>

                {/* 2. Operational KPIs (Right) */}
                <div className="lg:col-span-4 space-y-8 flex flex-col">
                    {/* Performance Analytics Column */}
                    <motion.div variants={item} className="flex-1 glass-panel rounded-[4rem] p-12 flex flex-col justify-center items-center text-center group border-border/5 hover:border-primary/20 transition-all">
                        <div className="w-28 h-28 rounded-[2.5rem] bg-accent/10 flex items-center justify-center mb-8 border border-accent/20 group-hover:scale-110 group-hover:bg-accent/20 transition-all duration-700 shadow-xl shadow-accent/5">
                            <CheckCircle2 className="text-accent w-14 h-14" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-muted-foreground font-black text-lg font-bold uppercase tracking-[0.3em] mb-4">{t('dashboard.ops_integrity')}</h3>
                        <p className="text-9xl font-black text-accent tracking-tighter leading-none mb-6 premium-text-gradient uppercase italic">A<span className="text-primary">+</span></p>
                        <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden mb-6">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '96%' }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                className="h-full bg-accent shadow-[0_0_20px_rgba(182,9,0,0.8)]" 
                            />
                        </div>
                        <p className="text-accent/60 text-lg font-bold font-black uppercase tracking-[0.15em]">{t('dashboard.efficiency_index')} 96.4%</p>
                    </motion.div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-8">
                        <motion.div variants={item} className="glass-panel rounded-[3rem] p-8 border-border/5 flex flex-col justify-between h-44 hover:border-rose-500/20 transition-all">
                            <p className="text-lg font-bold font-black text-muted-foreground uppercase tracking-widest">{t('monitoring.alerts')}</p>
                            <div className="flex items-end justify-between">
                                <p className={cn("text-6xl font-black tracking-tighter", sosCount > 0 ? "text-rose-500" : "text-foreground")}>{sosCount}</p>
                                <AlertTriangle size={24} className={sosCount > 0 ? "text-rose-500 animate-bounce" : "text-muted-foreground opacity-40"} />
                            </div>
                        </motion.div>
                        <motion.div variants={item} className="glass-panel rounded-[3rem] p-8 border-border/5 flex flex-col justify-between h-44 hover:border-primary/20 transition-all">
                            <p className="text-lg font-bold font-black text-muted-foreground uppercase tracking-widest">{t('navigation.planning')}</p>
                            <div className="flex items-end justify-between">
                                <p className="text-6xl font-black text-foreground tracking-tighter">{jobStats?.inProgress || 0}</p>
                                <CheckCircle2 size={24} className="text-primary" />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* 3. ESG & Brand Vision - Full Width Banner */}
                <motion.div variants={item} className="lg:col-span-12 glass-panel rounded-[4.5rem] p-16 bg-gradient-to-br from-primary/10 via-transparent to-transparent border-primary/10 group shadow-2xl relative">
                    <div className="absolute top-10 right-10 text-primary/5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <Leaf size={320} />
                    </div>
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-3 px-5 py-2 glass-panel rounded-full text-lg font-bold font-black uppercase tracking-[0.2em] text-primary border-primary/20">
                                <Leaf size={16} /> {t('dashboard.esg_intelligence')}
                            </div>
                             <h2 className="text-6xl font-black text-foreground tracking-tighter leading-tight uppercase">
                                {t('dashboard.cleaner_future')}<br/>
                                <span className="opacity-40">{t('dashboard.carbon_offset')}</span> <span className="premium-text-gradient">1,420 KG CO2</span>
                            </h2>
                            <p className="text-muted-foreground font-bold text-lg max-w-2xl leading-relaxed">
                                {t('dashboard.esg_description')}
                            </p>
                        </div>
                        <div className="flex gap-16">
                            <div className="text-center group/stat">
                                <p className="text-7xl font-black text-accent tracking-tighter mb-2 group-hover/stat:text-primary transition-colors">68.2</p>
                                <p className="text-lg font-bold font-black text-accent uppercase tracking-[0.2em]">{t('dashboard.trees_saved')}</p>
                            </div>
                            <div className="w-px h-28 bg-muted/50" />
                            <div className="text-center group/stat">
                                <p className="text-7xl font-black text-accent tracking-tighter mb-2 group-hover/stat:text-primary transition-colors">285<span className="text-2xl text-muted-foreground ml-1">L</span></p>
                                <p className="text-lg font-bold font-black text-accent uppercase tracking-[0.2em]">{t('dashboard.fuel_reclaimed')}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4. ANALYTICS & MARKETPLACE */}
                <motion.div variants={item} className="lg:col-span-12 space-y-8">
                    {!customerMode && (
                        <div className="glass-panel rounded-[3.5rem] overflow-hidden p-2 border-primary/10 shadow-[0_20px_50px_rgba(255,30,133,0.05)]">
                            <OrderBidding orders={marketplaceJobs} />
                        </div>
                    )}

                    <div className="glass-panel rounded-[3.5rem] border-border/5 shadow-2xl overflow-hidden p-10 group hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/10">
                                    <TrendingUp size={24} />
                                </div>
                                {t('dashboard.growth_analytics')}
                            </h3>
                            <span className="text-lg font-bold font-black text-muted-foreground uppercase tracking-[0.2em]">{t('dashboard.performance_spectrum')}</span>
                        </div>
                        <div className="text-foreground">
                            <WeeklyShipmentChart data={weeklyStats} />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}
