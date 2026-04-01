"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
    Truck, MapPin, 
    LayoutGrid, Bell, Gavel, Clock, Star, Banknote, 
    ChevronRight, ArrowUpRight, TrendingUp, ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/components/providers/language-provider"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
    const supabase = createClient()

    // Real-time Chat Notification for Driver
    useEffect(() => {
        if (!session.driverId) return

        const channel = supabase
            .channel('driver_chat_noti_dashboard')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'Chat_Messages', 
                    filter: `receiver_id=eq.${session.driverId}` 
                }, 
                (payload) => {
                    const newMsg = payload.new
                    if (newMsg.sender_id === 'admin') {
                        toast.info("ข้อความใหม่จากแอดมิน", {
                            description: newMsg.message.startsWith('[IMAGE]') ? '📷 ส่งรูปภาพ' : newMsg.message,
                            action: {
                                label: 'อ่านแชท',
                                onClick: () => window.location.href = '/mobile/chat'
                            }
                        })
                        try { 
                            const audio = new Audio('/sounds/notification.mp3')
                            audio.play().catch(() => {}) 
                        } catch {}
                    }
                }
            ).subscribe()
        
        return () => { supabase.removeChannel(channel) }
    }, [session.driverId, supabase])

    const secondaryJobs = activeJobs.filter(j => j.Job_ID !== currentJob?.Job_ID)

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-32"
        >
            {/* NEW PREMIUM HEADER */}
            <motion.div variants={item} className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Link href="/mobile/profile">
                            <Avatar className="h-14 w-14 border-2 border-primary/30 ring-4 ring-primary/5 transition-transform active:scale-95">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.driverName}`} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">{session.driverName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-4 border-background flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">ยินดีต้อนรับ</p>
                        <h1 className="text-2xl font-black text-foreground tracking-tight leading-none truncate max-w-[180px]">
                            คุณ {session.driverName}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/mobile/notifications" className="relative p-3 rounded-2xl bg-card border border-border shadow-sm active:scale-90 transition-all">
                        <Bell size={22} className="text-foreground" />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card" />
                    </Link>
                </div>
            </motion.div>

            {/* STATUS SUMMARY CARDS */}
            <motion.div variants={item} className="grid grid-cols-2 gap-4">
                <div className="glass-panel rounded-[2.5rem] p-6 relative overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="absolute top-[-20%] right-[-20%] opacity-10">
                         <Truck size={100} strokeWidth={1} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                             <TrendingUp size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-4xl font-black text-foreground tracking-tighter leading-none">
                                {activeJobs.length < 10 ? `0${activeJobs.length}` : activeJobs.length}
                            </div>
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-1">งานที่ต้องทำ</p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-[2.5rem] p-6 relative overflow-hidden bg-gradient-to-br from-accent/5 to-transparent">
                    <div className="absolute top-[-20%] right-[-20%] opacity-10 text-accent">
                         <Banknote size={100} strokeWidth={1} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                             <Banknote size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-foreground tracking-tighter leading-none">
                                {todayIncome.toLocaleString()}
                            </div>
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-1">รายได้วันนี้ (฿)</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* MAIN ACTION SECTION */}
            <motion.div variants={item} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-accent rounded-full" />
                        งานปัจจุบัน
                    </h2>
                    {activeJobs.length > 0 && (
                        <Link href="/mobile/jobs" className="text-accent text-sm font-black uppercase tracking-widest flex items-center gap-1">
                            ดูทั้งหมด <ChevronRight size={14} />
                        </Link>
                    )}
                </div>

                <AnimatePresence mode="wait">
                {currentJob ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-panel rounded-[3rem] p-8 space-y-8 relative overflow-hidden group shadow-xl shadow-primary/5 border-primary/20"
                    >
                        <div className="absolute top-0 right-0 p-8 text-primary/5 pointer-events-none transform translate-x-4 -translate-y-4">
                            <Truck size={160} />
                        </div>
                        
                        {/* Job ID & Status */}
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-3">
                                    <Star size={28} className="text-white fill-white" />
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black text-foreground tracking-tighter leading-none mb-1">#{currentJob.Job_ID.slice(-6)}</h4>
                                    <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest truncate max-w-[150px]">
                                        {currentJob.Customer_Name}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg",
                                ['In Progress', 'In Transit', 'Arrived Pickup', 'Arrived Dropoff'].includes(currentJob.Job_Status)
                                ? "bg-accent text-white shadow-accent/20 animate-pulse"
                                : "bg-muted text-muted-foreground"
                            )}>
                                {currentJob.Job_Status === 'Assigned' || currentJob.Job_Status === 'New' ? 'รอเริ่มงาน' : 'กำลังไปส่ง'}
                            </div>
                        </div>

                        {/* Location Progress */}
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1 max-w-[45%]">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> รับจาก
                                    </p>
                                    <p className="text-foreground font-bold text-sm line-clamp-2 leading-tight">
                                        {currentJob.Origin_Location || "คลังสินค้าหลัก"}
                                    </p>
                                </div>
                                <div className="mt-4 flex-1 flex flex-col items-center px-4">
                                     <div className="w-full h-1 bg-muted rounded-full overflow-hidden relative">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: "60%" }}
                                            className="h-full bg-primary rounded-full relative"
                                        >
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-glow shadow-primary" />
                                        </motion.div>
                                     </div>
                                     <Truck size={14} className="text-primary mt-2" />
                                </div>
                                <div className="space-y-1 max-w-[45%] text-right">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-end gap-1">
                                        ส่งที่ <div className="w-2 h-2 rounded-full bg-accent" />
                                    </p>
                                    <p className="text-foreground font-bold text-sm line-clamp-2 leading-tight">
                                        {currentJob.Dest_Location || "จุดหมายปลายทาง"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Large Action Button */}
                        <div className="relative z-10">
                            <Link href={`/mobile/jobs/${currentJob.Job_ID}`} className="block w-full">
                                <Button className="w-full h-18 rounded-[2rem] bg-foreground hover:bg-foreground/90 text-white font-black text-lg uppercase tracking-[0.15em] shadow-2xl shadow-foreground/20 group transition-all active:scale-95">
                                    จัดการงานนี้
                                    <ArrowUpRight className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20 px-8 glass-panel rounded-[3rem] border-dashed border-border/20"
                    >
                         <div className="w-20 h-20 bg-muted/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                             <Truck className="text-muted-foreground" size={40} strokeWidth={1.5} />
                         </div>
                         <h3 className="text-foreground font-black text-2xl mb-2 italic">พร้อมรับงานใหม่?</h3>
                         <p className="text-muted-foreground text-base font-bold mb-8">ไม่มีงานค้างในมือ กดที่ตลาดเพื่อรับงาน</p>
                         <Link href="/mobile/marketplace">
                             <Button className="h-16 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all">
                                 เข้าสู่ตลาดรับงาน
                             </Button>
                         </Link>
                    </motion.div>
                )}
                </AnimatePresence>
            </motion.div>

            {/* QUEUE / SECONDARY JOBS */}
            {secondaryJobs.length > 0 && (
                <motion.div variants={item} className="space-y-4">
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2 px-2">
                        <div className="w-1.5 h-6 bg-muted rounded-full" />
                        คิวงานถัดไป ({secondaryJobs.length})
                    </h2>
                    <div className="space-y-4">
                        {secondaryJobs.map((job) => (
                            <Link key={job.Job_ID} href={`/mobile/jobs/${job.Job_ID}`}>
                                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-6 flex items-center justify-between active:scale-[0.98] transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-muted/50 rounded-2xl flex items-center justify-center text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-foreground leading-none mb-1">#{job.Job_ID.slice(-6)}</h4>
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">
                                                {job.Customer_Name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden xs:block">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">จุดหมาย</p>
                                            <p className="text-foreground font-bold text-xs truncate max-w-[80px]">{job.Dest_Location}</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-muted/30 text-muted-foreground group-hover:bg-accent/20 group-hover:text-accent transition-all">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* GAMIFICATION / RANK SECTION */}
            <motion.div variants={item} className="glass-panel rounded-[2.5rem] p-6 bg-gradient-to-r from-navy-900 to-primary/20 border-primary/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-500">
                             <ShieldCheck size={24} fill="currentColor" fillOpacity={0.2} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ระดับคะแนน</p>
                            <h4 className="text-xl font-black text-foreground italic">{gamification.rank} DRIVER</h4>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-primary leading-none">{gamification.points}</div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">คะแนนสะสม</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>Rank Progress</span>
                        <span>อีก {gamification.nextRankPoints - gamification.points} แต้มเพื่อเลื่อนระดับ</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                            style={{ width: `${(gamification.points / gamification.nextRankPoints) * 100}%` }} 
                        />
                    </div>
                </div>
            </motion.div>

            {/* FLOATING MARKETPLACE BUTTON */}
            <div className="fixed bottom-32 right-6 z-50">
                 <Link href="/mobile/marketplace">
                     <button className="w-20 h-20 rounded-[2rem] bg-accent flex flex-col items-center justify-center text-white shadow-[0_15px_35px_rgba(182,9,0,0.4)] transition-all hover:scale-110 active:scale-90 border-4 border-background group">
                        <Gavel size={32} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] -mt-0.5">รับงาน</span>
                     </button>
                 </Link>
            </div>
        </motion.div>
    )
}

