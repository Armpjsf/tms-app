import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { MapPin, Clock, Search, Truck, ChevronRight } from "lucide-react"
import Link from "next/link"
import { getDriverJobs } from "@/lib/supabase/jobs"
import { MobileJobFilter } from "@/components/mobile/job-filter"
import { cn } from "@/lib/utils"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DriverJobsPage(props: Props) {
  const searchParams = await props.searchParams
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const date = (searchParams.date as string) || undefined
  const status = (searchParams.status as string) || undefined

  // Fetch jobs for this driver with filters
  const jobs = await getDriverJobs(session.driverId, { startDate: date, endDate: date, status })

  return (
    <div className="min-h-screen bg-background pb-32 pt-24 px-6 relative overflow-hidden">
       {/* Background Decor */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      
      <MobileHeader title="รายการงาน" rightElement={<MobileJobFilter />} />
      
      <div className="relative z-10 space-y-6">
        {/* Active Title Section */}
        <div className="flex justify-between items-end px-1">
            <div className="space-y-1">
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase font-display">งานของคุณ</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">รายการแผนการเดินรถทั้งหมด</p>
            </div>
            <div className="text-right">
                <div className="text-2xl font-black text-primary leading-none">{jobs.length}</div>
                <div className="text-[8px] font-black text-primary uppercase tracking-widest">ทั้งหมด</div>
            </div>
        </div>

        {/* Search Bar - Aesthetic Placeholder */}
        <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
                type="text" 
                placeholder="ค้นหาหมายเลขงาน..." 
                className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-700 outline-none focus:ring-1 focus:ring-primary/40 transition-all font-bold text-sm"
            />
        </div>

        {/* Job Grid / List */}
        <div className="space-y-6">
            {jobs.length === 0 ? (
                <div className="text-center py-24 glass-panel rounded-[3rem] border-dashed border-white/10">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="text-slate-700" size={32} />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">ไม่พบคัดหลอกงานที่ต้องการ</p>
                </div>
            ) : jobs.map((job) => (
            <Link href={`/mobile/jobs/${job.Job_ID}`} key={job.Job_ID}>
                <div className="glass-panel p-6 rounded-[2.5rem] active:scale-[0.98] transition-all hover:border-primary/30 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 text-primary/5 pointer-events-none group-hover:scale-125 transition-transform duration-700">
                        <Truck size={60} />
                    </div>
                    
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-primary/20 transition-colors">
                                <span className="text-primary font-black text-xs">#{job.Job_ID.slice(-4)}</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-white font-black text-lg tracking-tighter line-clamp-1">{job.Customer_Name}</h3>
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                    job.Job_Status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                    job.Job_Status === 'In Progress' ? 'bg-primary/10 text-primary border-primary/20' :
                                    'bg-white/5 text-slate-500 border-white/5'
                                )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full", 
                                        job.Job_Status === 'Completed' ? 'bg-emerald-500' : 
                                        job.Job_Status === 'In Progress' ? 'bg-primary animate-pulse' : 
                                        'bg-slate-500'
                                    )} />
                                    {job.Job_Status}
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="text-slate-700 group-hover:text-primary transition-colors" size={20} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <MapPin size={10} className="text-accent" /> จุดส่งสินค้า
                            </p>
                            <p className="text-[11px] text-white font-bold truncate">{job.Route_Name || job.Dest_Location}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-end gap-1.5">
                                กำหนดการ <Clock size={10} className="text-primary" />
                            </p>
                            <p className="text-[11px] text-white font-bold">
                                {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : "-"}
                            </p>
                        </div>
                    </div>
                </div>
            </Link>
            ))}
        </div>
      </div>
    </div>
  )
}
