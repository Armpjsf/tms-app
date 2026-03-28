"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
    Truck, MapPin, 
    LayoutGrid, Bell, Gavel, Clock, Star, Banknote
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/components/providers/language-provider"

interface DashboardClientProps {
    session: {
        driverId: string
        driverName: string
    }
    stats: {
        total: number
        completed: number
    }
    currentJob: {
        Job_ID: string
        Customer_Name: string
        Job_Status: string
        Origin_Location?: string
        Dest_Location?: string
        Route_Name?: string
    } | null
    activeJobs?: any[]
    gamification: {
        points: number
        rank: string
        nextRankPoints: number
        monthlyCompleted: number
    }
    todayIncome: number
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

export function DashboardClient({ session, stats, currentJob, activeJobs = [], gamification, todayIncome }: DashboardClientProps) {
    const { t } = useLanguage()

    // Separate the primary (first) job from the rest
    const secondaryJobs = activeJobs.filter(j => j.Job_ID !== currentJob?.Job_ID)

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-24"
        >
            {/* Header / Brand Section */}
            <motion.div variants={item} className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-2xl bg-muted/50 border border-border/10 text-primary">
                        <LayoutGrid size={24} />
                    </button>
                    <h1 className="text-2xl font-black text-accent tracking-widest uppercase italic">
                        Logis<span className="text-primary italic">Pro</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="relative p-2.5 rounded-2xl bg-muted/50 border border-border/10 text-muted-foreground">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                    </button>
                    <Avatar className="h-11 w-11 border-2 border-primary/20 bg-card">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.driverName}`} />
                        <AvatarFallback className="bg-card text-foreground">{session.driverName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
            </motion.div>

            {/* Title & Stats Overview */}
            <motion.div variants={item} className="space-y-1">
                <h2 className="text-4xl font-black text-accent px-1 font-display uppercase tracking-tighter italic">งานวันนี้</h2>
                <p className="text-muted-foreground font-bold px-1 tracking-tight">มีงานที่ต้องจัดการ {stats.total} รายการ</p>
            </motion.div>

            {/* Circular Stats Grid */}
            <motion.div variants={item} className="grid grid-cols-2 gap-6">
                <div className="glass-panel rounded-[2.5rem] p-6 aspect-square flex flex-col items-center justify-center gap-3 group transition-all hover:scale-105">
                    <div className="absolute top-4 right-4 text-primary opacity-20 group-hover:opacity-60 transition-opacity">
                         <Truck size={40} />
                    </div>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-1">
                             <Truck className="text-primary" size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-black text-accent tracking-tighter">{stats.total < 10 ? `0${stats.total}` : stats.total}</div>
                        <div className="text-base font-bold font-black text-primary uppercase tracking-[0.2em] opacity-80">งานในมือ</div>
                    </div>
                </div>

                <div className="glass-panel rounded-[2.5rem] p-6 aspect-square flex flex-col items-center justify-center gap-3 group transition-all hover:scale-105">
                    <div className="absolute top-4 right-4 text-blue-400 opacity-20 group-hover:opacity-60 transition-opacity">
                         <Banknote size={40} />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-1">
                         <Banknote className="text-blue-400" size={20} strokeWidth={2.5} />
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-accent tracking-tighter">
                            {todayIncome.toLocaleString()}
                        </div>
                        <div className="text-base font-bold font-black text-blue-400 uppercase tracking-[0.2em] opacity-80">รายได้วันนี้</div>
                    </div>
                </div>
            </motion.div>

            {/* Mission Cards List */}
            <motion.div variants={item} className="space-y-6">
                {currentJob ? (
                    <div className="space-y-6">
                        {/* Primary Active Card */}
                        <div className="glass-panel rounded-[3rem] p-8 space-y-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-primary/10 pointer-events-none">
                                <Truck size={120} />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-muted/50 border border-border/10 rounded-3xl flex items-center justify-center shadow-2xl">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                            <Star size={16} className="text-primary fill-primary" />
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-2xl font-black text-accent tracking-tighter italic truncate">#{currentJob.Job_ID}</h4>
                                        <p className="text-muted-foreground text-lg font-bold font-bold uppercase tracking-widest truncate">{currentJob.Customer_Name}</p>
                                    </div>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-foreground uppercase tracking-widest shadow-xl font-bold text-[10px] ${
                                    ['In Progress', 'In Transit', 'Arrived Pickup', 'Arrived Dropoff'].includes(currentJob.Job_Status) 
                                    ? 'bg-primary shadow-primary/30' 
                                    : 'bg-accent shadow-accent/30'
                                }`}>
                                    {currentJob.Job_Status === 'Assigned' || currentJob.Job_Status === 'New' ? 'รอเริ่มงาน' : currentJob.Job_Status}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-base font-bold font-black uppercase tracking-widest">
                                    <span className="text-muted-foreground truncate max-w-[40%]">{currentJob.Origin_Location || "จุดรับของ"}</span>
                                    <span className="text-primary text-[10px]">
                                        {['In Progress', 'In Transit'].includes(currentJob.Job_Status) ? 'กำลังส่ง' : 'คิวงานถัดไป'}
                                    </span>
                                    <span className="text-muted-foreground truncate max-w-[40%]">{currentJob.Dest_Location || "จุดส่งของ"}</span>
                                </div>
                                <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                     <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: ['In Progress', 'In Transit'].includes(currentJob.Job_Status) ? "50%" : "5%" }}
                                        className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(255,30,133,0.5)]"
                                     />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex -space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-muted/80 backdrop-blur-md border-2 border-secondary flex items-center justify-center text-base font-bold font-black text-foreground">
                                        {currentJob.Customer_Name?.charAt(0)}
                                    </div>
                                </div>
                                <Link href={`/mobile/jobs/${currentJob.Job_ID}`}>
                                    <Button className="h-14 px-10 rounded-2xl bg-primary hover:brightness-110 text-foreground font-bold uppercase tracking-widest shadow-xl shadow-primary/30 transition-all">
                                        ดูรายละเอียด
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Secondary Assigned Jobs List */}
                        {secondaryJobs.map((job) => (
                            <Link key={job.Job_ID} href={`/mobile/jobs/${job.Job_ID}`}>
                                <div className="glass-panel rounded-[3rem] p-8 space-y-6 opacity-90 hover:opacity-100 transition-all mb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-muted/50 border border-border/10 rounded-3xl flex items-center justify-center">
                                                <Clock className="text-accent" size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-2xl font-black text-accent tracking-tighter italic truncate">#{job.Job_ID}</h4>
                                                <p className="text-muted-foreground text-lg font-bold font-bold uppercase tracking-widest truncate">{job.Customer_Name}</p>
                                            </div>
                                        </div>
                                        <div className="px-4 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-base font-bold font-black text-accent uppercase tracking-widest text-[10px]">
                                            คิวรอ (QUEUE)
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <div className="flex items-center gap-2 text-base font-bold font-bold">
                                            <MapPin size={14} className="text-accent" />
                                            ไปที่: {job.Dest_Location}
                                        </div>
                                        <div className="text-foreground font-bold uppercase tracking-widest hover:text-primary">
                                            รายละเอียด
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 px-8 glass-panel rounded-[3rem] border-dashed border-border/10">
                         <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                             <Truck className="text-muted-foreground" size={32} />
                         </div>
                         <h3 className="text-foreground font-black text-xl mb-1">ยังไม่มีงานในขณะนี้</h3>
                         <p className="text-muted-foreground text-xl font-medium mb-6">คุณยังไม่มีรายการงานที่ได้รับมอบหมาย</p>
                         <Link href="/mobile/marketplace">
                             <Button className="h-14 px-8 rounded-2xl bg-primary text-foreground font-bold uppercase tracking-widest shadow-xl shadow-primary/30">
                                 กดรับงานใหม่
                             </Button>
                         </Link>
                    </div>
                )}
            </motion.div>

            {/* Floating Action Button (Marketplace) */}
            <div className="fixed bottom-32 right-6 z-50">
                 <Link href="/mobile/marketplace">
                     <button className="w-16 h-16 rounded-full bg-primary flex flex-col items-center justify-center text-white shadow-[0_8px_30px_rgba(255,30,133,0.4)] transition-transform hover:scale-110 active:scale-95 border-4 border-background">
                        <Gavel size={28} strokeWidth={3} />
                        <span className="text-[7px] font-black uppercase tracking-tighter -mt-1">ประมูลงาน</span>
                     </button>
                 </Link>
            </div>
        </motion.div>
    )
}
