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

    const handleOptimizeRoute = async () => {
        setOptimizing(true)
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const origin = {
                name: "Current Location",
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };

            const dests = job.original_destinations_json || [];
            if (!Array.isArray(dests) || dests.length < 2) {
                toast.info("งานนี้มีจุดหมายเดียว ไม่จำเป็นต้องจัดลำดับใหม่ครับ");
                return;
            }

            const validDests = dests.map((d: { name: string, lat: string, lng: string }) => ({
                name: d.name,
                lat: parseFloat(d.lat),
                lng: parseFloat(d.lng)
            })).filter((d: { lat: number, lng: number }) => !isNaN(d.lat) && !isNaN(d.lng));

            if (validDests.length < dests.length) {
                toast.warning("บางจุดหมายไม่มีพิกัด (Lat/Lon) กรุณาแจ้งผู้ควบคุมงานก่อนครับ");
                return;
            }

            const result = await optimizeRoute(origin, validDests);

            if (result.success) {
                const reordered = result.optimizedOrder.map(idx => dests[idx]);
                const updateRes = await updateJob(job.Job_ID, {
                    original_destinations_json: JSON.stringify(reordered),
                    Notes: (job.Notes || "") + `\n[AI Optimized: ${new Date().toLocaleTimeString()}]`
                });

                if (updateRes.success) {
                    toast.success(`AI จัดลำดับใหม่ ประหยัดเวลาได้ ${result.estimatedDurationMinutes} นาที`);
                    router.refresh();
                } else {
                    toast.error("ไม่สามารถบันทึกลำดับใหม่ได้");
                }
            }
        } catch {
            toast.error("กรุณาเปิด GPS เพื่อใช้งานการวิเคราะห์เส้นทาง");
        } finally {
            setOptimizing(false)
        }
    }

    const destinations = typeof job?.original_destinations_json === 'string' 
        ? JSON.parse(job.original_destinations_json) 
        : job?.original_destinations_json || [];

    return (
        <div className="min-h-screen bg-background pb-32 pt-24 relative overflow-hidden flex flex-col">
            {/* High-end Background Decor */}
            <div className="absolute top-0 right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

            <MobileHeader title="รายละเอียดงาน" showBack />

            {/* COMPACT STICKY TAB SELECTOR */}
            <div className="px-5 mb-6 mt-1 sticky top-24 z-[50]">
                <div className="bg-card/60 backdrop-blur-3xl p-1.5 rounded-2xl border border-border/10 flex shadow-md">
                    <button 
                        onClick={() => setActiveTab('mission')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-black uppercase tracking-widest transition-all text-xs italic",
                            activeTab === 'mission' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity size={18} /> ดำเนินงาน
                    </button>
                    <button 
                        onClick={() => setActiveTab('info')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-black uppercase tracking-widest transition-all text-xs italic",
                            activeTab === 'info' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Info size={18} /> ข้อมูลงาน
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
                             {/* Success Notification Inline - Ultra Compact */}
                             {success && (
                                 <motion.div 
                                     initial={{ scale: 0.9, opacity: 0 }}
                                     animate={{ scale: 1, opacity: 1 }}
                                     className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3 text-emerald-500 mb-2"
                                 >
                                     <CheckCircle size={18} />
                                     <p className="font-black uppercase tracking-widest text-[10px] italic">ทำรายการสำเร็จ!</p>
                                 </motion.div>
                             )}

                            {/* Job ID Header - More Compact */}
                            <div className="flex items-end justify-between px-1">
                                <div className="space-y-0.5">
                                    <p className="text-accent text-[9px] font-black uppercase tracking-[0.3em] leading-none">Job No.</p>
                                    <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none">
                                        #{String(job?.Job_ID || '').slice(-8).toUpperCase()}
                                    </h2>
                                </div>
                                <div className="text-right pb-1">
                                    <p className="text-muted-foreground text-[8px] font-black uppercase tracking-widest mb-0.5">Plan Date</p>
                                    <span className="font-black text-xs text-primary italic">
                                        {job?.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : "-"}
                                    </span>
                                </div>
                            </div>

                            <JobWorkflow currentStatus={job?.Job_Status || 'New'} />

                            <div className="glass-panel p-8 rounded-[3rem] border-primary/10 shadow-2xl space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-primary/5 pointer-events-none transform translate-x-4 -translate-y-4">
                                    <Target size={120} />
                                </div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Navigation size={24} strokeWidth={2.5} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-[9px] font-black uppercase tracking-widest mb-0.5">สถานะปัจจุบัน</p>
                                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight italic leading-none">
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

                                {(job?.Job_Status === 'Accepted' || job?.Job_Status === 'In Transit' || job?.Job_Status === 'Arrived Pickup') && (
                                    <Button
                                        variant="outline"
                                        onClick={handleOptimizeRoute}
                                        disabled={optimizing}
                                        className="w-full h-11 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-600 font-black gap-2 text-[10px] uppercase tracking-widest border-dashed"
                                    >
                                        {optimizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles className="text-emerald-500" size={12} />}
                                        AI ช่วยจัดลำดับเส้นทาง
                                    </Button>
                                )}
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
                            {/* Customer Card - Compact */}
                            <div className="glass-panel p-6 rounded-[2rem] space-y-6 border-primary/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-card border border-border/10 flex items-center justify-center shadow-lg">
                                            <User className="text-primary" size={24} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-[9px] font-black uppercase tracking-widest mb-0.5">ผู้รับสินค้า</p>
                                            <h3 className="text-xl font-black text-foreground tracking-tight italic uppercase">{job?.Customer_Name}</h3>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 bg-muted rounded-lg text-[8px] font-black text-foreground uppercase tracking-widest">
                                        ID: {job?.Customer_ID}
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border/5">
                                        <MapPin size={18} className="text-accent shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">พิกัดส่งของ</p>
                                            <p className="text-foreground font-bold text-xs leading-snug italic break-words line-clamp-3">{job?.Dest_Location || job?.Route_Name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Phone size={18} className="text-emerald-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">เบอร์โทร</p>
                                                <p className="text-emerald-600 font-black text-base italic tracking-widest truncate">ติดต่อลูกค้า</p>
                                            </div>
                                        </div>
                                        <button className="px-4 h-10 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md">
                                            โทรออก
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-[2rem] space-y-4 border-accent/10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-card border border-border/10 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">น้ำหนัก</p>
                                        <div className="flex items-baseline gap-1">
                                            <h5 className="text-xl font-black text-foreground italic leading-none">{job?.Weight_Kg?.toLocaleString() || '0.0'}</h5>
                                            <span className="text-[8px] font-black text-muted-foreground">KG</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-card border border-border/10 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">ปริมาตร</p>
                                        <div className="flex items-baseline gap-1">
                                            <h5 className="text-xl font-black text-foreground italic leading-none">{job?.Volume_Cbm || '0.0'}</h5>
                                            <span className="text-[8px] font-black text-muted-foreground">CBM</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-card border border-border/10 rounded-2xl">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">บันทึกเพิ่มเติม</p>
                                    <p className="text-foreground font-bold leading-relaxed text-[11px] italic break-words">{job?.Notes || "ไม่มีข้อมูล"}</p>
                                </div>
                            </div>

                            {/* Payout Highlight - Compact Slim */}
                            {job?.Show_Price_To_Driver && (
                                <div className="p-6 rounded-[2rem] bg-slate-900 border border-primary/20 flex items-center justify-between shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                            <TrendingUp size={16} className="text-primary" />
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70 italic">ค่าตอบแทน</h4>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-white tracking-tighter italic">฿{(job?.Cost_Driver_Total || 0).toLocaleString()}</span>
                                        <div className="px-2 py-0.5 bg-primary rounded-md text-white font-black text-[7px] uppercase tracking-widest">PRO</div>
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
                } as Parameters<typeof JobActionButton>[0]['job']} />
            </div>
        </div>
    )
}
