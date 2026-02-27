"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  History,
  ArrowRight,
  FileSpreadsheet,
  LayoutDashboard
} from "lucide-react"
import Link from "next/link"
import { ExcelImport } from "@/components/ui/excel-import"
import { RecentJobItem } from "@/components/planning/recent-job-item"
import { CreateJobButton } from "@/components/planning/create-job-button"
import { JobDialog } from "@/components/planning/job-dialog"

interface PlanningClientProps {
    stats: {
        total: number
        pending: number
        inProgress: number
        delivered: number
    }
    todayJobs: any[]
    jobCreationData: {
        drivers: any[]
        vehicles: any[]
        customers: any[]
        routes: any[]
    }
    canViewPrice: boolean
    canDelete: boolean
    canCreate: boolean
    createBulkJobs: (data: any[]) => Promise<any>
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
    jobCreationData, 
    canViewPrice, 
    canDelete, 
    canCreate,
    createBulkJobs
}: PlanningClientProps) {
    const { drivers, vehicles, customers, routes } = jobCreationData
    const recentJobs = todayJobs.slice(0, 10)

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            {/* Header Section */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl">
                <div>
                    <h1 className="text-4xl font-black text-foreground mb-1 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-primary/20 rounded-2xl shadow-lg shadow-primary/20">
                            <LayoutDashboard className="text-primary w-8 h-8" />
                        </div>
                        วางแผนงาน
                    </h1>
                    <p className="text-muted-foreground font-medium pl-1">จัดการและติดตามสถานะงานแบบ Real-time วันนี้</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/jobs/history">
                        <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-800 bg-slate-950/50 hover:bg-slate-900 text-slate-300 hover:text-white transition-all">
                            <History size={18} className="mr-2" />
                            ประวัติงาน
                        </Button>
                    </Link>
                    <ExcelImport 
                        trigger={
                            <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-800 bg-slate-950/50 hover:bg-slate-900 text-slate-300 hover:text-white transition-all">
                                <FileSpreadsheet size={18} className="mr-2" /> 
                                นำเข้า Excel
                            </Button>
                        }
                        title="นำเข้างาน (Jobs)"
                        onImport={createBulkJobs}
                        templateData={[
                            { Job_ID: "JOB-001", Plan_Date: "2024-03-20", Customer_Name: "ลูกค้า A", Route_Name: "BKK-CNX", Price_Cust_Total: 5000 }
                        ]}
                        templateFilename="template_jobs.xlsx"
                    />
                    <CreateJobButton 
                        drivers={drivers} 
                        vehicles={vehicles}
                        customers={customers}
                        routes={routes}
                    />
                </div>
            </motion.div>

            {/* Bento Stats Grid */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'งานทั้งหมด', value: stats.total, icon: Package, color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
                    { label: 'รอรับงาน', value: stats.pending, icon: Clock, color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400' },
                    { label: 'กำลังส่ง', value: stats.inProgress, icon: Truck, color: 'blue', bg: 'bg-blue-500/10', text: 'text-blue-400' },
                    { label: 'ส่งสำเร็จ', value: stats.delivered, icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
                ].map((stat, idx) => (
                    <Card key={idx} className="bg-slate-900/60 border-slate-800/80 backdrop-blur-md hover:border-slate-700/50 transition-all hover:scale-[1.02] shadow-2xl relative overflow-hidden group">
                        <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500`}>
                            <stat.icon size={100} />
                        </div>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 ${stat.bg} rounded-2xl`}>
                                    <stat.icon className={`w-7 h-7 ${stat.text}`} />
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Analytics</div>
                            </div>
                            <div>
                                <p className={`text-4xl font-black ${stat.text} tracking-tighter mb-1`}>{stat.value}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Recent Jobs Glass Card */}
            <motion.div variants={item}>
                <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm overflow-hidden shadow-2xl rounded-3xl">
                    <CardContent className="p-0">
                        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-8 bg-primary rounded-full" />
                                <h2 className="text-xl font-black text-foreground tracking-tight">Recent Deliveries</h2>
                            </div>
                            <Link href="/jobs/history">
                                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5 font-bold uppercase tracking-widest text-[10px]">
                                    See All Activity <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                        
                        {recentJobs.length === 0 ? (
                            <div className="text-center py-20 bg-slate-950/20">
                                <div className="bg-slate-900 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-inner">
                                    <Package className="w-10 h-10 text-slate-700" />
                                </div>
                                <p className="text-slate-400 font-bold mb-6">ยังไม่มีงานที่วางแผนไว้สำหรับวันนี้</p>
                                <div className="flex justify-center gap-3">
                                    <JobDialog 
                                        mode="create" 
                                        drivers={drivers} 
                                        vehicles={vehicles}
                                        customers={customers}
                                        routes={routes}
                                        canViewPrice={canViewPrice}
                                        canDelete={canDelete}
                                        trigger={
                                            canCreate ? (
                                                <Button className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                                                    <Plus size={20} className="mr-2" />
                                                    เริ่มแผนงานแรก
                                                </Button>
                                            ) : <></>
                                        }
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/80">
                                {recentJobs.map((job) => (
                                    <motion.div 
                                        key={job.Job_ID}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                                    >
                                        <RecentJobItem 
                                            job={job}
                                            drivers={drivers}
                                            vehicles={vehicles}
                                            customers={customers}
                                            routes={routes}
                                            canViewPrice={canViewPrice}
                                            canDelete={canDelete}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                        
                        {recentJobs.length > 0 && (
                            <div className="p-4 bg-black/20 text-center">
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                    Showing last {recentJobs.length} active jobs for today
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}
