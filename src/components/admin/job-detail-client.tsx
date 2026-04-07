"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Truck, User, Phone, Package, FileText, Navigation, Activity, Target, Cpu, Layers } from "lucide-react"
import JobMapClient from "@/components/maps/job-map-client"
import { AdminJobActions } from "@/components/admin/admin-job-actions"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"
import { PODDownloadButton } from "@/components/tracking/pod-download"


interface JobDetailClientProps {
  job: any
  routeHistory: [number, number][]
}

export function JobDetailClient({ job, routeHistory }: JobDetailClientProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-12 pb-32 max-w-7xl mx-auto p-4 lg:p-10 bg-background">
      {/* Tactical Header */}
      <div className="bg-background/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-border/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div className="space-y-6">
            <Link href="/jobs/history" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-base font-bold group/back italic">
              <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
              {t('job_detail.history_link')}
            </Link>
            <div className="flex flex-wrap items-center gap-6">
              <div className="p-4 bg-emerald-500/20 rounded-[2.5rem] border-2 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-emerald-400">
                <Package size={32} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-widest uppercase leading-none italic premium-text-gradient">Mission #{job.Job_ID}</h1>
                    <StatusBadge status={job.Job_Status || ''} />
                </div>
                <p className="text-sm md:text-base font-bold font-black text-emerald-500 uppercase tracking-[0.4em] md:tracking-[0.6em] opacity-80 italic">{t('job_detail.operational_lifecycle')}</p>
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
          <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/route">
            <div className="p-10 border-b border-border/5 bg-black/40 flex items-center justify-between">
              <h3 className="text-xl font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-3 italic">
                <User size={18} className="text-primary" /> {t('job_detail.target_entity_vector')}
              </h3>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-base font-bold font-black text-primary uppercase tracking-widest italic animate-pulse">
                {t('job_detail.sync_live')}
              </div>
            </div>
            <CardContent className="p-12 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4 p-8 bg-white/5 rounded-[2.5rem] border border-border/5 relative overflow-hidden group/entity">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><User size={40} /></div>
                    <label className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] italic block">{t('job_detail.target_entity')}</label>
                    <p className="text-2xl font-black text-foreground tracking-widest uppercase italic border-l-4 border-primary pl-6 py-2">{job.Customer_Name}</p>
                </div>
                <div className="space-y-4 p-8 bg-white/5 rounded-[2.5rem] border border-border/5 relative overflow-hidden group/vector">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Navigation size={40} /></div>
                    <label className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] italic block">{t('job_detail.transit_vector')}</label>
                    <p className="text-2xl font-black text-foreground tracking-widest uppercase italic border-l-4 border-emerald-500 pl-6 py-2">{job.Route_Name}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-10">
                  <div className="flex-1 p-8 bg-background rounded-[2.5rem] border border-border/5 shadow-inner">
                      <div className="flex items-center gap-4 mb-6">
                          <Calendar className="h-5 w-5 text-primary" />
                          <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('job_detail.temporal_stamping')}</span>
                      </div>
                      <p className="text-3xl font-black text-foreground italic tracking-tighter">
                        {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString("th-TH") : t('job_detail.not_specified')}
                      </p>
                      <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mt-2">{t('job_detail.plan_cycle_active')}</p>
                  </div>
                  
                  <div className="flex-[1.5] space-y-6 relative">
                     <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary via-slate-800 to-emerald-500" />
                     
                     <div className="flex gap-6 items-start relative z-10">
                        <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(255,30,133,1)] mt-1" />
                        <div className="flex flex-col gap-1">
                            <label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('job_detail.origin_node')}</label>
                            <p className="text-xl font-black text-muted-foreground uppercase tracking-widest font-sans">{job.Origin_Location || t('job_detail.unexpected_null')}</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-6 items-start relative z-10">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)] mt-1" />
                        <div className="flex flex-col gap-1">
                            <label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('job_detail.termination_node')}</label>
                            <p className="text-xl font-black text-foreground uppercase tracking-widest italic font-sans">{job.Dest_Location || t('job_detail.unexpected_null')}</p>
                        </div>
                     </div>
                  </div>
              </div>
            </CardContent>
          </PremiumCard>

           {/* Route History Telemetry */}
           {routeHistory.length > 0 && (
            <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/map">
                <div className="p-10 border-b border-border/5 bg-black/40 flex items-center justify-between">
                    <h3 className="text-xl font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-3 italic">
                        <Navigation className="h-5 w-5 text-emerald-500 animate-pulse" /> {t('job_detail.asset_tracking')}
                    </h3>
                    <div className="px-4 py-1.5 bg-emerald-500/10 rounded-xl text-base font-bold font-black text-emerald-500 uppercase italic">{t('job_detail.signal_strength')}</div>
                </div>
                <div className="h-[500px] relative">
                    <JobMapClient routeHistory={routeHistory} />
                </div>
            </PremiumCard>
          )}

          {/* Proof of Delivery (POD) Hub */}
          <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/pod">
            <div className="p-10 border-b border-border/5 bg-black/40 flex items-center justify-between">
              <h3 className="text-xl font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-3 italic">
                <FileText className="h-5 w-5 text-primary" /> {t('job_detail.termination_proof')}
              </h3>
              <div className="px-4 py-1.5 bg-primary/10 rounded-xl text-base font-bold font-black text-primary uppercase italic">{t('job_detail.verified_signature')}</div>
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
                                        <h3 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-3 italic">
                                            <FileText className="h-4 w-4 text-emerald-500" /> {t('job_detail.digital_transmission')}
                                        </h3>
                                    </div>
                                    {reportUrl ? (
                                        <div className="relative w-full aspect-[1.4/1] bg-slate-950 rounded-[2.5rem] overflow-hidden border-2 border-border/5 group/report shadow-2xl">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={reportUrl} 
                                                alt="Digital POD Report" 
                                                className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                <a href={reportUrl} target="_blank" rel="noreferrer">
                                                    <PremiumButton className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-lg font-bold">
                                                        {t('job_detail.open_source_intel')}
                                                    </PremiumButton>
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-10 text-center text-muted-foreground border-2 border-dashed border-border/5 rounded-[2.5rem] bg-black/20 italic font-black uppercase tracking-widest text-sm font-bold">
                                                {t('job_detail.report_missing')}
                                            </div>
                                            <PODDownloadButton job={{
                                                jobId: job.Job_ID,
                                                customerName: job.Customer_Name,
                                                origin: job.Origin_Location || job.Location_Origin_Name,
                                                destination: job.Dest_Location || job.Location_Destination_Name,
                                                status: job.Job_Status,
                                                planDate: job.Plan_Date,
                                                deliveryDate: job.Actual_Delivery_Time ? `${job.Delivery_Date} ${job.Actual_Delivery_Time}` : job.Delivery_Date,
                                                driverName: job.Driver_Name,
                                                vehiclePlate: job.Vehicle_Plate,
                                                podPhotos: job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',') : [],
                                                signature: job.Signature_Url,
                                                pickupSignature: job.Pickup_Signature_Url,
                                                notes: job.Notes
                                            }} />
                                        </div>
                                    )}

                                </div>

                                {/* Personnel Authentication (Signature) */}
                                <div className="space-y-6">
                                     <h3 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-3 italic">
                                        <FileText className="h-4 w-4" /> {t('job_detail.personnel_signature')}
                                    </h3>
                                    {job.Signature_Url ? (
                                         <div className="relative h-full w-full bg-white rounded-[2.5rem] overflow-hidden border-4 border-primary/20 shadow-2xl flex items-center justify-center p-12">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={job.Signature_Url} 
                                                alt="Customer Signature" 
                                                className="w-full h-full object-contain filter contrast-125"
                                            />
                                            <div className="absolute bottom-6 right-6 px-4 py-2 bg-background rounded-xl border border-primary/20 text-base font-bold font-black text-primary uppercase tracking-widest italic">{t('job_detail.authenticated_bio')}</div>
                                        </div>
                                    ) : (
                                        <div className="h-[200px] w-full rounded-[2.5rem] border-2 border-dashed border-border/5 flex flex-col items-center justify-center gap-4 text-muted-foreground bg-black/20 italic font-black uppercase tracking-widest text-base font-bold">
                                            <Layers className="text-muted-foreground" size={32} />
                                            {t('job_detail.signature_null')}
                                        </div>
                                    )}
                                </div>

                                {/* Additional Intelligence (Photos) */}
                                {itemPhotos.length > 0 && (
                                    <div className="md:col-span-2 space-y-6 pt-10 border-t border-border/5">
                                        <h3 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-3 italic">
                                            <Package className="h-4 w-4 text-primary" /> {t('job_detail.supplemental_intel')} ({itemPhotos.length})
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            {itemPhotos.map((url: string, i: number) => (
                                                <div key={i} className="relative aspect-square bg-background rounded-3xl overflow-hidden border-2 border-border/5 group cursor-pointer shadow-xl">
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
                <div className="p-40 flex flex-col items-center justify-center gap-8 border-2 border-dashed border-border/5 rounded-[4rem] bg-black/20 relative overflow-hidden group/empty">
                    <div className="absolute inset-0 bg-primary/[0.02] animate-pulse" />
                    <Activity size={80} strokeWidth={1} className="text-muted-foreground group-hover:text-primary transition-colors duration-700" />
                    <div className="text-center space-y-2 relative z-10">
                        <p className="text-xl font-black text-muted-foreground uppercase tracking-[0.4em] italic group-hover:text-foreground transition-colors">{t('job_detail.awaiting_delivery')}</p>
                        <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.6em] italic italic">{t('job_detail.pod_not_initialized')}</p>
                    </div>
                </div>
              )}
            </CardContent>
          </PremiumCard>
        </div>

        {/* Strategic Sidebar (Right) */}
        <div className="space-y-10">
            {/* Operator Designation */}
            <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[3rem] overflow-hidden group/operator">
                <div className="p-8 border-b border-border/5 bg-black/40">
                    <h3 className="text-xl font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 italic">
                        <Truck className="h-4 w-4 text-emerald-500" /> {t('job_detail.operator_personnel')}
                    </h3>
                </div>
                <CardContent className="p-8 space-y-8">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xl italic shadow-2xl border-2 border-border/10 relative overflow-hidden group/avatar">
                            <div className="absolute inset-0 bg-black/10 group-hover/avatar:bg-transparent transition-colors" />
                            {job.Driver_Name?.charAt(0) || "?"}
                        </div>
                        <div>
                            <p className="text-xl font-black text-foreground uppercase tracking-widest italic">{job.Driver_Name || t('job_detail.operator_null')}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">ID:</span>
                                <span className="text-base font-bold font-black text-primary uppercase tracking-widest">{job.Driver_ID || "---"}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-border/5 space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-border/5">
                            <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('job_detail.asset_plate')}</span>
                            <span className="text-xl font-black text-foreground uppercase font-sans tracking-widest border-b border-emerald-500/50">{job.Vehicle_Plate || t('job_detail.field_unit')}</span>
                        </div>
                        <div className="flex justify-between items-center p-4">
                            <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('job_detail.secure_link')}</span>
                            <span className="text-lg font-bold font-black text-muted-foreground font-sans tracking-widest italic">@{job.Driver_ID?.toLowerCase() || t('job_detail.node_unbound')}</span>
                        </div>
                    </div>

                    <PremiumButton className="w-full h-16 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 gap-3 group/call italic">
                        <Phone size={20} className="group-hover:rotate-12 transition-transform" /> {t('job_detail.connect_uplink')}
                    </PremiumButton>
                </CardContent>
            </PremiumCard>

            {/* Financial Vector */}
            <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[3rem] overflow-hidden">
                <div className="p-8 border-b border-border/5 bg-black/40">
                    <h3 className="text-xl font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 italic">
                        <Cpu className="h-4 w-4 text-primary" /> {t('job_detail.ledger_metrics')}
                    </h3>
                </div>
                <CardContent className="p-8 space-y-6">
                     <div className="flex justify-between items-baseline p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                        <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('job_detail.entity_yield')}</span>
                        <div className="text-right">
                            <span className="text-2xl font-black text-emerald-500 italic">฿{job.Price_Cust_Total?.toLocaleString() || "0"}</span>
                            <span className="text-base font-bold font-black text-emerald-800 block uppercase tracking-widest">{t('job_detail.gross_flow')}</span>
                        </div>
                     </div>
                     <div className="flex justify-between items-baseline p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                        <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('job_detail.operator_cost')}</span>
                        <div className="text-right">
                            <span className="text-2xl font-black text-rose-500 italic">฿{job.Cost_Driver_Total?.toLocaleString() || "0"}</span>
                            <span className="text-base font-bold font-black text-rose-800 block uppercase tracking-widest">{t('job_detail.yield_burn')}</span>
                        </div>
                     </div>
                </CardContent>
            </PremiumCard>

            {/* Operational Notes */}
            {job.Notes && (
                <PremiumCard className="bg-background/40 border-2 border-primary/20 shadow-3xl rounded-[3rem] overflow-hidden border-border/5">
                    <div className="p-8 border-b border-border/5 bg-black/40">
                        <h3 className="text-xl font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 italic">
                            <Target size={16} className="text-primary" /> {t('job_detail.tactical_intel')}
                        </h3>
                    </div>
                    <CardContent className="p-8">
                        <div className="relative">
                            <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary/30 rounded-full" />
                            <p className="text-lg font-bold font-bold text-muted-foreground leading-relaxed uppercase tracking-wider italic pl-6">{job.Notes}</p>
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
    let colorClass = "bg-slate-500/10 text-muted-foreground border-border/10" // Default
  
    switch (status) {
      case "New": colorClass = "bg-primary/10 text-primary border-primary/30 shadow-[0_0_15px_rgba(255,30,133,0.2)]"; break
      case "Assigned": colorClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"; break
      case "In Progress":
      case "In Transit": colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse"; break
      case "Delivered":
      case "Completed": colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"; break
      case "Cancelled": colorClass = "bg-slate-800/50 text-muted-foreground border-border/5"; break
      case "Failed": colorClass = "bg-rose-500/20 text-rose-500 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse"; break
    }
  
    return (
      <Badge variant="outline" className={cn("border px-4 py-1.5 text-base font-bold font-black uppercase tracking-[0.2em] rounded-full italic transition-all shadow-lg", colorClass)}>
        {status.toUpperCase()}
      </Badge>
    )
}
