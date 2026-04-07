"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { 
    MapPin, Phone, User, CheckCircle, 
    Info, Activity, Navigation, 
    TrendingUp, Sparkles, Loader2, Target
} from "lucide-react"
import { JobActionButton } from "@/components/mobile/job-action-button"
import { JobWorkflow } from "@/components/mobile/job-workflow"
import { NavigationButton } from "@/components/mobile/navigation-button"
import { RouteStrip } from "@/components/mobile/route-strip"
import { Job } from "@/lib/supabase/jobs"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface JobDetailClientProps {
    job: Job
    success?: string
}

export function JobDetailClient({ job, success }: JobDetailClientProps) {
    const [activeTab, setActiveTab] = useState<'mission' | 'info'>('mission')
    const [optimizing, setOptimizing] = useState(false)
    const router = useRouter()

    const destinations = typeof job?.original_destinations_json === 'string' 
        ? JSON.parse(job.original_destinations_json) 
        : job?.original_destinations_json || [];

    return (
        <div className="min-h-screen bg-background pb-40 pt-24 relative overflow-hidden flex flex-col">
            {/* Background Decor */}
            <div className="absolute top-0 right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

            <MobileHeader title="รายละเอียดภารกิจ" showBack />

            {/* STICKY TAB SELECTOR */}
            <div className="px-5 mb-8 mt-2 sticky top-24 z-[50]">
                <div className="bg-card/80 backdrop-blur-xl p-2 rounded-2xl border border-border/10 flex shadow-lg ring-1 ring-white/5">
                    <button 
                        onClick={() => setActiveTab('mission')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-3 h-14 rounded-xl font-black uppercase tracking-widest transition-all text-sm italic",
                            activeTab === 'mission' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity size={20} /> ดำเนินงาน
                    </button>
                    <button 
                        onClick={() => setActiveTab('info')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-3 h-14 rounded-xl font-black uppercase tracking-widest transition-all text-sm italic",
                            activeTab === 'info' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Info size={20} /> ข้อมูลงาน
                    </button>
                </div>
            </div>

            <div className="flex-1 px-6 overflow-y-auto space-y-8 pb-10">
                <AnimatePresence mode="wait">
                    {activeTab === 'mission' ? (
                        <motion.div 
                            key="mission"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-10"
                        >
                             {/* Success Notification */}
                             {success && (
                                 <motion.div 
                                     initial={{ scale: 0.95, opacity: 0 }}
                                     animate={{ scale: 1, opacity: 1 }}
                                     className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4 text-emerald-500 shadow-sm"
                                 >
                                     <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                         <CheckCircle size={22} />
                                     </div>
                                     <p className="font-black uppercase tracking-widest text-xs italic">อัพเดทสถานะสำเร็จ!</p>
                                 </motion.div>
                             )}

                            {/* Job ID Header */}
                            <div className="flex items-end justify-between px-2">
                                <div className="space-y-1">
                                    <p className="text-accent text-[10px] font-black uppercase tracking-[0.4em] leading-none opacity-70">Job ID Descriptor</p>
                                    <h2 className="text-4xl font-black text-foreground tracking-tighter uppercase italic leading-none">
                                        #{String(job?.Job_ID || '').slice(-8).toUpperCase()}
                                    </h2>
                                </div>
                                <div className="text-right pb-1">
                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Plan Date</p>
                                    <span className="font-black text-sm text-primary italic bg-primary/10 px-3 py-1 rounded-lg">
                                        {job?.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : "-"}
                                    </span>
                                </div>
                            </div>

                            <JobWorkflow currentStatus={job?.Job_Status || 'New'} />

                            <div className="glass-panel p-8 rounded-[3rem] border-primary/20 shadow-xl bg-card/40 backdrop-blur-md space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 text-primary/5 pointer-events-none transform translate-x-4 -translate-y-4">
                                    <Target size={160} />
                                </div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                                            <Navigation size={28} strokeWidth={2.5} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Operational Status</p>
                                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic leading-none">
                                                {job?.Job_Status === 'New' || job?.Job_Status === 'Assigned' ? 'W_PENDING' : job?.Job_Status.toUpperCase()}
                                            </h3>
                                        </div>
                                    </div>
                                    <NavigationButton job={job} />
                                </div>

                                <div className="pt-2">
                                    <RouteStrip 
                                        origin={job?.Origin_Location}
                                        destination={job?.Dest_Location || job?.Route_Name}
                                        destinations={destinations}
                                        status={job?.Job_Status}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="info"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {/* Customer Card */}
                            <div className="glass-panel p-7 rounded-[2.5rem] space-y-8 border-primary/10 shadow-lg bg-card/40">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-card border border-border/10 flex items-center justify-center shadow-md">
                                            <User className="text-primary" size={28} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-70">Client Entity</p>
                                            <h3 className="text-2xl font-black text-foreground tracking-tight italic uppercase leading-none">{job?.Customer_Name}</h3>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1.5 bg-muted rounded-xl text-[10px] font-black text-foreground uppercase tracking-widest border border-border/50">
                                        {job?.Customer_ID}
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-card/60 border border-border/10 shadow-inner">
                                        <MapPin size={22} className="text-accent shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Terminus Location</p>
                                            <p className="text-foreground font-bold text-sm leading-snug italic break-words">{job?.Dest_Location || job?.Route_Name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                                <Phone size={20} className="text-emerald-500 shrink-0" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-70">Voice Channel</p>
                                                <p className="text-emerald-600 font-black text-lg italic tracking-widest truncate">CONTACT CLIENT</p>
                                            </div>
                                        </div>
                                        <button className="px-6 h-12 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all border-b-4 border-emerald-800/40">
                                            DIAL
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel p-7 rounded-[2.5rem] space-y-6 border-accent/10 shadow-lg bg-card/40">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-5 bg-card border border-border/10 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-70">Mass Load</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <h5 className="text-3xl font-black text-foreground italic leading-none">{job?.Weight_Kg?.toLocaleString() || '0.0'}</h5>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase">KG</span>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-card border border-border/10 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-70">Volume</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <h5 className="text-3xl font-black text-foreground italic leading-none">{job?.Volume_Cbm || '0.0'}</h5>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase">CBM</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-card/60 border border-border/10 rounded-2xl shadow-inner">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-70">Mission Protocol Notes</p>
                                    <p className="text-foreground font-bold leading-relaxed text-sm italic break-words">{job?.Notes || "No tactical notes available."}</p>
                                </div>
                            </div>

                            {/* Payout - High visibility */}
                            {job?.Show_Price_To_Driver && (
                                <div className="p-7 rounded-[2.5rem] bg-slate-900 border border-primary/30 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-inner">
                                            <TrendingUp size={24} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 mb-0.5">Asset Compensation</p>
                                            <h4 className="text-sm font-black uppercase tracking-widest text-white italic">PAYOUT_CREDIT</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2 relative z-10">
                                        <span className="text-4xl font-black text-white tracking-tighter italic">฿{(job?.Cost_Driver_Total || 0).toLocaleString()}</span>
                                        <div className="px-3 py-1 bg-primary rounded-lg text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/40">ELITE</div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* FLOATING ACTION CENTER - RELIABLE POSITIONING */}
            <div className="fixed bottom-[100px] left-6 right-6 z-[140] animate-in slide-in-from-bottom-10 duration-700">
                <div className="shadow-[0_-20px_50px_rgba(0,0,0,0.3)] rounded-[2.5rem]">
                    <JobActionButton job={{
                        ...job,
                        original_destinations_json: destinations
                    } as Parameters<typeof JobActionButton>[0]['job']} />
                </div>
            </div>
        </div>
    )
}
