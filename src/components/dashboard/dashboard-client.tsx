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
        <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden">
            <RequestShipmentDialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen} />
            
            {/* Background Live Map */}
            <DashboardMap drivers={fleetStatus} />
            
            {/* Scrollable Overlay Layer */}
            <div className="absolute inset-0 z-10 overflow-y-auto px-6 py-8 custom-scrollbar">
                <motion.div 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="max-w-[1600px] mx-auto space-y-8 pb-20"
                >
                    {/* Floating Header Card */}
                    <motion.div variants={item} className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-emerald-500 rounded-3xl shadow-xl shadow-emerald-500/30">
                                <Activity className="text-white w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">
                                    {customerMode ? `Welcome back, ${userName || 'Customer'}` : "Operational Dashboard"}
                                </h1>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        {customerMode ? "Shipment Tracking" : "Live Fleet"}
                                    </span>
                                    <p className="text-gray-700 text-sm font-bold">
                                        {customerMode ? "ระบบพอร์ทัลส่วนตัวสำหรับการติดตามและจัดการงานขนส่งของคุณ" : `Real-time tracking for ${branchId === 'All' ? 'All Branches' : branchId}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {customerMode ? (
                             <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setIsRequestDialogOpen(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                >
                                    Request New Shipment
                                </button>
                             </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="bg-black/5 px-4 py-3 rounded-2xl">
                                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-0.5">Fleet Connectivity</p>
                                    <p className="text-emerald-700 font-black text-sm">{fleetHealth}% Active</p>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Quick Stats Bento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <motion.div variants={item}>
                            <MetricCard
                                title="ความสำเร็จในการจัดส่ง"
                                value={`${jobStats.total > 0 ? Math.round((jobStats.delivered / jobStats.total) * 100) : 0}%`}
                                icon={<CheckCircle2 size={22} />}
                                gradient="success"
                                subtitle={`จากทั้งหมด ${jobStats.total} แผนงาน`}
                            />
                        </motion.div>
                        <motion.div variants={item}>
                            <MetricCard
                                title={customerMode ? "งานที่กำลังมาส่ง" : "งานขนส่งวันนี้"}
                                value={jobStats.total}
                                icon={<Package size={22} />}
                                gradient="primary"
                                subtitle={`${jobStats.inProgress} งานกำลังเดินทาง`}
                            />
                        </motion.div>
                        <motion.div variants={item}>
                            <MetricCard
                                title={customerMode ? "รายการแจ้งเตือน" : "สถานะ SOS/ปัญหา"}
                                value={sosCount}
                                icon={<AlertTriangle size={22} />}
                                gradient="danger"
                                subtitle={customerMode ? "ความล่าช้าหรือเหตุขัดข้อง" : "ต้องการการตรวจสอบทันที"}
                            />
                        </motion.div>
                        {!customerMode && (
                        <motion.div variants={item}>
                            <MetricCard
                                title="รายได้วันนี้ (ประมาณการ)"
                                value={`฿${financials.revenue.toLocaleString()}`}
                                icon={<CalendarDays size={22} />}
                                gradient="purple"
                                subtitle="Current Daily Revenue"
                            />
                        </motion.div>
                        )}
                    </div>

                    {/* Center Section: Charts & Feed */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Operational Intelligence Area */}
                        <div className="lg:col-span-9 space-y-6">
                            {!customerMode && (
                                <motion.div variants={item} className="grid grid-cols-1 gap-6">
                                    <Card className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden group">
                                        <CardContent className="p-4 lg:p-6">
                                            <OrderBidding orders={marketplaceJobs} />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <Card className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden group">
                                    <CardHeader className="p-6 border-b border-gray-100">
                                        <CardTitle className="text-lg font-bold flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                                                <TrendingUp size={20} />
                                            </div>
                                            {customerMode ? "แนวโน้มการส่งสินค้า" : "Weekly Growth"}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <WeeklyShipmentChart data={weeklyStats} />
                                    </CardContent>
                                </Card>
 
                                <Card className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden group">
                                    <CardHeader className="p-6 border-b border-gray-100">
                                        <CardTitle className="text-lg font-bold flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
                                                <Activity size={20} />
                                            </div>
                                            {customerMode ? "สถานะพัสดุรวม" : "Status Pulse"}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 flex items-center justify-center">
                                        <JobStatusChart data={statusDist} />
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <ZoneAnalytics data={zoneData} />
                                {!customerMode && <FleetCompliance data={complianceData} />}
                            </motion.div>
                            
                            {/* Performance Strip */}
                            {!customerMode && (
                                <motion.div 
                                    variants={item}
                                    whileHover={{ scale: 1.005 }}
                                    className="bg-white overflow-hidden relative p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl group transition-all duration-500"
                                >
                                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                        <TrendingUp size={200} className="text-emerald-500" />
                                    </div>
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20">
                                                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                                    <BarChart3 className="text-white w-6 h-6" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-emerald-700 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Month-to-date Profit</p>
                                                <h3 className="text-5xl font-black text-gray-900 tracking-tighter mb-1">
                                                    ฿{financialStats.netProfit.toLocaleString()}
                                                </h3>
                                                <p className="text-gray-700 font-bold text-sm">ประสิทธิภาพการเงินระดับสูงสุด (Optimal)</p>
                                            </div>
                                        </div>
                                        <div className="h-16 w-px bg-gray-100 hidden md:block" />
                                        <div className="text-center md:text-right">
                                            <p className="text-gray-700 font-black text-[10px] uppercase tracking-widest mb-1">Gross Revenue (MTD)</p>
                                            <p className="text-2xl font-black text-gray-900 tracking-tight">฿{financialStats.revenue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Sidebar: Activity Feed Only */}
                        <div className="lg:col-span-3">
                            <ActivityFeed jobStats={jobStats} sosCount={sosCount} />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

