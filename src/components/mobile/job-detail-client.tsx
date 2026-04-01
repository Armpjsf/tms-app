"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { 
    MapPin, Phone, User, Package, CheckCircle, 
    ArrowRight, Info, Truck, Activity, ShieldCheck, 
    ClipboardCheck, LayoutGrid, Navigation, Scale, Box,
    ChevronRight, Calendar, Hash, Target, TrendingUp
} from "lucide-react"
import { JobActionButton } from "@/components/mobile/job-action-button"
import { JobWorkflow } from "@/components/mobile/job-workflow"
import { NavigationButton } from "@/components/mobile/navigation-button"
import { RouteStrip } from "@/components/mobile/route-strip"
import { Badge } from "@/components/ui/badge"
import { Job } from "@/lib/supabase/jobs"
import { cn } from "@/lib/utils"

interface JobDetailClientProps {
    job: Job
    success?: string
}

export function JobDetailClient({ job, success }: JobDetailClientProps) {
    const [activeTab, setActiveTab] = useState<'mission' | 'info'>('mission')

    const destinations = typeof job?.original_destinations_json === 'string' 
        ? JSON.parse(job.original_destinations_json) 
        : job?.original_destinations_json || [];

    return (
        <div className="min-h-screen bg-background pb-32 pt-24 relative overflow-hidden flex flex-col">
            {/* High-end Background Decor */}
            <div className="absolute top-0 right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

            <MobileHeader title="รายละเอียดงาน" showBack />

            {/* Premium Sticky Tab Selector */}
            <div className="px-6 mb-8 mt-2 sticky top-24 z-[50]">
                <div className="bg-card/40 backdrop-blur-2xl p-2 rounded-[2.5rem] border border-border/10 flex shadow-lg shadow-black/5">
                    <button 
                        onClick={() => setActiveTab('mission')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-3 h-16 rounded-[2rem] font-black uppercase tracking-[0.15em] transition-all text-sm italic",
                            activeTab === 'mission' ? "bg-primary text-white shadow-xl shadow-primary/30 scale-[1.02]" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity size={20} strokeWidth={2.5} /> ดำเนินงาน
                    </button>
                    <button 
                        onClick={() => setActiveTab('info')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-3 h-16 rounded-[2rem] font-black uppercase tracking-[0.15em] transition-all text-sm italic",
                            activeTab === 'info' ? "bg-primary text-white shadow-xl shadow-primary/30 scale-[1.02]" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Info size={20} strokeWidth={2.5} /> ข้อมูลงาน
                    </button>
                </div>
            </div>

            <div className="flex-1 px-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'mission' ? (
                        <motion.div 
                            key="mission"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {/* Success Notification Inline - Premium Style */}
                            {success && (
                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-7 flex items-center gap-5 text-emerald-500 shadow-xl shadow-emerald-500/5 mb-2 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <CheckCircle size={60} />
                                    </div>
                                    <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                                        <CheckCircle className="text-white" size={32} />
                                    </div>
                                    <div className="relative z-10">
                                        <p className="font-black uppercase tracking-widest text-base italic leading-tight mb-1">สำเร็จเรียบร้อย!</p>
                                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">ข้อมูลถูกส่งไปยังศูนย์ควบคุมแล้ว</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Job ID Header Card */}
                            <div className="flex items-center justify-between px-2">
                                <div className="space-y-1">
                                    <p className="text-accent text-[10px] font-black uppercase tracking-[0.4em] leading-none">สถานะงาน</p>
                                    <h2 className="text-4xl font-black text-foreground tracking-tighter uppercase italic leading-none">#{String(job?.Job_ID || '').slice(-8)}</h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1">กำหนดส่ง</p>
                                    <div className="flex items-center gap-1.5 text-primary">
                                        <Calendar size={14} strokeWidth={2.5} />
                                        <span className="font-black text-sm italic">{job?.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : "-"}</span>
                                    </div>
                                </div>
                            </div>

                            <JobWorkflow currentStatus={job?.Job_Status || 'New'} />

                            <div className="glass-panel p-8 rounded-[3rem] border-primary/10 shadow-2xl space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-primary/5 pointer-events-none transform translate-x-4 -translate-y-4">
                                    <Target size={120} />
                                </div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                            <Navigation size={32} strokeWidth={2.5} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1">ภารกิจที่กำลังทำ</p>
                                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic leading-none">
                                                {job?.Job_Status === 'New' || job?.Job_Status === 'Assigned' ? 'รอเริ่มงาน' : job?.Job_Status}
                                            </h3>
                                        </div>
                                    </div>
                                    <NavigationButton job={job} />
                                </div>

                                <RouteStrip 
                                    origin={job?.Origin_Location}
                                    destination={job?.Dest_Location || job?.Route_Name}
                                    destinations={destinations}
                                    status={job?.Job_Status}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="info"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8 pb-10"
                        >
                            {/* Customer Profile Card */}
                            <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-primary/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-primary/5 pointer-events-none">
                                    <User size={100} />
                                </div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-card border border-border/10 flex items-center justify-center shadow-lg">
                                            <User className="text-primary" size={32} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1">ข้อมูลผู้รับสินค้า</p>
                                            <h3 className="text-2xl font-black text-foreground tracking-tight italic uppercase">{job?.Customer_Name}</h3>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1.5 bg-muted rounded-xl border border-border/10 text-[10px] font-black text-foreground uppercase tracking-widest shrink-0">
                                        ID: {job?.Customer_ID}
                                    </div>
                                </div>
                                
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-start gap-4 p-6 rounded-[2rem] bg-card border border-border/5">
                                        <div className="p-3 bg-accent/10 rounded-2xl text-accent shrink-0">
                                            <MapPin size={22} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">สถานที่นำส่ง</p>
                                            <p className="text-foreground font-bold text-base leading-snug italic break-words">{job?.Dest_Location || job?.Route_Name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500 shrink-0">
                                                <Phone size={22} strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">เบอร์โทรติดต่อ</p>
                                                <p className="text-emerald-600 font-black text-lg italic tracking-widest truncate">ติดต่อลูกค้า</p>
                                            </div>
                                        </div>
                                        <button className="px-6 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0">
                                            โทร
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Cargo Details Grid */}
                            <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-accent/10">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-1.5 h-6 bg-accent rounded-full" />
                                    <h4 className="text-foreground font-black text-xl uppercase tracking-tight italic">รายละเอียดสินค้า</h4>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-card border border-border/10 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-sm">
                                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                                            <Scale size={20} strokeWidth={2.5} />
                                        </div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">น้ำหนักรวม</p>
                                        <div className="flex items-baseline gap-1">
                                            <h5 className="text-2xl font-black text-foreground tracking-tighter italic leading-none">{job?.Weight_Kg?.toLocaleString() || '0.0'}</h5>
                                            <span className="text-[10px] font-black text-muted-foreground">KG</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-card border border-border/10 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-sm">
                                        <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-3">
                                            <Box size={20} strokeWidth={2.5} />
                                        </div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">ปริมาตรรวม</p>
                                        <div className="flex items-baseline gap-1">
                                            <h5 className="text-2xl font-black text-foreground tracking-tighter italic leading-none">{job?.Volume_Cbm || '0.0'}</h5>
                                            <span className="text-[10px] font-black text-muted-foreground">CBM</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-card border border-border/10 rounded-[2rem]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ClipboardCheck size={18} className="text-primary" strokeWidth={2.5} />
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">หมายเหตุ / บันทึก</p>
                                    </div>
                                    <p className="text-foreground font-bold leading-relaxed text-sm italic break-words">{job?.Notes || "ไม่มีข้อมูลเพิ่มเติม"}</p>
                                </div>
                            </div>

                            {/* Revenue Highlight Card */}
                            {job?.Show_Price_To_Driver && (
                                <div className="relative group p-8 rounded-[3.5rem] bg-slate-900 border border-primary/30 overflow-hidden shadow-2xl shadow-foreground/20">
                                    <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                                        <TrendingUp size={120} className="text-primary" />
                                    </div>
                                    <div className="relative z-10 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                                                <TrendingUp size={18} className="text-primary" strokeWidth={2.5} />
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/70 italic">ค่าตอบแทนที่จะได้รับ</h4>
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <span className="text-5xl font-black text-white tracking-tighter leading-none italic">฿{(job?.Cost_Driver_Total || 0).toLocaleString()}</span>
                                            <div className="px-3 py-1.5 bg-primary rounded-xl text-white font-black text-[10px] uppercase tracking-widest mb-2 shadow-lg shadow-primary/30 rotate-2 shrink-0">
                                                เรทพิเศษ
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Action Center */}
            <div className="fixed bottom-32 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-500">
                <JobActionButton job={{
                    ...job,
                    original_destinations_json: destinations
                } as any} />
            </div>
        </div>
    )
}
