"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { 
    MapPin, Phone, User, Package, CheckCircle, 
    ArrowRight, Info, Truck, Activity, ShieldCheck, 
    ClipboardCheck, LayoutGrid, Navigation, Scale, Box
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

    const destinations = typeof job.original_destinations_json === 'string' 
        ? JSON.parse(job.original_destinations_json) 
        : job.original_destinations_json;

    return (
        <div className="min-h-screen bg-background pb-32 pt-24 relative overflow-hidden flex flex-col">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

            <MobileHeader title={`งาน #${String(job.Job_ID || '').slice(-6)}`} showBack />

            {/* Premium Tab Selector */}
            <div className="px-6 mb-6">
                <div className="bg-muted/30 backdrop-blur-xl p-1.5 rounded-[2rem] border border-border/5 flex">
                    <button 
                        onClick={() => setActiveTab('mission')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 h-14 rounded-[1.5rem] font-black uppercase tracking-widest transition-all text-base font-bold",
                            activeTab === 'mission' ? "bg-primary text-foreground shadow-xl shadow-primary/20" : "text-muted-foreground"
                        )}
                    >
                        <Activity size={18} /> ดำเนินงาน
                    </button>
                    <button 
                        onClick={() => setActiveTab('info')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 h-14 rounded-[1.5rem] font-black uppercase tracking-widest transition-all text-base font-bold",
                            activeTab === 'info' ? "bg-primary text-foreground shadow-xl shadow-primary/20" : "text-muted-foreground"
                        )}
                    >
                        <Info size={18} /> รายละเอียด
                    </button>
                </div>
            </div>

            <div className="flex-1 px-6 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {activeTab === 'mission' ? (
                        <motion.div 
                            key="mission"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            {/* Success Notification Inline */}
                            {success && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[2rem] p-6 flex items-center gap-4 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-2">
                                    <CheckCircle className="shrink-0" />
                                    <div className="text-xl">
                                        <p className="font-black uppercase tracking-widest text-lg font-bold">สำเร็จแล้ว!</p>
                                        <p className="opacity-80 font-bold">ข้อมูลถูกซิงค์กับศูนย์ควบคุมแล้ว</p>
                                    </div>
                                </div>
                            )}

                            <JobWorkflow currentStatus={job.Job_Status || 'New'} />

                            <div className="glass-panel p-8 rounded-[2.5rem] border-border/5 shadow-2xl space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                                            <Navigation className="text-primary" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">สถานะปัจจุบัน</p>
                                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">{job.Job_Status}</h3>
                                        </div>
                                    </div>
                                    <NavigationButton job={job} />
                                </div>

                                <RouteStrip 
                                    origin={job.Origin_Location}
                                    destination={job.Dest_Location || job.Route_Name}
                                    destinations={destinations}
                                    status={job.Job_Status}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="info"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {/* Customer Brief */}
                            <div className="glass-panel p-8 rounded-[3rem] space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-border/10 flex items-center justify-center shadow-lg">
                                            <User className="text-primary" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">ข้อมูลลูกค้า</p>
                                            <h3 className="text-2xl font-black text-foreground tracking-tighter leading-none">{job.Customer_Name}</h3>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="border-border/10 text-muted-foreground px-3 py-1 rounded-xl font-bold uppercase">ID: {job.Customer_ID}</Badge>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-border/5">
                                        <div className="p-2.5 bg-accent/20 rounded-xl text-accent">
                                            <MapPin size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">สถานที่ส่ง</p>
                                            <p className="text-white font-bold leading-relaxed">{job.Dest_Location || job.Route_Name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                                                <Phone size={20} />
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">การติดต่อ</p>
                                                <p className="text-emerald-400 font-black text-base font-bold uppercase tracking-widest">ช่องทางติดต่อลูกค้า</p>
                                            </div>
                                        </div>
                                        <button className="px-6 h-12 bg-emerald-500/20 rounded-xl text-emerald-400 font-black text-base font-bold uppercase tracking-widest hover:bg-emerald-500/30 active:scale-95 transition-all">โทรออก</button>
                                    </div>
                                </div>
                            </div>

                            {/* Cargo Payload */}
                            <div className="glass-panel p-8 rounded-[3rem] space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/20 rounded-xl">
                                        <Package size={20} className="text-primary" /> 
                                    </div>
                                    <h4 className="text-foreground font-black text-lg font-bold uppercase tracking-widest">ข้อมูลสินค้า</h4>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-white/5 rounded-2xl border border-border/10 flex flex-col items-center justify-center text-center">
                                        <Scale className="text-muted-foreground mb-2" size={16} />
                                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">น้ำหนัก (KG)</p>
                                        <h5 className="text-2xl font-black text-foreground tracking-tighter">{job.Weight_Kg?.toLocaleString() || '0.0'}</h5>
                                    </div>
                                    <div className="p-5 bg-white/5 rounded-2xl border border-border/10 flex flex-col items-center justify-center text-center">
                                        <Box className="text-muted-foreground mb-2" size={16} />
                                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">ปริมาตร (CBM)</p>
                                        <h5 className="text-2xl font-black text-accent tracking-tighter">{job.Volume_Cbm || '0.0'}</h5>
                                    </div>
                                </div>

                                <div className="p-5 bg-white/5 rounded-2xl border border-border/10">
                                    <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <ClipboardCheck size={14} /> หมายเหตุ / คำสั่งพิเศษ
                                    </p>
                                    <p className="text-muted-foreground font-bold leading-relaxed">{job.Notes || "ไม่มีคำสั่งพิเศษจากศูนย์ควบคุม"}</p>
                                </div>
                            </div>

                            {/* Revenue (Optional Visibility) */}
                            {job.Show_Price_To_Driver && (
                                <div className="relative group p-8 rounded-[3rem] bg-slate-950 border border-primary/20 overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                                        <ShieldCheck size={100} className="text-primary" />
                                    </div>
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <Activity size={16} className="text-primary" />
                                            <h4 className="text-base font-bold font-black uppercase tracking-widest text-base font-bold">ค่าตอบแทนประมาณการ</h4>
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <span className="text-6xl font-black text-foreground tracking-tighter leading-none">฿{(job.Cost_Driver_Total || 0).toLocaleString()}</span>
                                            <span className="bg-primary/20 text-primary px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest mb-1">Fixed Rate</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Global Sticky Action Controls */}
            <div className="fixed bottom-32 left-6 right-6 z-[100]">
                <JobActionButton job={{
                    ...job,
                    original_destinations_json: destinations
                } as any} />
            </div>
        </div>
    )
}
