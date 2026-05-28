"use client"

import { useState, useEffect, useTransition } from "react"
import { 
  Search, 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Loader2,
  Activity,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Target,
  User,
  CheckCircle2,
  Calendar,
  X
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PremiumCard } from "@/components/ui/premium-card"
import { TrackingMap } from "@/components/tracking/tracking-map"
import { PODDownloadButton } from "@/components/tracking/pod-download"
import { FeedbackForm } from "@/components/tracking/feedback-form"
import { getPublicJobDetails, PublicJobDetails } from "@/lib/actions/tracking-actions"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"

interface TrackingHubClientProps {
  initialActiveJobs: PublicJobDetails[]
  customerMode?: boolean
}

export function TrackingHubClient({ initialActiveJobs, customerMode = false }: TrackingHubClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeJobs, setActiveJobs] = useState<PublicJobDetails[]>(initialActiveJobs)
  const [selectedJob, setSelectedJob] = useState<PublicJobDetails | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [isSearching, startSearch] = useTransition()
  const [isLoaded, setIsLoaded] = useState(false)

  // Handle Initial Search from URL
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
        handleSearch(q)
    }
    setIsLoaded(true)
  }, [])

  const handleSearch = async (query: string) => {
    if (!query.trim()) return
    
    startSearch(async () => {
        const result = await getPublicJobDetails(query)
        if (result) {
            setSelectedJob(result)
            // If it's not in the active list, add it temporarily or highlight it
            if (!activeJobs.find(j => j.jobId === result.jobId)) {
                setActiveJobs(prev => [result, ...prev.slice(0, 19)])
            }
        } else {
            alert("ไม่พบข้อมูลงานที่ระบุ")
        }
    })
  }

  const steps = [
    { key: 'New', label: 'รับงาน', icon: <Calendar size={14} /> },
    { key: 'Assigned', label: 'จัดรถแล้ว', icon: <User size={14} /> },
    { key: 'Picked Up', label: 'รับสินค้าแล้ว', icon: <Package size={14} /> },
    { key: 'In Transit', label: 'กำลังจัดส่ง', icon: <Truck size={14} /> },
    { key: 'Completed', label: 'ส่งสำเร็จ', icon: <CheckCircle2 size={14} /> },
  ]

  const getCurrentStepIndex = (status: string) => {
    if (['Delivered', 'Completed', 'Complete'].includes(status)) return 4
    if (status === 'In Transit') return 3
    if (status === 'Picked Up') return 2
    if (status === 'Assigned') return 1
    return 0
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* LEFT PANEL: Search & Active List */}
      <div className="w-full lg:w-96 flex flex-col gap-4 overflow-hidden shrink-0">
        <PremiumCard className="p-4 bg-background/60 backdrop-blur-xl border-border/5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
            <Input 
              placeholder="ค้นหา Job ID หรือ SO..." 
              className="pl-10 h-11 bg-muted/50 border-none font-black uppercase tracking-widest text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-primary/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            />
            {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
            )}
          </div>
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-3 ml-1 italic opacity-60">
            ใส่หลายเลขคั่นด้วยจุลภาค (,) ได้
          </p>
        </PremiumCard>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
          <div className="flex items-center justify-between px-2 mb-2">
             <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic flex items-center gap-2">
                <Activity size={12} className="animate-pulse" /> Live Radar
             </h3>
             <Badge variant="outline" className="text-[9px] font-black opacity-40 border-none">{activeJobs.length} ACTIVE</Badge>
          </div>

          {activeJobs.map((job) => (
            <div 
              key={job.jobId}
              onClick={() => setSelectedJob(job)}
              className={cn(
                "group cursor-pointer p-4 rounded-2xl border transition-all duration-500 relative overflow-hidden",
                selectedJob?.jobId === job.jobId 
                ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/5" 
                : "bg-background/40 border-border/5 hover:border-primary/20 hover:bg-muted/30"
              )}
            >
              {selectedJob?.jobId === job.jobId && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_rgba(255,30,133,0.5)]" />
              )}
              
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black text-foreground uppercase tracking-tighter group-hover:text-primary transition-colors italic">
                  {job.jobId}
                </span>
                <Badge className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-muted/50 border-none">
                  {job.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">
                  <MapPin size={10} className="text-primary/60" />
                  <span className="truncate">{job.destination}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <Truck size={10} />
                    <span>{job.vehiclePlate}</span>
                  </div>
                  <ChevronRight size={14} className={cn("transition-transform duration-500", selectedJob?.jobId === job.jobId ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0")} />
                </div>
              </div>
            </div>
          ))}

          {activeJobs.length === 0 && (
            <div className="py-20 text-center opacity-20">
                <Package className="mx-auto mb-4" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest">No Active Missions</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Details & Map */}
      <div className="flex-1 overflow-y-auto custom-scrollbar rounded-3xl border border-border/5 bg-background/20 relative shadow-2xl">
        {!selectedJob ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-6">
                <div className="w-32 h-32 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse" />
                    <Navigation size={48} className="text-primary/40 relative z-10" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic">COMMAND CENTER READY</h3>
                    <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.3em] opacity-60 italic">SELECT A MISSION FROM THE RADAR TO BEGIN TRACKING</p>
                </div>
            </div>
        ) : (
            <div className="p-6 lg:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-primary/10 rounded-lg border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest italic animate-pulse">
                                MISSION IN PROGRESS
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] italic opacity-40">TARGET SECURED</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter uppercase italic premium-text-gradient leading-none">
                            {selectedJob.jobId}
                        </h1>
                        <div className="flex items-center gap-4 text-xs font-black text-muted-foreground uppercase tracking-widest italic">
                            <div className="flex items-center gap-2">
                                <User size={14} className="text-primary" />
                                <span>{selectedJob.driverName}</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-2">
                                <Truck size={14} className="text-primary" />
                                <span>{selectedJob.vehiclePlate}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                        <Badge className="px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest border shadow-xl bg-primary text-foreground border-primary/30">
                            {selectedJob.status}
                        </Badge>
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-2 opacity-50">
                            <Clock size={12} />
                            LAST PING: {new Date().toLocaleTimeString('th-TH', { hour12: false })}
                        </div>
                    </div>
                </div>

                {/* Map View */}
                <div className="aspect-[21/9] w-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative group">
                    <TrackingMap 
                        lastLocation={selectedJob.lastLocation || null}
                        driverName={selectedJob.driverName}
                        status={selectedJob.status}
                        pickup={{ lat: selectedJob.pickupLat ?? null, lng: selectedJob.pickupLon ?? null, name: selectedJob.origin }}
                        dropoff={{ lat: selectedJob.dropoffLat ?? null, lng: selectedJob.dropoffLon ?? null, name: selectedJob.destination }}
                    />
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Badge className="bg-black/80 backdrop-blur-md border-white/10 text-[9px] font-black uppercase tracking-widest italic py-1.5 px-3">
                            GPS SIGNAL: OPTIMAL
                        </Badge>
                    </div>
                </div>

                {/* Tracking Progress */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative py-10">
                    <div className="absolute top-1/2 left-10 right-10 h-1 bg-white/5 -translate-y-1/2 z-0 hidden md:block" />
                    {(() => {
                        const currentIdx = getCurrentStepIndex(selectedJob.status)
                        return steps.map((step, idx) => {
                            const isCompleted = idx <= currentIdx
                            const isCurrent = idx === currentIdx
                            return (
                                <div key={step.key} className="relative z-10 flex flex-col items-center gap-4 group/step">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 border-2",
                                        isCurrent 
                                        ? "bg-primary border-primary text-foreground scale-110 shadow-[0_0_30px_rgba(255,30,133,0.4)]" 
                                        : isCompleted 
                                        ? "bg-background border-primary text-primary shadow-lg" 
                                        : "bg-background border-white/5 text-muted-foreground opacity-30"
                                    )}>
                                        {step.icon}
                                    </div>
                                    <div className="text-center">
                                        <p className={cn(
                                            "text-[10px] font-black uppercase tracking-widest transition-all duration-700",
                                            isCompleted ? "text-primary italic" : "text-muted-foreground opacity-30"
                                        )}>
                                            {step.label}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    })()}
                </div>

                {/* Details Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Destination Insight */}
                    <div className="space-y-6">
                         <h3 className="text-xs font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-2 italic">
                            <Target size={14} className="text-primary" /> VECTOR DESTINATION
                         </h3>
                         <div className="space-y-4">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex gap-4 group/loc">
                                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 h-fit group-hover/loc:scale-110 transition-transform">
                                    <MapPin size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic opacity-60">TARGET DROP ZONE</p>
                                    <p className="text-base font-black text-foreground uppercase tracking-tight italic break-words leading-tight">{selectedJob.destination}</p>
                                </div>
                            </div>
                         </div>
                    </div>

                    {/* Evidence Matrix */}
                    <div className="space-y-6">
                         <h3 className="text-xs font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-2 italic">
                            <ShieldCheck size={14} className="text-primary" /> INTEGRITY EVIDENCE
                         </h3>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center space-y-3">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic opacity-60">PICKUP PROOF</p>
                                {selectedJob.pickupPhotos.length > 0 || selectedJob.pickupSignature ? (
                                    <div className="flex justify-center -space-x-3">
                                        {selectedJob.pickupPhotos.slice(0, 3).map((p, i) => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 overflow-hidden bg-black relative shadow-xl">
                                                <Image src={p} alt="Pickup" fill className="object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic">AWAITING PICKUP</div>
                                )}
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center space-y-3">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic opacity-60">DELIVERY PROOF</p>
                                {selectedJob.podPhotos.length > 0 || selectedJob.signature ? (
                                    <div className="flex justify-center -space-x-3">
                                        {selectedJob.podPhotos.slice(0, 3).map((p, i) => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 overflow-hidden bg-black relative shadow-xl">
                                                <Image src={p} alt="POD" fill className="object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic">MISSION PENDING</div>
                                )}
                            </div>
                         </div>
                    </div>
                </div>

                {/* Final Actions */}
                {getCurrentStepIndex(selectedJob.status) === 4 && (
                    <div className="pt-8 border-t border-white/5 space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
                        <PODDownloadButton job={selectedJob} />
                        <FeedbackForm jobId={selectedJob.jobId} />
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  )
}
