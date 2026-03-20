"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
    Truck, CheckCircle, Clock, Trophy, Medal, Crown, 
    MapPin, FileText, ChevronRight, TrendingUp, Star,
    LayoutGrid, Settings, Bell, Search, Plus
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
    const progressPercent = gamification.nextRankPoints > 0 
        ? (gamification.points / gamification.nextRankPoints) * 100 
        : 100

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
                    <button className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-primary">
                        <LayoutGrid size={24} />
                    </button>
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase">
                        Candy<span className="text-primary">Logistics</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="relative p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                    </button>
                    <Avatar className="h-11 w-11 border-2 border-primary/20 bg-secondary">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.driverName}`} />
                        <AvatarFallback>{session.driverName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
            </motion.div>

            {/* Title & Stats Overview */}
            <motion.div variants={item} className="space-y-1">
                <h2 className="text-4xl font-black text-white px-1">Active Shipments</h2>
                <p className="text-slate-500 font-bold px-1 tracking-tight">Monitoring {stats.total} candy drops in transit</p>
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
                        <div className="text-4xl font-black text-white tracking-tighter">0{stats.total}</div>
                        <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-80">ON ROUTE</div>
                    </div>
                </div>

                <div className="glass-panel rounded-[2.5rem] p-6 aspect-square flex flex-col items-center justify-center gap-3 group transition-all hover:scale-105">
                    <div className="absolute top-4 right-4 text-blue-400 opacity-20 group-hover:opacity-60 transition-opacity">
                         <Clock size={40} />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-1">
                         <Clock className="text-blue-400" size={20} strokeWidth={2.5} />
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-black text-white tracking-tighter">04</div>
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] opacity-80">PENDING</div>
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
                                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                            <Star size={16} className="text-primary fill-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-white tracking-tighter">#{currentJob.Job_ID}</h4>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{currentJob.Customer_Name}</p>
                                    </div>
                                </div>
                                <div className="px-4 py-1.5 rounded-full bg-primary text-[10px] font-black text-white uppercase tracking-widest shadow-xl shadow-primary/30">
                                    IN TRANSIT
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500">WAREHOUSE A</span>
                                    <span className="text-primary">75% COMPLETE</span>
                                    <span className="text-slate-500">CENTRAL HUB</span>
                                </div>
                                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                                     <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: "75%" }}
                                        className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(255,30,133,0.5)]"
                                     />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex -space-x-3">
                                    {[1, 2].map(i => (
                                        <Avatar key={i} className="h-10 w-10 border-2 border-secondary shadow-xl">
                                            <AvatarImage src={`https://i.pravatar.cc/100?img=${i + 10}`} />
                                            <AvatarFallback>U</AvatarFallback>
                                        </Avatar>
                                    ))}
                                    <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border-2 border-secondary flex items-center justify-center text-[10px] font-black text-white">
                                        +2
                                    </div>
                                </div>
                                <Button className="h-14 px-10 rounded-2xl bg-primary hover:brightness-110 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 transition-all">
                                    TRACK LIVE
                                </Button>
                            </div>
                        </div>

                        {/* Secondary Secondary Card */}
                        <div className="glass-panel rounded-[3rem] p-8 space-y-6 opacity-80 scale-95 origin-top transition-all hover:opacity-100 hover:scale-100">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                     <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center">
                                         <Clock className="text-accent" size={24} />
                                     </div>
                                     <div>
                                         <h4 className="text-2xl font-black text-white tracking-tighter">#CL-9011-ZC</h4>
                                         <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sour Worms Logistics</p>
                                     </div>
                                </div>
                                <div className="px-4 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-[10px] font-black text-accent uppercase tracking-widest">
                                    SORTING
                                </div>
                            </div>
                            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full w-[20%] bg-accent rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)]" />
                            </div>
                            <div className="flex items-center justify-between text-slate-500">
                                <div className="flex items-center gap-2 text-[10px] font-bold">
                                    <MapPin size={14} className="text-accent" />
                                    ESTIMATED: 2H 45M
                                </div>
                                <Button variant="ghost" className="text-white font-black text-xs uppercase tracking-widest hover:text-primary">
                                    DETAILS
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 px-8 glass-panel rounded-[3rem] border-dashed border-white/10">
                         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                             <Truck className="text-slate-600" size={32} />
                         </div>
                         <h3 className="text-white font-black text-xl mb-1">No Active Drops</h3>
                         <p className="text-slate-500 text-sm font-medium mb-6">Your cargo bay is currently empty.</p>
                         <Button className="h-14 px-8 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30">
                             DASHBOARD
                         </Button>
                    </div>
                )}
            </motion.div>

            {/* Floating Action Button */}
            <div className="fixed bottom-32 right-6 z-50">
                 <button className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-[0_8px_30px_rgba(255,30,133,0.4)] transition-transform hover:scale-110 active:scale-95 border-4 border-[#0a0518]">
                    <Plus size={32} strokeWidth={3} />
                 </button>
            </div>
        </motion.div>
    )
}
