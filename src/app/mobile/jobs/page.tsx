import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { MapPin, Clock, Search, Truck, ChevronRight, ArrowRight, Calendar } from "lucide-react"
import Link from "next/link"
import { getDriverJobs } from "@/lib/supabase/jobs"
import { MobileJobFilter } from "@/components/mobile/job-filter"
import { cn } from "@/lib/utils"
import { RealtimeJobsTrigger } from "@/components/mobile/realtime-jobs-trigger"
import { MobileRefreshButton } from "@/components/mobile/refresh-button"
import { Suspense } from "react"
import JobsLoading from "./loading"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function JobsContent({ driverId, searchParams }: { driverId: string, searchParams: any }) {
  const date = (searchParams.date as string) || undefined
  const status = (searchParams.status as string) || undefined

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

  // Fetch jobs for this driver with filters
  const jobs = await getDriverJobs(driverId, { startDate: date, endDate: date, status })

  // Scalability: Hide old completed/cancelled jobs from default view
  let displayJobs = jobs
  if (!status || status === 'All') {
      displayJobs = jobs.filter(j => {
          // Keep active jobs regardless of date
          if (j.Job_Status !== 'Completed' && j.Job_Status !== 'Cancelled') return true;
          // Keep completed jobs ONLY if it is explicitly the date filtered, or it's today/future
          if (date) return true; 
          return j.Plan_Date && j.Plan_Date >= today
      })
  }

  return (
    <div className="relative z-10 space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-end px-1">
            <div className="space-y-1">
                <p className="text-accent text-xs font-black uppercase tracking-[0.3em]">LogisPro Fleet</p>
                <h2 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">รายการงาน</h2>
            </div>
            <div className="flex items-center gap-3 pb-1">
                <MobileRefreshButton />
                <div className="inline-flex items-center gap-1.5 h-11 px-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm">
                    <span className="text-primary font-black text-xl leading-none">{displayJobs.length}</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">งาน</span>
                </div>
            </div>
        </div>

        {/* Search Bar - Premium Style */}
        <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Search size={20} />
            </div>
            <input 
                type="text" 
                placeholder="ค้นหาเลขงาน, ชื่อลูกค้า..." 
                className="w-full h-16 pl-14 pr-6 rounded-3xl bg-card/50 backdrop-blur-xl border border-border/10 text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-lg shadow-sm"
            />
        </div>

        {/* Job Grid / List */}
        <div className="space-y-6">
            {displayJobs.length === 0 ? (
                <div className="text-center py-24 glass-panel rounded-[3rem] border-dashed border-border/20 bg-card/20">
                    <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Truck className="text-muted-foreground/40" size={40} />
                    </div>
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">ไม่พบรายการงานในขณะนี้</p>
                </div>
            ) : displayJobs.map((job) => (
            <Link href={`/mobile/jobs/${job.Job_ID}`} key={job.Job_ID} className="block group">
                <div className="glass-panel p-7 rounded-[2.5rem] active:scale-[0.98] transition-all hover:border-primary/40 relative overflow-hidden shadow-lg shadow-black/5 bg-gradient-to-br from-card to-transparent">
                    {/* Background Icon Watermark */}
                    <div className="absolute top-0 right-0 p-8 text-primary/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Truck size={80} strokeWidth={1} />
                    </div>
                    
                    {/* Top Row: Job ID & Status */}
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-xl border border-border/10">
                                    <span className="text-primary font-black text-sm italic">#{job.Job_ID.slice(-8)}</span>
                                </div>
                                
                                {/* Pickup Badge */}
                                {(job.Pickup_Date === today || (!job.Pickup_Date && job.Plan_Date === today)) && (
                                    <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                                        รับวันนี้
                                    </div>
                                )}
                                {(job.Pickup_Date === tomorrowStr || (!job.Pickup_Date && job.Plan_Date === tomorrowStr)) && (
                                    <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-500 font-black text-[10px] uppercase tracking-widest">
                                        รับพรุ่งนี้
                                    </div>
                                )}

                                {/* Delivery Badge (if different from pickup) */}
                                {job.Delivery_Date === today && job.Pickup_Date !== today && (
                                    <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-500 font-black text-[10px] uppercase tracking-widest">
                                        ส่งวันนี้
                                    </div>
                                )}
                                {job.Delivery_Date === tomorrowStr && job.Pickup_Date !== tomorrowStr && (
                                    <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-500 font-black text-[10px] uppercase tracking-widest">
                                        ส่งพรุ่งนี้
                                    </div>
                                )}
                            </div>
                            <h3 className="text-foreground font-black text-xl tracking-tight line-clamp-1 leading-none uppercase italic">
                                {job.Customer_Name}
                            </h3>
                        </div>
                        <div className={cn(
                            "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                            job.Job_Status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                            ['In Progress', 'In Transit', 'Arrived'].includes(job.Job_Status) ? 'bg-primary/10 text-primary border-primary/20 animate-pulse' :
                            'bg-muted/50 text-muted-foreground border-border/10'
                        )}>
                            {job.Job_Status === 'Completed' ? 'ส่งสำเร็จ' : 
                             ['In Progress', 'In Transit', 'Arrived'].includes(job.Job_Status) ? 'กำลังไปส่ง' : 
                             'รอเริ่มงาน'}
                        </div>
                    </div>

                    {/* Route Details */}
                    {(() => {
                        const routeStr = job.Route_Name || job.Dest_Location || "";
                        const points = routeStr.split(/[→\->]/).map(p => p.trim()).filter(Boolean);
                        
                        let displayOrigin = job.Origin_Location || "ไม่ระบุต้นทาง";
                        let displayDest = job.Dest_Location || "ไม่ระบุปลายทาง";

                        if (points.length >= 2) {
                            displayOrigin = points[0];
                            displayDest = points[points.length - 1];
                        }

                        return (
                            <div className="grid grid-cols-1 gap-5 mb-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-muted/50 flex flex-col items-center justify-center text-muted-foreground shrink-0 border border-border/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mb-1" />
                                        <div className="w-0.5 h-3 bg-muted-foreground/20" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">เส้นทางขนส่ง</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-foreground font-bold text-sm truncate">{displayOrigin}</span>
                                            <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                                            <span className="text-foreground font-black text-sm truncate italic">{displayDest}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Footer: Date & Action */}
                    <div className="flex items-center justify-between pt-6 border-t border-border/5 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <Calendar size={14} className="text-primary" />
                                <span className="text-foreground font-black text-xs uppercase italic">
                                    {job.Pickup_Date && job.Delivery_Date && job.Pickup_Date !== job.Delivery_Date ? (
                                        `${new Date(job.Pickup_Date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })} → ${new Date(job.Delivery_Date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}`
                                    ) : (
                                        (job.Pickup_Date || job.Plan_Date) ? new Date(job.Pickup_Date || job.Plan_Date || "").toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : "-"
                                    )}
                                </span>
                            </div>
                            <div className="w-px h-3 bg-border/20" />
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} className="text-accent" />
                                <span className="text-foreground font-black text-xs uppercase italic">
                                    {job.Plan_Time || "08:00"}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-primary group-hover:gap-3 transition-all font-black text-xs uppercase tracking-widest">
                            จัดการงาน <ChevronRight size={16} />
                        </div>
                    </div>
                </div>
            </Link>
            ))}
        </div>
    </div>
  )
}

export default async function DriverJobsPage(props: Props) {
  const searchParams = await props.searchParams
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  return (
    <div className="min-h-screen bg-background pb-32 pt-24 px-6 relative overflow-hidden">
       {/* High-end Background Decor */}
      <div className="absolute top-0 right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <MobileHeader title="Management" rightElement={<MobileJobFilter />} />
      
      <Suspense fallback={<JobsLoading />}>
          <JobsContent driverId={session.driverId} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}


