import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { getJobById } from "@/lib/supabase/jobs"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, User, Package, CheckCircle, ArrowRight, Calendar, Bookmark, Info } from "lucide-react"
import { JobActionButton } from "@/components/mobile/job-action-button"
import { JobWorkflow } from "@/components/mobile/job-workflow"
import { NavigationButton } from "@/components/mobile/navigation-button"
import { RouteStrip } from "@/components/mobile/route-strip"
import { Badge } from "@/components/ui/badge"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}

export default async function JobDetailPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const success = searchParams.success;
  
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const job = await getJobById(params.id)

  if (!job) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground gap-4 p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <Info size={40} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">ไม่พบข้อมูลงาน</p>
            <button className="text-primary font-black uppercase tracking-widest text-lg font-bold">กลับหน้าหลัก</button>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-24 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

      <MobileHeader title={`JOB #${job.Job_ID.slice(-6)}`} showBack />
      
      {/* Success Notification */}
      {success && (
        <div className="px-6 py-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[2rem] p-6 flex items-center gap-4 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="animate-in zoom-in duration-300" />
                </div>
                <div className="text-xl">
                    <p className="font-black uppercase tracking-widest text-lg font-bold">
                        {success === 'pickup' ? 'Product Secured!' : 'Mission Completed!'}
                    </p>
                    <p className="opacity-80 font-bold">Data synchronized with fleet command.</p>
                </div>
            </div>
        </div>
      )}

      <div className="px-6 py-4">
        <JobWorkflow currentStatus={job.Job_Status || 'New'} />
      </div>

      {/* Hero Route Strip */}
      <div className="px-6 py-4">
        <RouteStrip 
          origin={job.Origin_Location}
          destination={job.Dest_Location || job.Route_Name}
          destinations={job.original_destinations_json}
          status={job.Job_Status}
        />
      </div>

      <div className="px-6 space-y-6">
        {/* Status & Navigation Deck */}
        <div className="glass-panel p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center border border-border/5">
                    <Truck className="text-primary" size={32} />
                </div>
                <div>
                    <p className="text-muted-foreground text-base font-bold font-black uppercase tracking-widest mb-1">Current Status</p>
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                         <span className="text-2xl font-black text-foreground tracking-tighter uppercase">{job.Job_Status}</span>
                    </div>
                </div>
            </div>
            {job.Job_Status !== 'Completed' && (
                <div className="relative z-10">
                    <NavigationButton job={job} />
                </div>
            )}
        </div>

        {/* Tactical Info Cards */}
        <div className="grid grid-cols-1 gap-6">
            {/* Customer Brief */}
            <div className="glass-panel p-8 rounded-[3rem] space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-border/10 flex items-center justify-center shadow-lg">
                            <User className="text-primary" size={24} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-base font-bold font-black uppercase tracking-widest mb-0.5">Primary Target</p>
                            <h3 className="text-2xl font-black text-foreground tracking-tighter leading-none">{job.Customer_Name}</h3>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-border/10 text-muted-foreground px-3 py-1 rounded-xl font-bold uppercase text-base font-bold">ID: {job.Customer_ID}</Badge>
                </div>
                
                <div className="space-y-6">
                     <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-border/5">
                        <div className="p-2.5 bg-accent/20 rounded-xl text-accent">
                            <MapPin size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-muted-foreground text-base font-bold font-black uppercase tracking-widest mb-1">Destination</p>
                            <p className="text-white text-[13px] font-black leading-relaxed">{job.Dest_Location || job.Route_Name}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-border/5">
                        <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                            <Phone size={20} />
                        </div>
                        <div className="flex-1 flex justify-between items-center">
                            <div>
                                <p className="text-muted-foreground text-base font-bold font-black uppercase tracking-widest mb-1">Contact Protocol</p>
                                <p className="text-emerald-400 text-[13px] font-black uppercase tracking-widest">Secured Line Active</p>
                            </div>
                            <button className="px-4 py-2 bg-emerald-500/20 rounded-xl text-emerald-400 font-black text-base font-bold uppercase tracking-widest hover:bg-emerald-500/30 transition-all">CALL</button>
                        </div>
                     </div>
                </div>
            </div>

            {/* Cargo Payload */}
            <div className="glass-panel p-8 rounded-[3rem] space-y-6">
                <div className="flex items-center gap-3">
                     <div className="p-2 bg-primary/20 rounded-xl">
                        <Package size={20} className="text-primary" /> 
                     </div>
                     <h4 className="text-foreground font-black text-lg font-bold uppercase tracking-[0.2em]">Payload Configuration</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div className="p-5 bg-white/5 rounded-2xl border border-border/10 flex flex-col items-center justify-center text-center">
                         <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mb-2">Mass (KG)</p>
                         <h5 className="text-2xl font-black text-foreground tracking-tighter">{job.Weight_Kg?.toLocaleString() || '0.0'}</h5>
                     </div>
                     <div className="p-5 bg-white/5 rounded-2xl border border-border/10 flex flex-col items-center justify-center text-center">
                         <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mb-2">Volume (CBM)</p>
                         <h5 className="text-2xl font-black text-accent tracking-tighter">{job.Volume_Cbm || '0.0'}</h5>
                     </div>
                </div>

                <div className="p-5 bg-white/5 rounded-2xl border border-border/10">
                     <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mb-3">Tactical Briefing / Notes</p>
                     <p className="text-muted-foreground text-lg font-bold font-bold leading-relaxed">{job.Notes || "No specific instructions from command center."}</p>
                </div>
            </div>

            {/* Compensation Summary */}
            {job.Show_Price_To_Driver && (
                <div className="relative group p-8 rounded-[3rem] bg-slate-950 border border-primary/20 overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <CheckCircle size={100} className="text-primary" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <h4 className="text-foreground font-black text-base font-bold uppercase tracking-[0.3em]">Estimated Revenue</h4>
                        </div>
                        <div className="flex items-end gap-2">
                             <span className="text-5xl font-black text-foreground tracking-tighter leading-none">฿{(job.Cost_Driver_Total || 0).toLocaleString()}</span>
                             <span className="text-primary font-black text-base font-bold uppercase tracking-widest mb-1.5">FIXED RATE</span>
                        </div>
                        <div className="pt-2">
                             <button className="w-full h-12 rounded-xl bg-white/5 border border-border/10 text-muted-foreground text-foreground hover:bg-white/10 transition-all">
                                 View Detailed Ledger
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Mission Deployment Controls */}
        <div className="fixed bottom-32 left-6 right-6 z-[100]">
            <JobActionButton job={job} />
        </div>
      </div>
    </div>
  )
}
