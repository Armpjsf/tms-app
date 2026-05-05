"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
    Truck, MapPin, 
    Bell, Gavel, Clock, Star, Banknote, 
    ChevronRight, ArrowUpRight, ShieldCheck
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Job } from "@/lib/supabase/jobs"
import { format, isToday, isTomorrow, parseISO } from "date-fns"
import { th } from "date-fns/locale"

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
    activeJobs?: Job[]
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
    hidden: { opacity: 0 },
    show: { opacity: 1 }
}

export function DashboardClient({ session, currentJob, activeJobs = [], gamification, todayIncome }: Omit<DashboardClientProps, 'stats'>) {
    const supabase = createClient()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const greeting = useMemo(() => {
        const hour = new Date().getHours()
        if (hour >= 5 && hour < 12) return "สวัสดีตอนเช้า"
        if (hour >= 12 && hour < 17) return "สวัสดีตอนบ่าย"
        return "สวัสดีตอนเย็น"
    }, [])

    const getRoundFromNotes = (notes: string | null) => {
        if (!notes) return "1"
        const match = notes.match(/\[รอบ:\s*(\d+)\]/)
        return match ? match[1] : "1"
    }

    // Dynamic Grouping Logic
    const missions = useMemo(() => {
        const groups = new Map<string, Job[]>()
        
        activeJobs.forEach(job => {
            const round = getRoundFromNotes(job.Notes)
            const key = `${job.Plan_Date}_${job.Vehicle_Plate}_${round}`
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(job)
        })

        return Array.from(groups.values()).map(group => {
            const first = group[0]
            const totalWeight = group.reduce((sum, j) => sum + (j.Weight_Kg || 0), 0)
            const totalVolume = group.reduce((sum, j) => sum + (j.Volume_Cbm || 0), 0)
            const round = getRoundFromNotes(first.Notes)
            
            return {
                id: first.Job_ID, // Use first ID as representative
                groupKey: `${first.Plan_Date}_${first.Vehicle_Plate}_${round}`,
                jobs: group,
                mainJob: first,
                customerNames: Array.from(new Set(group.map(j => j.Customer_Name))).join(', '),
                totalWeight,
                totalVolume,
                round,
                status: group.every(j => j.Job_Status === 'Completed') ? 'Completed' : 
                        group.some(j => ['In Transit', 'Arrived'].includes(j.Job_Status || '')) ? 'In Progress' : 
                        'Pending'
            }
        })
    }, [activeJobs])

    const currentMission = useMemo(() => {
        if (!currentJob) return null
        return missions.find(m => m.jobs.some(j => j.Job_ID === currentJob.Job_ID)) || null
    }, [currentJob, missions])

    const getJobDateInfo = (dateStr: string | null) => {
        if (!dateStr) return { label: "", type: 'other' }
        try {
            const date = parseISO(dateStr)
            const datePart = format(date, "d MMM", { locale: th })
            if (isToday(date)) return { label: `วันนี้ (${datePart})`, type: 'today' }
            if (isTomorrow(date)) return { label: `พรุ่งนี้ (${datePart})`, type: 'tomorrow' }
            return { label: datePart, type: 'other' }
        } catch {
            return { label: dateStr, type: 'other' }
        }
    }

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
            className="space-y-8 pb-32 pt-[env(safe-area-inset-top)]"
        >
            {/* HEADER - CLEANER & LARGER */}
            <motion.div variants={item} className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Link href="/mobile/profile">
                            <Avatar className="h-14 w-14 border-2 border-primary/20 ring-4 ring-primary/5 active:scale-90 transition-all shadow-md">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.driverName}`} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">{session.driverName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-4 h-4 rounded-full border-2 border-background" />
                    </div>
                    <div>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest leading-none mb-1.5 opacity-60">
                            {greeting || "สวัสดีคุณ"}
                        </p>
                        <h1 className="text-2xl font-black text-foreground tracking-tight leading-none truncate max-w-[180px]">
                            {session.driverName}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/mobile/notifications" className="relative p-3 rounded-2xl bg-card border border-border shadow-sm active:scale-90 transition-all h-12 w-12 flex items-center justify-center">
                        <Bell size={22} className="text-foreground" />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card shadow-sm" />
                    </Link>
                </div>
            </motion.div>

            {/* KEY STATS - BETTER CONTRAST */}
            <motion.div variants={item} className="grid grid-cols-2 gap-4">
                <div className="glass-panel rounded-3xl p-6 relative overflow-hidden bg-primary/5 border-primary/10 shadow-sm">
                    <div className="relative z-10 space-y-2">
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-70">งานที่ต้องทำ</p>
                        <div className="text-4xl font-black text-foreground tracking-tighter leading-none">
                            {activeJobs.length < 10 ? `0${activeJobs.length}` : activeJobs.length}
                        </div>
                    </div>
                    <div className="absolute -right-3 -bottom-3 opacity-[0.07] rotate-12">
                         <Truck size={80} />
                    </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 relative overflow-hidden bg-accent/5 border-accent/10 shadow-sm">
                    <div className="relative z-10 space-y-2">
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-70">รายได้วันนี้</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-foreground tracking-tighter">฿{todayIncome.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="absolute -right-3 -bottom-3 opacity-[0.07] rotate-12">
                         <Banknote size={80} />
                    </div>
                </div>
            </motion.div>

            {/* CURRENT JOB - LARGER TEXT & BETTER SPACING */}
            <motion.div variants={item} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-accent rounded-full" />
                        งานปัจจุบัน
                    </h2>
                    {missions.length > 0 && (
                        <Link href="/mobile/jobs" className="text-accent text-xs font-black uppercase tracking-widest flex items-center gap-1.5 bg-accent/5 px-3 py-1.5 rounded-full border border-accent/10">
                            ดูทั้งหมด ({missions.length} ภารกิจ) <ChevronRight size={14} />
                        </Link>
                    )}
                </div>

                <AnimatePresence mode="wait">
                {currentMission ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="glass-panel rounded-[2.5rem] p-7 space-y-6 relative overflow-hidden shadow-xl border-primary/20 bg-background/40 backdrop-blur-md"
                    >
                        <div className="absolute top-0 right-0 p-4">
                             <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg text-accent text-[10px] font-black uppercase tracking-widest">
                                รอบที่ {currentMission.round}
                             </div>
                        </div>
                        {/* Job ID & Status */}
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                    <Star size={26} className="text-white fill-white" />
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black text-foreground tracking-tighter leading-none mb-1.5">
                                        MISSION: {currentMission.jobs.length} รายการ
                                    </h4>
                                    <p className="text-muted-foreground text-sm font-bold truncate max-w-[220px]">
                                        {currentMission.customerNames}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className={cn(
                                    "px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border shadow-sm",
                                    currentMission.status === 'In Progress'
                                    ? "bg-accent text-white border-accent/20"
                                    : "bg-muted text-muted-foreground border-border/50"
                                )}>
                                    {currentMission.status === 'Pending' ? 'รอเริ่มงาน' : 'ดำเนินการอยู่'}
                                </div>
                                {mounted && (() => {
                                    const dateInfo = getJobDateInfo((currentJob as any).Plan_Date)
                                    if (!dateInfo.label) return null
                                    return (
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm",
                                            dateInfo.type === 'today' ? "bg-emerald-500 text-white border-emerald-400" :
                                            dateInfo.type === 'tomorrow' ? "bg-yellow-400 text-black border-yellow-300" :
                                            "bg-primary/5 text-primary/70 border-primary/10"
                                        )}>
                                            {dateInfo.label}
                                        </span>
                                    )
                                })()}
                            </div>
                        </div>

                        {/* Location Details - Vertical Stack for better mobile fit */}
                        {(() => {
                            const routeStr = currentJob.Route_Name || currentJob.Dest_Location || "";
                            const points = routeStr.split(/[→\->]/).map(p => p.trim()).filter(Boolean);
                            
                            let displayOrigin = currentJob.Origin_Location || "ไม่ระบุต้นทาง";
                            let displayDest = currentJob.Dest_Location || "ไม่ระบุปลายทาง";

                            if (points.length >= 2) {
                                displayOrigin = points[0];
                                displayDest = points[points.length - 1];
                            }

                            return (
                                <div className="space-y-4 bg-muted/20 rounded-[2rem] p-6 border border-border/40 relative">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">น้ำหนักรวม</p>
                                            <p className="text-sm font-black text-foreground italic">{currentMission.totalWeight.toLocaleString()} KG</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">ปลายทาง</p>
                                            <p className="text-sm font-black text-foreground italic">{currentMission.jobs.length} จุดส่ง</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-border/20 w-full my-2" />
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">ต้นทาง</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-foreground font-bold text-sm truncate">{currentMission.mainJob.Origin_Location || 'คลังสินค้า'}</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 text-right">
                                            <p className="text-[10px] font-black text-accent/70 uppercase tracking-widest mb-1">ปลายทางหลัก</p>
                                            <div className="flex items-center gap-2 justify-end">
                                                <span className="text-foreground font-bold text-sm truncate">{currentMission.mainJob.Dest_Location}</span>
                                                <div className="w-2 h-2 rounded-full bg-accent" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Action Button */}
                        <div className="relative z-10 pt-2">
                            <Link href={`/mobile/jobs/${currentMission.id}?group_ids=${currentMission.jobs.map(j => j.Job_ID).join(',')}`} className="block w-full">
                                <Button className="w-full h-16 rounded-[1.5rem] bg-foreground hover:bg-foreground/90 text-white font-black text-lg uppercase tracking-widest shadow-2xl active:scale-95 transition-all gap-3 border-b-4 border-black/20">
                                    จัดการภารกิจ ({currentMission.jobs.length})
                                    <ArrowUpRight className="w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16 px-8 glass-panel rounded-[3rem] border-dashed border-border/40 bg-muted/5"
                    >
                         <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
                             <Truck size={36} className="text-muted-foreground/30" />
                         </div>
                         <h3 className="text-foreground font-black text-2xl mb-2 italic">พร้อมรับงานใหม่?</h3>
                         <p className="text-muted-foreground text-base font-bold mb-8">ขณะนี้คุณยังไม่มีภารกิจค้างในระบบ</p>
                         <p className="text-muted-foreground text-base font-bold">ขณะนี้คุณยังไม่มีภารกิจค้างในระบบ</p>
                    </motion.div>
                )}
                </AnimatePresence>
            </motion.div>

            {/* QUEUE - BETTER SPACING */}
            {secondaryJobs.length > 0 && (
                <motion.div variants={item} className="space-y-4 pt-2">
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2 px-2">
                        <div className="w-1.5 h-6 bg-muted-foreground/20 rounded-full" />
                        คิวงานถัดไป ({secondaryJobs.length})
                    </h2>
                    <div className="space-y-4">
                        {missions.filter(m => m.id !== currentMission?.id).map((mission) => (
                            <Link key={mission.id} href={`/mobile/jobs/${mission.id}?group_ids=${mission.jobs.map(j => j.Job_ID).join(',')}`}>
                                <div className="bg-card/60 border border-border/60 rounded-[2rem] p-5 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-muted/50 rounded-2xl flex items-center justify-center text-muted-foreground border border-border/20 relative">
                                            <Clock size={24} />
                                            {mission.jobs.length > 1 && (
                                                <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                                                    {mission.jobs.length}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-foreground leading-none mb-1.5">
                                                {mission.jobs.length > 1 ? `MISSION: ${mission.jobs.length} รายการ` : `#${mission.id.slice(-6).toUpperCase()}`}
                                            </h4>
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest truncate max-w-[150px] opacity-70">
                                                {mission.customerNames}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="p-2 bg-muted/20 rounded-full">
                                            <ChevronRight size={20} className="text-muted-foreground" />
                                        </div>
                                        {mounted && (() => {
                                            const dateInfo = getJobDateInfo(mission.mainJob.Plan_Date)
                                            if (!dateInfo.label) return null
                                            return (
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                                    dateInfo.type === 'today' ? "bg-emerald-500 text-white border-emerald-400" :
                                                    dateInfo.type === 'tomorrow' ? "bg-yellow-400 text-black border-yellow-300" :
                                                    "bg-primary/5 text-primary/60 border-primary/10"
                                                )}>
                                                    {dateInfo.label}
                                                </span>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* RANK CARD - PREMIUM FEEL */}
            <motion.div variants={item} className="glass-panel rounded-[2rem] p-6 bg-navy-900/40 border-primary/10 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-500 border border-amber-400/20 shadow-sm">
                             <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">คะแนนสะสม</p>
                            <h4 className="text-xl font-black text-foreground italic">{gamification.rank}</h4>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-primary tracking-tighter leading-none">{gamification.points}</div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Points</p>
                    </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)] transition-all duration-1000" 
                        style={{ width: `${(gamification.points / gamification.nextRankPoints) * 100}%` }} 
                    />
                </div>
            </motion.div>

        </motion.div>
    )
}
