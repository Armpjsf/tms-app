"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/dashboard/metric-card"
import { 
  AlertTriangle, 
  Package,
  CheckCircle2,
  CalendarDays,
  Activity,
  BarChart3,
  TrendingUp,
  Truck,
  Leaf,
  Droplets,
  Wind
} from "lucide-react"
import { WeeklyShipmentChart } from "@/components/dashboard/charts/weekly-shipment-chart"
import { JobStatusChart } from "@/components/dashboard/charts/job-status-chart"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DashboardMap } from "@/components/dashboard/dashboard-map"
import { OrderBidding } from "@/components/logistics/order-bidding"
import { ZoneAnalytics } from "@/components/analytics/provincial-analytics"
import { FleetCompliance } from "@/components/fleet/compliance-monitoring"
import { Job } from "@/lib/supabase/jobs"
import { useState } from "react"
import { RequestShipmentDialog } from "./request-shipment-dialog"
import { cn } from "@/lib/utils"

// ============================================
// Animation Constants (Must be initialized first)
// ============================================
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.05
        }
    }
}

const item = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
}

interface DashboardClientProps {
    branchId: string
    customerMode: boolean
    userName?: string | null
    jobStats: {
        total: number
        pending: number
        inProgress: number
        delivered: number
    }
    sosCount: number
    weeklyStats: {
        date: string
        total: number
        completed: number
    }[]
    statusDist: {
        name: string
        value: number
        fill: string
    }[]
    financials: {
        revenue: number
    }
    financialStats: {
        netProfit: number
        revenue: number
    }
    fleetStatus: {
        Driver_ID: string
        Driver_Name: string
        Vehicle_Plate: string
        Last_Update: string | null
        Latitude: number | null
        Longitude: number | null
    }[]
    marketplaceJobs: Job[]
    zoneData: { name: string; range: string; percentage: number; color: string }[]
    complianceData: { name: string; status: string; date: string; daysLeft: number }[]
    fleetHealth: number
}

