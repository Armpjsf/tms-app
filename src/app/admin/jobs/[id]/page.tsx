import Link from "next/link"
import { notFound } from "next/navigation"
import { getJobById } from "@/lib/supabase/jobs"
import { getDriverRouteForDate } from "@/lib/supabase/gps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Calendar, Truck, User, Phone, Package, FileText, Navigation, Zap, ShieldCheck, Activity, Target, Cpu, Clock, Layers } from "lucide-react"
import JobMapClient from "@/components/maps/job-map-client"
import { AdminJobActions } from "@/components/admin/admin-job-actions"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"

// Force dynamic rendering (server-side) to ensure fresh data
export const dynamicParams = true
export const revalidate = 0

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const job = await getJobById(id)

  if (!job) {
    notFound()
  }

  // Fetch Route History if driver and date exist
  let routeHistory: [number, number][] = []
  if (job.Driver_ID && job.Plan_Date) {
    const logs = await getDriverRouteForDate(job.Driver_ID, job.Plan_Date)
    routeHistory = logs.map(log => [log.Latitude, log.Longitude])
  }

  return (
    <div className="space-y-12 pb-32 max-w-7xl mx-auto p-4 lg:p-10 bg-[#050110]">
      {/* Tactical Header */}
      <div className="bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div className="space-y-6">
            <Link href="/jobs/history" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-base font-bold group/back italic">
              <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
              HUB_MISSION_HISTORY
            </Link>
            <div className="flex flex-wrap items-center gap-6">
              <div className="p-4 bg-emerald-500/20 rounded-[2.5rem] border-2 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-emerald-400">
                <Package size={32} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">Mission #{job.Job_ID}</h1>
                    <StatusBadge status={job.Job_Status || ''} />
                </div>
                <p className="text-base font-bold font-black text-emerald-500 uppercase tracking-[0.6em] opacity-80 italic">Operational Lifecycle & Execution Telemetry</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 self-end lg:self-center">
            <AdminJobActions jobId={job.Job_ID} currentStatus={job.Job_Status || 'New'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Intelligence Grid (Left) */}
        <div className="lg:col-span-2 space-y-10">
            
          {/* Node & Route Matrix */}
          <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/route">
            <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] flex items-center gap-3 italic">
                <User size={18} className="text-primary" /> Target Entity & Vector Parameters
              </h3>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-base font-bold font-black text-primary uppercase tracking-widest italic animate-pulse">
                SYNC_LIVE
              </div>
            </div>
            <CardContent className="p-12 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4 p-8 bg-white/5 rounded-[2.5rem] border border-white/5 relative overflow-hidden group/entity">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><User size={40} /></div>
                    <label className="text-base font-bold font-black text-slate-600 uppercase tracking-[0.4em] italic block">TARGET_ENTITY</label>
                    <p className="text-2xl font-black text-white tracking-widest uppercase italic border-l-4 border-primary pl-6 py-2">{job.Customer_Name}</p>
                </div>
                <div className="space-y-4 p-8 bg-white/5 rounded-[2.5rem] border border-white/5 relative overflow-hidden group/vector">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Navigation size={40} /></div>
                    <label className="text-base font-bold font-black text-slate-600 uppercase tracking-[0.4em] italic block">TRANSIT_VECTOR</label>
                    <p className="text-2xl font-black text-white tracking-widest uppercase italic border-l-4 border-emerald-500 pl-6 py-2">{job.Route_Name}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-10">
                  <div className="flex-1 p-8 bg-[#050110] rounded-[2.5rem] border border-white/5 shadow-inner">
                      <div className="flex items-center gap-4 mb-6">
                          <Calendar className="h-5 w-5 text-primary" />
                          <span className="text-base font-bold font-black text-slate-600 uppercase tracking-widest italic">Temporal Stamping</span>
                      </div>
                      <p className="text-3xl font-black text-white italic tracking-tighter">
                        {new Date(job.Plan_Date || "").toLocaleDateString("th-TH")}
                      </p>
                      <p className="text-base font-bold font-black text-slate-700 uppercase tracking-widest mt-2">// PLAN_CYCLE_ACTIVE</p>
                  </div>
                  
                  <div className="flex-[1.5] space-y-6 relative">
                     <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary via-slate-800 to-emerald-500" />
                     
                     <div className="flex gap-6 items-start relative z-10">
                        <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(255,30,133,1)] mt-1" />
                        <div className="flex flex-col gap-1">
                            <label className="text-base font-bold font-black text-slate-600 uppercase tracking-widest italic">ORIGIN_NODE</label>
                            <p className="text-xl font-black text-slate-300 uppercase tracking-widest">{job.Origin_Location || "UNEXPECTED_NULL"}</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-6 items-start relative z-10">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)] mt-1" />
                        <div className="flex flex-col gap-1">
                            <label className="text-base font-bold font-black text-slate-600 uppercase tracking-widest italic">TERMINATION_NODE</label>
                            <p className="text-xl font-black text-white uppercase tracking-widest italic">{job.Dest_Location || "UNEXPECTED_NULL"}</p>
                        </div>
                     </div>
                  </div>
              </div>
            </CardContent>
          </PremiumCard>

           {/* Route History Telemetry */}
           {routeHistory.length > 0 && (
            <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/map">
                <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] flex items-center gap-3 italic">
                        <Navigation className="h-5 w-5 text-emerald-500 animate-pulse" /> Asset Tracking Telemetry (GPS History)
                    </h3>
                    <div className="px-4 py-1.5 bg-emerald-500/10 rounded-xl text-base font-bold font-black text-emerald-500 uppercase italic">SIGNAL_STRENGTH: 100%</div>
                </div>
                <div className="h-[500px] relative">
                    <JobMapClient routeHistory={routeHistory} />
                </div>
            </PremiumCard>
          )}

          {/* Proof of Delivery (POD) Hub */}
          <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/pod">
            <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] flex items-center gap-3 italic">
                <FileText className="h-5 w-5 text-primary" /> Termination Proof (E-POD)
              </h3>
              <div className="px-4 py-1.5 bg-primary/10 rounded-xl text-base font-bold font-black text-primary uppercase italic">VERIFIED_SIGNATURE</div>
            </div>
            <CardContent className="p-12">
              {job.Job_Status === "Delivered" || job.Job_Status === "Completed" ? (
                <div className="space-y-12">
                    {(() => {
                        const proofUrls = job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',') : []
                        const reportUrl = proofUrls.length > 0 ? proofUrls[0] : null
                        const itemPhotos = proofUrls.length > 1 ? proofUrls.slice(1) : []

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Digital Report Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3 italic">
                                            <FileText className="h-4 w-4 text-emerald-500" /> Digital Transmission (Report)
                                        </h3>
                                    </div>
                                    {reportUrl ? (
                                        <div className="relative w-full aspect-[1.4/1] bg-slate-950 rounded-[2.5rem] overflow-hidden border-2 border-white/5 group/report shadow-2xl">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={reportUrl} 
                                                alt="Digital POD Report" 
                                                className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                <a href={reportUrl} target="_blank" rel="noreferrer">
                                                    <PremiumButton className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-lg font-bold">
                                                        OPEN_SOURCE_INTEL
                                                    </PremiumButton>
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-20 text-center text-slate-700 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-black/20 italic font-black uppercase tracking-widest text-base font-bold">
                                            REPORT_TRANSMISSION_MISSING
                                        </div>
                                    )}
                                </div>

                                {/* Personnel Authentication (Signature) */}
                                <div className="space-y-6">
                                     <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3 italic">
                                        <FileText className="h-4 w-4" /> Personnel Signature (Auth)
                                    </h3>
                                    {job.Signature_Url ? (
                                         <div className="relative h-full w-full bg-white rounded-[2.5rem] overflow-hidden border-4 border-primary/20 shadow-2xl flex items-center justify-center p-12">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={job.Signature_Url} 
                                                alt="Customer Signature" 
                                                className="w-full h-full object-contain filter contrast-125"
                                            />
                                            <div className="absolute bottom-6 right-6 px-4 py-2 bg-[#0a0518] rounded-xl border border-primary/20 text-base font-bold font-black text-primary uppercase tracking-widest italic">AUTHENTICATED_BIO</div>
                                        </div>
                                    ) : (
                                        <div className="h-[200px] w-full rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-slate-700 bg-black/20 italic font-black uppercase tracking-widest text-base font-bold">
                                            <Layers className="text-slate-800" size={32} />
                                            SIGNATURE_NULL_STATE
                                        </div>
                                    )}
                                </div>

                                {/* Additional Intelligence (Photos) */}
                                {itemPhotos.length > 0 && (
                                    <div className="md:col-span-2 space-y-6 pt-10 border-t border-white/5">
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3 italic">
                                            <Package className="h-4 w-4 text-primary" /> Supplemental Asset Intel ({itemPhotos.length})
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            {itemPhotos.map((url, i) => (
                                                <div key={i} className="relative aspect-square bg-[#050110] rounded-3xl overflow-hidden border-2 border-white/5 group cursor-pointer shadow-xl">
                                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img 
                                                        src={url} 
                                                        alt={`Product ${i+1}`} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                     <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                        <a href={url} target="_blank" rel="noreferrer" className="transform group-hover:rotate-12 transition-transform">
                                                            <div className="p-4 bg-white rounded-full text-primary shadow-2xl">
                                                                <Navigation className="h-5 w-5" />
                                                            </div>
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })()}
                </div>
              ) : (
                <div className="p-40 flex flex-col items-center justify-center gap-8 border-2 border-dashed border-white/5 rounded-[4rem] bg-black/20 relative overflow-hidden group/empty">
                    <div className="absolute inset-0 bg-primary/[0.02] animate-pulse" />
                    <Activity size={80} strokeWidth={1} className="text-slate-800 group-hover:text-primary transition-colors duration-700" />
                    <div className="text-center space-y-2 relative z-10">
                        <p className="text-xl font-black text-slate-700 uppercase tracking-[0.4em] italic group-hover:text-white transition-colors">Awaiting Payload Delivery</p>
                        <p className="text-base font-bold font-black text-slate-800 uppercase tracking-[0.6em] italic italic">POD_STREAM_NOT_INITIALIZED</p>
                    </div>
                </div>
              )}
            </CardContent>
          </PremiumCard>
        </div>

        {/* Strategic Sidebar (Right) */}
        <div className="space-y-10">
            {/* Operator Designation */}
            <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[3rem] overflow-hidden group/operator">
                <div className="p-8 border-b border-white/5 bg-black/40">
                    <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 italic">
                        <Truck className="h-4 w-4 text-emerald-500" /> Operator Personnel
                    </h3>
                </div>
                <CardContent className="p-8 space-y-8">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xl italic shadow-2xl border-2 border-white/10 relative overflow-hidden group/avatar">
                            <div className="absolute inset-0 bg-black/10 group-hover/avatar:bg-transparent transition-colors" />
                            {job.Driver_Name?.charAt(0) || "?"}
                        </div>
                        <div>
                            <p className="text-xl font-black text-white uppercase tracking-widest italic">{job.Driver_Name || "OPERATOR_NULL"}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-base font-bold font-black text-slate-600 uppercase tracking-widest">ID:</span>
                                <span className="text-base font-bold font-black text-primary uppercase tracking-widest">{job.Driver_ID || "---"}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-white/5 space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                            <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest italic">Asset Plate</span>
                            <span className="text-xl font-black text-white uppercase font-sans tracking-widest border-b border-emerald-500/50">{job.Vehicle_Plate || "FIELD_UNIT"}</span>
                        </div>
                        <div className="flex justify-between items-center p-4">
                            <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest italic">Secure Link</span>
                            <span className="text-lg font-bold font-black text-slate-400 font-sans tracking-widest italic">@{job.Driver_ID?.toLowerCase() || "node_unbound"}</span>
                        </div>
                    </div>

                    <PremiumButton className="w-full h-16 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 gap-3 group/call italic">
                        <Phone size={20} className="group-hover:rotate-12 transition-transform" /> CONNECT_UPLINK
                    </PremiumButton>
                </CardContent>
            </PremiumCard>

            {/* Financial Vector */}
            <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[3rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-black/40">
                    <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 italic">
                        <Cpu className="h-4 w-4 text-primary" /> Ledger Metrics
                    </h3>
                </div>
                <CardContent className="p-8 space-y-6">
                     <div className="flex justify-between items-baseline p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                        <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest italic">Entity Yield</span>
                        <div className="text-right">
                            <span className="text-2xl font-black text-emerald-500 italic">฿{job.Price_Cust_Total?.toLocaleString() || "0"}</span>
                            <span className="text-base font-bold font-black text-emerald-800 block uppercase tracking-widest">GROSS_FLOW</span>
                        </div>
                     </div>
                     <div className="flex justify-between items-baseline p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                        <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest italic">Operator Cost</span>
                        <div className="text-right">
                            <span className="text-2xl font-black text-rose-500 italic">฿{job.Cost_Driver_Total?.toLocaleString() || "0"}</span>
                            <span className="text-base font-bold font-black text-rose-800 block uppercase tracking-widest">YIELD_BURN</span>
                        </div>
                     </div>
                </CardContent>
            </PremiumCard>

            {/* Operational Notes */}
            {job.Notes && (
                <PremiumCard className="bg-[#0a0518]/40 border-2 border-primary/20 shadow-3xl rounded-[3rem] overflow-hidden border-white/5">
                    <div className="p-8 border-b border-white/5 bg-black/40">
                        <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 italic">
                            <Target size={16} className="text-primary" /> Tactical Intel
                        </h3>
                    </div>
                    <CardContent className="p-8">
                        <div className="relative">
                            <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary/30 rounded-full" />
                            <p className="text-lg font-bold font-bold text-slate-400 leading-relaxed uppercase tracking-wider italic pl-6">{job.Notes}</p>
                        </div>
                    </CardContent>
                </PremiumCard>
            )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
    let colorClass = "bg-slate-500/10 text-slate-500 border-white/10" // Default
  
    switch (status) {
      case "New": colorClass = "bg-primary/10 text-primary border-primary/30 shadow-[0_0_15px_rgba(255,30,133,0.2)]"; break
      case "Assigned": colorClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"; break
      case "In Progress":
      case "In Transit": colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse"; break
      case "Delivered":
      case "Completed": colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"; break
      case "Cancelled": colorClass = "bg-slate-800/50 text-slate-500 border-white/5"; break
      case "Failed": colorClass = "bg-rose-500/20 text-rose-500 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse"; break
    }
  
    return (
      <Badge variant="outline" className={cn("border px-4 py-1.5 text-base font-bold font-black uppercase tracking-[0.2em] rounded-full italic transition-all shadow-lg", colorClass)}>
        {status.toUpperCase()}
      </Badge>
    )
}
