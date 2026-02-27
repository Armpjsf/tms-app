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
  LayoutDashboard
} from "lucide-react"
import { WeeklyShipmentChart } from "@/components/dashboard/charts/weekly-shipment-chart"
import { JobStatusChart } from "@/components/dashboard/charts/job-status-chart"

interface DashboardClientProps {
    branchId: string
    customerMode: boolean
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
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show: { opacity: 1, scale: 1, y: 0 }
}

export function DashboardClient({ 
    branchId, 
    customerMode, 
    jobStats, 
    sosCount, 
    weeklyStats, 
    statusDist, 
    financials, 
    financialStats 
}: DashboardClientProps) {
    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-10"
        >
            {/* Elite Header */}
            <motion.div variants={item} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <LayoutDashboard size={160} className="text-primary" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                            <Activity className="text-primary-foreground w-8 h-8" />
                        </div>
                        <div className="h-10 w-[2px] bg-slate-800" />
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1 block">Operational Intelligence</span>
                            <h1 className="text-4xl font-black text-foreground tracking-tight">
                                Operations Dashboard {branchId && branchId !== 'All' ? <span className="text-primary">({branchId})</span> : ''}
                            </h1>
                        </div>
                    </div>
                    <p className="text-slate-400 font-medium max-w-xl">
                        ยินดีต้อนรับสู่ศูนย์ควบคุมการปฏิบัติงาน ข้อมูลทั้งหมดได้รับการอัปเดตแบบ Real-time เพื่อการตัดสินใจที่แม่นยำที่สุด
                    </p>
                </div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-inner">
                        <div className="text-right">
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Status</p>
                             <p className="text-emerald-500 font-black flex items-center gap-2 justify-end">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                Optimal
                             </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Metrics Bento Grid */}
            <motion.div variants={item} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4`}>
                <div className="lg:col-span-2">
                    <MetricCard
                        title="ความสำเร็จในการจัดส่ง"
                        value={`${jobStats.total > 0 ? Math.round((jobStats.delivered / jobStats.total) * 100) : 0}%`}
                        icon={<CheckCircle2 size={24} />}
                        gradient="success"
                        subtitle={`จากทั้งหมด ${jobStats.total} แผนงาน`}
                        trend={{ value: jobStats.delivered, label: "งานที่สำเร็จแล้ว" }}
                    />
                </div>
                
                <MetricCard
                    title="งานวันนี้"
                    value={jobStats.total}
                    icon={<Package size={24} />}
                    gradient="primary"
                    trend={jobStats.total > 0 ? { value: jobStats.inProgress, label: "正在运输" } : undefined}
                />

                <MetricCard
                    title="ปัญหา/แจ้งเตือน"
                    value={sosCount + jobStats.pending}
                    icon={<AlertTriangle size={24} />}
                    gradient="danger"
                    trend={{ value: sosCount, label: "SOS Alerts" }}
                />

                <div className="md:col-span-2 lg:col-span-1">
                     <MetricCard
                        title="รายได้วันนี้ (Est.)"
                        value={`฿${financials.revenue.toLocaleString()}`}
                        icon={<CalendarDays size={24} />}
                        gradient="purple"
                    />
                </div>

                {!customerMode && (
                  <div className="lg:col-span-5 mt-2">
                    <motion.div 
                        whileHover={{ scale: 1.01 }}
                        className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-[1.5rem] border border-indigo-500/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                                <TrendingUp className="text-indigo-400 w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-indigo-300 font-black uppercase tracking-widest text-xs mb-1">Financial Performance (MTD)</p>
                                <h3 className="text-3xl font-black text-white tracking-tighter">฿{financialStats.netProfit.toLocaleString()}</h3>
                                <p className="text-slate-400 font-medium text-sm">กำไรสุทธิเดือนปัจจุบัน</p>
                            </div>
                        </div>
                        <div className="h-px w-full md:w-px md:h-12 bg-slate-800" />
                        <div className="text-center md:text-right">
                            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1">Total Revenue</p>
                            <p className="text-xl font-bold text-white">฿{financialStats.revenue.toLocaleString()}</p>
                        </div>
                    </motion.div>
                  </div>
                )}
            </motion.div>

            {/* Charts Section with Premium Containers */}
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/80 backdrop-blur-sm rounded-[2rem] overflow-hidden shadow-2xl group hover:border-blue-500/50 transition-all duration-500">
                    <CardHeader className="p-8 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black tracking-tight">
                                <div className="p-2 bg-blue-500/20 rounded-xl">
                                    <BarChart3 className="text-blue-500" size={24} />
                                </div>
                                Weekly Performance
                            </CardTitle>
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-10">
                        <WeeklyShipmentChart data={weeklyStats} />
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm rounded-[2rem] overflow-hidden shadow-2xl group hover:border-emerald-500/50 transition-all duration-500">
                    <CardHeader className="p-8 border-b border-white/5">
                        <CardTitle className="flex items-center gap-4 text-2xl font-black tracking-tight">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <Activity className="text-emerald-500" size={24} />
                            </div>
                            Job Status Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-10 flex flex-col items-center justify-center">
                        <JobStatusChart data={statusDist} />
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}