export function DashboardClient({ 
    branchId, 
    customerMode, 
    userName,
    jobStats, 
    sosCount, 
    weeklyStats, 
    statusDist, 
    financials, 
    financialStats,
    fleetStatus,
    marketplaceJobs,
    zoneData,
    complianceData,
    fleetHealth
}: DashboardClientProps) {
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)

    return (
        <div className="space-y-10">
            <RequestShipmentDialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen} />
            
            {/* Elite Welcome & Actions Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div>
                    <h1 className="text-6xl font-black text-white tracking-tighter mb-4 premium-text-gradient">
                        {customerMode ? `Identity: ${userName || 'Partner'}` : "Command Centre"}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                            System Pulse: Optimal
                        </div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60">
                            {customerMode ? "Secure Intelligence Matrix Active" : `Fleet Monitoring: ${branchId}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    {customerMode && (
                        <button 
                            onClick={() => setIsRequestDialogOpen(true)}
                            className="h-16 px-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)] active:scale-95 border border-emerald-400/30"
                        >
                            Create Shipment
                        </button>
                    )}
                    <div className="h-16 px-8 glass-panel rounded-2xl flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Network Health</p>
                            <p className="text-white font-black text-lg leading-none">{fleetHealth}%</p>
                        </div>
                        <Activity className="text-emerald-500" size={24} />
                    </div>
                </div>
            </div>

            {/* THE BENTO MATRIX */}
            <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
                {/* 1. PRIMARY OPS (MAP) - Large Span */}
                <motion.div variants={item} className="lg:col-span-8 h-[600px] glass-panel rounded-[3.5rem] relative group border-white/10 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <DashboardMap drivers={fleetStatus} />
                    </div>
                    <div className="absolute top-8 left-8 z-10">
                        <div className="px-6 py-3 glass-panel rounded-2xl border-white/20 backdrop-blur-3xl">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">Live Asset Matrix</p>
                            <p className="text-white font-black text-xl tracking-tighter">{fleetStatus.length} Active Units</p>
                        </div>
                    </div>
                    {/* Dark inner shadow for depth */}
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
                </motion.div>

                {/* 2. INTELLIGENCE STACK (Right Side) */}
                <div className="lg:col-span-4 space-y-6 flex flex-col">
                    {/* Performance Score Card */}
                    <motion.div variants={item} className="flex-1 glass-panel rounded-[3rem] p-10 flex flex-col justify-center items-center text-center group">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-700">
                            <CheckCircle2 className="text-emerald-500 w-12 h-12" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mb-4">Operations Integrity</h3>
                        <p className="text-8xl font-black text-white tracking-tighter leading-none mb-4">A+</p>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '94%' }}
                                transition={{ duration: 1.5, delay: 0.5 }}
                                className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" 
                            />
                        </div>
                        <p className="text-emerald-400/60 text-[10px] font-bold uppercase tracking-widest">94.2% Reliability Index</p>
                    </motion.div>

                    {/* Quick Stats Grid within Bento */}
                    <div className="grid grid-cols-2 gap-6">
                        <motion.div variants={item} className="glass-panel rounded-[2.5rem] p-8">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">SOS Alerts</p>
                            <div className="flex items-end justify-between">
                                <p className={cn("text-4xl font-black tracking-tighter", sosCount > 0 ? "text-rose-500" : "text-white")}>{sosCount}</p>
                                <AlertTriangle size={20} className={sosCount > 0 ? "text-rose-500 animate-bounce" : "text-slate-700"} />
                            </div>
                        </motion.div>
                        <motion.div variants={item} className="glass-panel rounded-[2.5rem] p-8">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Transit Units</p>
                            <div className="flex items-end justify-between">
                                <p className="text-4xl font-black text-white tracking-tighter">{jobStats.inProgress}</p>
                                <Truck size={20} className="text-emerald-500" />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* 3. SUSTAINABILITY IMPACT - Full Width Banner */}
                <motion.div variants={item} className="lg:col-span-12 glass-panel rounded-[3.5rem] p-12 bg-gradient-to-br from-emerald-600/20 via-transparent to-transparent border-emerald-500/10 group">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-3 px-4 py-1.5 glass-panel rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 border-emerald-500/20">
                                <Leaf size={14} /> ESG Intelligence
                            </div>
                            <h2 className="text-5xl font-black text-white tracking-tighter leading-tight">
                                Delivering a <span className="text-emerald-400">Cleaner Future</span>. <br/>
                                Monthly Offset: <span className="premium-gradient-text italic">1,240 kg CO2</span>
                            </h2>
                            <p className="text-slate-400 font-bold text-sm max-w-xl">
                                AI Smart Bundling has eliminated 42 empty return trips this month, saving 185 liters of fuel and improving carbon efficiency by 14.2%.
                            </p>
                        </div>
                        <div className="flex gap-10">
                            <div className="text-center">
                                <p className="text-6xl font-black text-white tracking-tighter mb-2">56.4</p>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Trees Saved</p>
                            </div>
                            <div className="w-px h-20 bg-white/10" />
                            <div className="text-center">
                                <p className="text-6xl font-black text-white tracking-tighter mb-2">185<span className="text-2xl text-slate-500 ml-1">L</span></p>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Fuel Saved</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4. ANALYTICS & MARKETPLACE (Bottom Row) */}
                <motion.div variants={item} className="lg:col-span-7 space-y-6">
                    {/* Bidding System (Restored) */}
                    {!customerMode && (
                        <div className="glass-panel rounded-[3rem] overflow-hidden p-2 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]">
                            <OrderBidding orders={marketplaceJobs} />
                        </div>
                    )}

                    {/* Dark Card - Light Text */}
                    <div className="glass-panel rounded-[3rem] border-none shadow-2xl overflow-hidden p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                                    <TrendingUp size={20} />
                                </div>
                                Growth Matrix
                            </h3>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Last 7 Cycles</span>
                        </div>
                        <div className="text-white">
                            <WeeklyShipmentChart data={weeklyStats} />
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={item} className="lg:col-span-5 h-full">
                    {/* Dark Card - Light Text */}
                    <div className="glass-panel rounded-[3rem] h-full p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                                    <Activity size={20} />
                                </div>
                                Active Stream
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 text-slate-200">
                            <ActivityFeed jobStats={jobStats} sosCount={sosCount} />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}
