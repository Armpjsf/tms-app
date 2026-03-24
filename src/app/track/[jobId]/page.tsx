import { getPublicJobDetails } from "@/lib/actions/tracking-actions"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  Package, 
  Truck, 
  MapPin, 
  Calendar, 
  Camera, 
  User, 
  CheckCircle2, 
  ClipboardList,
  ExternalLink,
  Zap,
  Activity,
  ShieldCheck,
  Target
} from "lucide-react"
import Image from "next/image"
import Link from 'next/link'
import { ShareTrackingButton } from "@/components/tracking/share-tracking-button"
import { TrackingMap } from "@/components/tracking/tracking-map"
import { FeedbackForm } from "@/components/tracking/feedback-form"
import { PODDownloadButton } from "@/components/tracking/pod-download"
import { cn } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export default async function TrackingPage(props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params
  const { jobId } = params
  const job = await getPublicJobDetails(jobId)

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 px-4 bg-[#0a0518]">
        <div className="bg-white/5 p-12 rounded-[4rem] border border-white/5 shadow-3xl relative group">
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
            <Package className="h-24 w-24 text-slate-800 mx-auto relative z-10 group-hover:scale-110 transition-transform duration-1000" strokeWidth={1} />
        </div>
        <div className="space-y-3">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Target Not Found</h1>
            <p className="text-slate-500 max-w-xs font-bold uppercase tracking-widest text-lg font-bold leading-relaxed italic">ไม่พบข้อมูลงานขนส่งในระบบ Neural Grid กรุณาตรวจสอบ ID หรือลองใหม่อีกครั้ง</p>
        </div>
        <Link href="/" className="px-10 py-4 bg-white/5 rounded-2xl border border-white/10 text-primary font-black uppercase tracking-[0.3em] text-base font-bold hover:bg-primary hover:text-white transition-all shadow-xl">
            Return to Command Center
        </Link>
      </div>
    )
  }

  const steps = [
    { key: 'New', label: 'INITIALIZED', icon: <Calendar size={18} /> },
    { key: 'Assigned', label: 'ASSIGNED', icon: <User size={18} /> },
    { key: 'Picked Up', label: 'UP_LINKED', icon: <Package size={18} /> },
    { key: 'In Transit', label: 'EN_ROUTE', icon: <Truck size={18} /> },
    { key: 'Completed', label: 'TERMINATED', icon: <CheckCircle2 size={18} /> },
  ]

  const getCurrentStepIndex = () => {
    const status = job.status
    if (['Delivered', 'Completed', 'Complete'].includes(status)) return 4
    if (status === 'In Transit') return 3
    if (status === 'Picked Up') return 2
    if (status === 'Assigned') return 1
    return 0
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <div className="min-h-screen bg-[#0a0518] text-white selection:bg-primary selection:text-white">
        <div className="max-w-3xl mx-auto space-y-10 pb-24 px-6 pt-10">
            {/* Tactical Mission Header */}
            <div className="relative rounded-[4rem] overflow-hidden bg-[#0c061d]/60 backdrop-blur-3xl border border-white/5 shadow-3xl group ring-1 ring-white/5 hover:ring-primary/20 transition-all duration-700">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-indigo-500 to-accent"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                <div className="p-12 md:p-16 space-y-10 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-primary font-black text-base font-bold uppercase tracking-[0.5em] italic">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_15px_rgba(255,30,133,1)]" />
                                <span>Tactical Vector Tracking</span>
                            </div>
                            <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">{job.jobId}</h1>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <Badge className={cn(
                                "px-8 py-3 rounded-2xl text-base font-bold font-black uppercase tracking-[0.3em] border shadow-2xl transition-all duration-700 italic",
                                currentStepIndex === 4 
                                ? 'bg-primary/20 text-primary border-primary/30 shadow-primary/10' 
                                : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                            )}>
                                {job.status.toUpperCase()}
                            </Badge>
                        </div>
                    </div>

                    {/* Elite Tactical Stepper */}
                    <div className="relative px-4 py-8">
                        <div className="absolute top-1/2 left-10 right-10 h-px bg-white/5 -translate-y-1/2 z-0" />
                        <div 
                            className="absolute top-1/2 left-10 h-px bg-primary -translate-y-1/2 z-0 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,30,133,1)]" 
                            style={{ width: `${(currentStepIndex / 4) * (100 - 18)}%` }}
                        />
                        
                        <div className="flex justify-between relative z-10">
                            {steps.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex
                                const isCurrent = idx === currentStepIndex
                                return (
                                    <div key={step.key} className="flex flex-col items-center group/step">
                                        <div className={cn(
                                            "w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-700 border-2 relative overflow-hidden",
                                            isCurrent 
                                            ? 'bg-primary border-primary/40 text-white scale-110 shadow-[0_0_30px_rgba(255,30,133,0.5)] rotate-3' 
                                            : isCompleted 
                                            ? 'bg-[#0a0518] border-primary/40 text-primary' 
                                            : 'bg-[#0a0518] border-white/5 text-slate-800'
                                        )}>
                                            <div className={cn(
                                                "absolute inset-0 bg-gradient-to-br from-white/10 to-transparent",
                                                !isCompleted && "opacity-0"
                                            )} />
                                            <span className="relative z-10">{step.icon}</span>
                                        </div>
                                        <span className={cn(
                                            "text-base font-bold mt-4 font-black transition-colors uppercase tracking-[0.2em] italic",
                                            isCompleted ? 'text-primary opacity-60' : 'text-slate-800'
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tactical Map Container */}
            {job.lastLocation && (
                <div className="bg-[#0c061d]/40 border border-white/5 overflow-hidden shadow-3xl rounded-[4rem] group hover:border-primary/20 transition-all duration-700">
                    <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div className="flex items-center gap-4 text-white font-black text-lg font-bold uppercase tracking-[0.2em] italic">
                            <Target size={18} className="text-primary animate-pulse" strokeWidth={3} />
                            <span>Spatial Vector Fix</span>
                        </div>
                        <div className="text-base font-bold font-black text-slate-600 uppercase tracking-widest italic flex items-center gap-3">
                            <Activity size={12} className="text-primary" />
                            SYNC_TIME: {new Date(job.lastLocation.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                        </div>
                    </div>
                    <div className="h-[400px] w-full relative">
                        <div className="absolute inset-0 bg-primary/5 pointer-events-none group-hover:opacity-0 transition-opacity" />
                        <TrackingMap 
                            lastLocation={job.lastLocation}
                            driverName={job.driverName}
                            status={job.status}
                        />
                    </div>
                </div>
            )}

            {/* Mission Intelligence Matrix */}
            <div className="grid grid-cols-1 gap-10">
                <section className="bg-[#0c061d]/40 border border-white/5 rounded-[4rem] p-12 shadow-3xl space-y-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 text-primary pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                            <ShieldCheck size={120} />
                        </div>
                        <div className="flex items-center gap-6 text-white font-black text-lg border-l-4 border-primary pl-6 uppercase tracking-tighter italic relative">
                            <div className="w-16 h-16 bg-[#050110]/80 border border-white/10 rounded-2xl overflow-hidden relative shadow-xl shadow-primary/20">
                                <Image src="/logo-tactical.png" alt="LogisPro Logo" fill className="object-cover p-2" />
                            </div>
                            <span>Logistics Intelligence</span>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 hover:bg-white/[0.06] transition-all duration-500">
                                <p className="text-base font-bold uppercase font-black text-slate-600 mb-2 tracking-widest italic">Asset Descriptor</p>
                                <p className="text-lg font-black text-white italic tracking-tight">{job.vehiclePlate.toUpperCase()}</p>
                            </div>
                            <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 hover:bg-white/[0.06] transition-all duration-500">
                                <p className="text-base font-bold uppercase font-black text-slate-600 mb-2 tracking-widest italic">Mission Specialist</p>
                                <p className="text-lg font-black text-white italic tracking-tight">{job.driverName?.toUpperCase() || 'UNASSIGNED'}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-6 p-8 bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/10 hover:bg-indigo-500/10 transition-all group/item">
                                <div className="mt-1"><div className="w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20 group-hover/item:animate-pulse" /></div>
                                <div>
                                    <p className="text-base font-bold uppercase font-black text-slate-500 mb-2 tracking-widest italic">Origin Node (Inception)</p>
                                    <p className="text-xl text-slate-300 font-bold uppercase tracking-tight">{job.origin}</p>
                                </div>
                            </div>
                            <div className="flex gap-6 p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 hover:bg-primary/10 transition-all group/item">
                                <div className="mt-1"><MapPin size={20} className="text-primary group-hover/item:animate-bounce" strokeWidth={3} /></div>
                                <div>
                                    <p className="text-base font-bold uppercase font-black text-slate-500 mb-2 tracking-widest italic">Destination Node (Terminus)</p>
                                    <p className="text-lg text-white font-black uppercase tracking-tight italic">{job.destination}</p>
                                </div>
                            </div>
                        </div>
                </section>

                {/* Media Archive (Photos) */}
                {(job.pickupPhotos.length > 0 || job.podPhotos.length > 0) && (
                    <section className="bg-[#0c061d]/40 border border-white/5 rounded-[4rem] p-12 shadow-3xl space-y-10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 text-accent pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <Camera size={120} />
                            </div>
                            <div className="flex items-center gap-4 text-white font-black text-lg border-l-4 border-accent pl-6 uppercase tracking-tighter italic">
                                <Camera size={24} className="text-accent" strokeWidth={3} />
                                <span>Visual Mission Matrix</span>
                            </div>

                            <div className="space-y-12">
                                {job.pickupPhotos.length > 0 && (
                                    <div className="space-y-6">
                                        <p className="text-base font-bold font-black text-slate-600 px-2 uppercase tracking-[0.3em] italic">Inception Point Data (Pickup)</p>
                                        <div className="grid grid-cols-2 gap-6">
                                            {job.pickupPhotos.map((url, i) => (
                                                <div key={i} className="aspect-video relative rounded-[2rem] overflow-hidden border border-white/5 bg-black/40 shadow-inner group/photo cursor-pointer">
                                                    <Image src={url} alt="Pickup" fill className="object-cover transition-transform duration-700 group-hover/photo:scale-110" />
                                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                                        <ExternalLink size={24} className="text-white" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {job.podPhotos.length > 0 && (
                                    <div className="space-y-6">
                                        <p className="text-base font-bold font-black text-slate-600 px-2 uppercase tracking-[0.3em] italic">Terminus Point Data (POD)</p>
                                        <div className="grid grid-cols-2 gap-6">
                                            {job.podPhotos.map((url, i) => (
                                                <div key={i} className="aspect-video relative rounded-[2rem] overflow-hidden border border-white/5 bg-black/40 shadow-inner group/photo cursor-pointer">
                                                    <Image src={url} alt="POD" fill className="object-cover transition-transform duration-700 group-hover/photo:scale-110" />
                                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                                        <ExternalLink size={24} className="text-white" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {(job.signature || job.pickupSignature) && (
                                    <div className="grid grid-cols-2 gap-8 pt-4">
                                        {job.pickupSignature && (
                                            <div className="space-y-4">
                                                <p className="text-base font-bold uppercase font-black text-slate-700 text-center tracking-widest italic">Inception Identifier</p>
                                                <div className="h-28 bg-white/[0.9] rounded-[1.5rem] overflow-hidden relative border border-white/10 group-hover:bg-white transition-colors duration-500">
                                                    <Image src={job.pickupSignature} alt="Pickup Sig" fill className="object-contain p-6" />
                                                </div>
                                            </div>
                                        )}
                                        {job.signature && (
                                            <div className="space-y-4">
                                                <p className="text-base font-bold uppercase font-black text-slate-700 text-center tracking-widest italic">Terminus Identifier</p>
                                                <div className="h-28 bg-white/[0.9] rounded-[1.5rem] overflow-hidden relative border border-white/10 group-hover:bg-white transition-colors duration-500">
                                                    <Image src={job.signature} alt="POD Sig" fill className="object-contain p-6" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                    </section>
                )}

                {currentStepIndex === 4 && (
                    <div className="space-y-10 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <PODDownloadButton job={job} />
                        <FeedbackForm jobId={job.jobId} />
                    </div>
                )}
            </div>

            {/* Tactical Footer */}
            <div className="text-center pt-16 flex flex-col items-center gap-6">
                <div className="flex items-center gap-6 opacity-20">
                    <div className="w-12 h-px bg-slate-800" />
                    <Zap size={14} className="text-primary" />
                    <div className="w-12 h-px bg-slate-800" />
                </div>
                <p className="text-base font-bold text-slate-700 font-black uppercase tracking-[0.6em] italic">
                    © 2026 LOGISPRO ELITE • SPATIAL INTELLIGENCE GRID
                </p>
            </div>
        </div>

        <ShareTrackingButton jobId={job.jobId} />
    </div>
  )
}
