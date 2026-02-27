"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
    Truck, CheckCircle, Clock, Trophy, Medal, Crown, 
    MapPin, FileText, ChevronRight, TrendingUp, Star 
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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

export function DashboardClient({ session, stats, currentJob, gamification, todayIncome }: DashboardClientProps) {
    const getRankIcon = (rank: string) => {
        const iconClass = "w-8 h-8 filter drop-shadow-lg"
        switch(rank) {
            case 'Platinum': return <Crown className={`${iconClass} text-purple-400`} />
            case 'Gold': return <Trophy className={`${iconClass} text-yellow-500`} />
            case 'Silver': return <Medal className={`${iconClass} text-slate-300`} />
            default: return <Medal className={`${iconClass} text-orange-700`} />
        }
    }

    const getRankColor = (rank: string) => {
        switch(rank) {
            case 'Platinum': return 'from-purple-600/40 via-indigo-600/20 to-transparent border-purple-500/40 shadow-purple-500/10'
            case 'Gold': return 'from-yellow-600/40 via-orange-600/20 to-transparent border-yellow-500/40 shadow-yellow-500/10'
            case 'Silver': return 'from-slate-500/40 via-slate-700/20 to-transparent border-slate-400/40 shadow-slate-400/10'
            default: return 'from-orange-700/40 via-orange-900/20 to-transparent border-orange-700/40 shadow-orange-700/10'
        }
    }

    const progressPercent = gamification.nextRankPoints > 0 
        ? (gamification.points / gamification.nextRankPoints) * 100 
        : 100

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            {/* Header Section */}
            <motion.div variants={item} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.driverName}`} />
                            <AvatarFallback>{session.driverName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">สวัสดี, {session.driverName}</h2>
                        <p className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                            <Clock size={12} className="text-primary" /> สู่ระบบเมื่อ 5 นาทีที่แล้ว
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <motion.div 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-1.5"
                    >
                        <div className="text-lg font-black text-emerald-400">
                           ฿{(todayIncome || 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-widest">Income</div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Gamification Glass Card */}
            <motion.div variants={item} whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                <Card className={`overflow-hidden border bg-gradient-to-br backdrop-blur-xl ${getRankColor(gamification.rank)}`}>
                    <CardContent className="p-5 relative">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <motion.div 
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4 }}
                                    className="p-3 bg-white/10 rounded-2xl shadow-inner border border-white/10"
                                >
                                    {getRankIcon(gamification.rank)}
                                </motion.div>
                                <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                        <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-black">Driver Status</span>
                                    </div>
                                    <div className="text-xl font-black text-white">{gamification.rank} Elite</div>
                                </div>
                            </div>
                            <div className="text-right bg-black/20 px-3 py-2 rounded-xl border border-white/5">
                                <div className="text-xl font-black text-white">{gamification.points}</div>
                                <div className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Points</div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between items-end text-[10px] font-bold text-white/60">
                                <span className="flex items-center gap-1"><TrendingUp size={10} /> แผนงานประจำเดือน</span>
                                {gamification.nextRankPoints > 0 ? (
                                    <span>เป้าหมาย {gamification.nextRankPoints} คะแนน</span>
                                ) : (
                                    <span className="text-purple-300">Level Max!</span>
                                )}
                            </div>
                            <div className="relative h-2.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className={`h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] ${
                                        gamification.rank === 'Gold' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                                        gamification.rank === 'Platinum' ? 'bg-gradient-to-r from-purple-400 to-indigo-500' : 
                                        'bg-gradient-to-r from-emerald-400 to-blue-500'
                                    }`}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-[9px] text-white/40">
                                     เสร็จสิ้นงานเดือนนี้ <span className="text-white font-bold">{gamification.monthlyCompleted} ครั้ง</span>
                                </p>
                                <p className="text-[9px] text-white/40">
                                    อีก <span className="text-white font-bold">{Math.max(0, gamification.nextRankPoints - gamification.points)}</span> คะแนนเพื่อเลื่อนขั้น
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Quick Action Bento Grid */}
            <motion.div variants={item} className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900 border-slate-800 overflow-hidden relative group active:scale-95 transition-all">
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-5 flex flex-col gap-1">
                        <div className="p-2.5 bg-primary/20 rounded-xl w-fit mb-2">
                            <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-2xl font-black text-foreground">{stats.total}</span>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">งานวันนี้</span>
                    </CardContent>
                </Card>
                
                <Card className="bg-slate-900 border-slate-800 overflow-hidden relative group active:scale-95 transition-all">
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-5 flex flex-col gap-1">
                        <div className="p-2.5 bg-emerald-500/20 rounded-xl w-fit mb-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-2xl font-black text-foreground">{stats.completed}</span>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">สำเร็จแล้ว</span>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Current Work Section */}
            <motion.div variants={item}>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-foreground text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                        Active Mission
                    </h3>
                    {currentJob && (
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            ['In Progress', 'In Transit'].includes(currentJob.Job_Status) 
                                ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        }`}>
                            {currentJob.Job_Status}
                        </span>
                    )}
                </div>
                
                {currentJob ? (
                    <Link href={`/mobile/jobs/${currentJob.Job_ID}`}>
                        <Card className="bg-slate-900 border-slate-800 active:scale-95 transition-all overflow-hidden relative shadow-2xl">
                            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                                <Truck size={80} />
                            </div>
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                                            <Truck className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-foreground font-black text-sm">{currentJob.Job_ID}</h4>
                                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-tight">{currentJob.Customer_Name}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-600" size={18} />
                                </div>
                                
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-500 text-[9px] font-black uppercase mb-0.5">Pickup Origin</p>
                                            <p className="text-slate-200 text-xs font-medium truncate">{currentJob.Origin_Location || 'ไม่ระบุ'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full border-2 border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-500 text-[9px] font-black uppercase mb-0.5">Delivery Point</p>
                                            <p className="text-slate-200 text-xs font-medium truncate">{currentJob.Dest_Location || currentJob.Route_Name || 'ไม่ระบุ'}</p>
                                        </div>
                                    </div>
                                </div>

                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 text-center mt-2 group-hover:bg-primary/20 transition-colors"
                                >
                                    <span className="text-primary text-[10px] font-black uppercase tracking-widest">TAP TO MANAGE JOB</span>
                                </motion.div>
                            </CardContent>
                        </Card>
                    </Link>
                ) : (
                    <Card className="bg-slate-900/30 border-slate-800 border-dashed py-10">
                        <CardContent className="text-center">
                            <div className="bg-slate-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                               <Clock className="text-slate-600" size={20} />
                            </div>
                            <p className="text-slate-500 text-sm font-medium">ไม่มีงานที่ดำเนินอยู่ในขณะนี้</p>
                            <Link href="/mobile/jobs" className="text-primary text-xs font-black mt-2 inline-block uppercase tracking-widest">
                                ค้นหางานใหม่
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </motion.div>

            {/* Bottom Actions Cards */}
            <motion.div variants={item} className="grid grid-cols-2 gap-4">
                <Link href="/mobile/jobs">
                    <Card className="bg-slate-900 border-slate-800 active:scale-95 transition-all overflow-hidden group">
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                             <div className="transition-transform group-hover:scale-110 duration-300">
                                <FileText className="w-6 h-6 text-primary" />
                             </div>
                             <span className="text-xs font-bold text-foreground">งานของฉัน</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/mobile/map">
                    <Card className="bg-slate-900 border-slate-800 active:scale-95 transition-all overflow-hidden group">
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                             <div className="transition-transform group-hover:scale-110 duration-300">
                                <MapPin className="w-6 h-6 text-indigo-500" />
                             </div>
                             <span className="text-xs font-bold text-foreground">แผนที่งาน</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/mobile/vehicle-check" className="col-span-2">
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                        <Button className="relative w-full h-20 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white rounded-2xl flex items-center justify-between px-6 shadow-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-xl">
                                    <Truck className="text-primary" size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-black uppercase tracking-widest">Vehicle Check</div>
                                    <div className="text-[10px] text-muted-foreground font-bold">ตรวจสอบสภาพรถประจำวัน</div>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-700" size={20} />
                        </Button>
                    </motion.div>
                </Link>
            </motion.div>
        </motion.div>
    )
}
