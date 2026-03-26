"use client"

import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  MapPin, 
  User, 
  CheckCircle2, 
  Package,
  FileText,
  Eye,
  ClipboardList,
  ExternalLink,
  FileX
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Job } from "@/lib/supabase/jobs"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { getJobGPSData } from "@/lib/actions/gps-actions"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"
import { OrderTimeline } from "@/components/ui/order-timeline"
import { DriverLocation } from "@/components/maps/leaflet-map"

const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), { 
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-muted animate-pulse rounded-xl" />
})

interface GPSPoint {
  lat: number
  lng: number
  timestamp: string
}

interface JobGPSData {
  route: [number, number][]
  latest: GPSPoint | null
}

type JobSummaryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job | any
}

export function JobSummaryDialog({ open, onOpenChange, job }: JobSummaryDialogProps) {
  const { t } = useLanguage()
  const [gpsData, setGpsData] = useState<JobGPSData | null>(null)

  const jobId = job?.Job_ID
  const driverName = job?.Driver_Name
  const planDate = job?.Plan_Date

  useEffect(() => {
    async function fetchGps() {
      if (open && jobId) {
        try {
          const data = await getJobGPSData(jobId, job.Driver_ID, planDate)
          setGpsData(data as JobGPSData)
        } catch {}
      }
    }
    fetchGps()
  }, [open, jobId, job?.Driver_ID, planDate])

  if (!job) return null

  const pickupPhotos = job.Pickup_Photo_Url ? job.Pickup_Photo_Url.split(',').filter(Boolean) : []
  const podPhotos = job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',').filter(Boolean) : []
  
  const gpsPoints = gpsData?.route || []
  const latestLocation = gpsData?.latest
  const mapDrivers: DriverLocation[] = latestLocation ? [{
    id: jobId || 'current',
    name: driverName || 'Driver',
    lat: latestLocation.lat,
    lng: latestLocation.lng,
    status: 'Latest Location',
    lastUpdate: latestLocation.timestamp
  }] : []
  const reportUrl = podPhotos.find((url: string) => url.toUpperCase().includes('REPORT'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-gray-200 bg-background print:max-h-none print:overflow-visible">
        <DialogTitle className="sr-only">Job Summary - {job.Job_ID}</DialogTitle>
        <DialogDescription className="sr-only">
          Detailed summary for job {job.Job_ID} including timeline, photos, and signatures.
        </DialogDescription>

        <div className="printable-content">
          {/* Print only Header (Simple Text) */}
          <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
             <h1 className="text-2xl font-bold">{t('reports.title_summary')}</h1>
             <p className="text-xl">Job ID: {job.Job_ID} | {t('common.date')}: {job.Plan_Date}</p>
             <p className="text-xl">{t('common.status')}: {job.Job_Status}</p>
          </div>

          {/* Web Header (No Print) */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md p-6 border-b border-border/10 flex justify-between items-start no-print">
            <div>
              <div className="flex items-center gap-3 mb-1">
            <div className="bg-emerald-500/10 p-2 rounded-lg">
                  <ClipboardList className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    {t('reports.title_summary')}
                    <span className="h-1 w-1 rounded-full bg-indigo-400/50"></span>
                  </h2>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-foreground tracking-tight">
                      {job.Job_ID}
                    </h1>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-base font-bold font-bold uppercase tracking-wider border",
                      job.Job_Status === 'Completed' 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-blue-500/10 text-emerald-500 border-emerald-500/15"
                    )}>
                      {job.Job_Status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-muted-foreground font-medium">{new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          {/* Content Wrapper */}
          <div className="p-6 space-y-8">
            {/* Timeline + Info Grid — side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Vertical Order Timeline (Dribbble-inspired) */}
              <div className="lg:col-span-1 bg-muted/50 rounded-2xl border border-border/10 p-5 no-print shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-foreground">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                  <h3 className="font-black text-xl uppercase tracking-wider">Order Timeline</h3>
                </div>
                <OrderTimeline 
                  currentStatus={job.Job_Status} 
                  planDate={job.Plan_Date}
                  createdAt={job.created_at}
                />
              </div>

              {/* Right: Basic Info Grid */}
              <div className="lg:col-span-2">

                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-foreground font-black border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-xl">
                        <User size={18} className="text-emerald-400" />
                        <span>{t('reports.general_info')}</span>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4 border border-border/10 grid grid-cols-2 gap-y-4 shadow-sm">
                        <div>
                            <p className="text-base font-bold uppercase text-muted-foreground font-bold mb-1">{t('jobs.dialog.customer')}</p>
                            <p className="text-xl font-bold text-muted-foreground">{job.Customer_Name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-base font-bold uppercase text-muted-foreground font-bold mb-1">{t('jobs.dialog.route')}</p>
                            <p className="text-xl font-bold text-muted-foreground">{job.Route_Name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-base font-bold uppercase text-muted-foreground font-bold mb-1">{t('jobs.dialog.vehicle')}</p>
                            <p className="text-xl font-bold text-muted-foreground">{job.Vehicle_Plate || '-'}</p>
                        </div>
                        <div>
                            <p className="text-base font-bold uppercase text-muted-foreground font-bold mb-1">{t('jobs.dialog.driver')}</p>
                            <p className="text-xl font-bold text-muted-foreground">{job.Driver_Name || job.Driver_ID || '-'}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-foreground font-black border-l-4 border-emerald-500 pl-3 uppercase tracking-wider text-xl">
                        <MapPin size={18} className="text-emerald-400" />
                        <span>{t('reports.location_time')}</span>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4 border border-border/10 space-y-4 shadow-sm">
                        <div className="flex gap-3">
                            <div className="mt-1"><div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" /></div>
                            <div>
                                <p className="text-base font-bold uppercase text-muted-foreground font-bold">{t('jobs.dialog.origin')}</p>
                                <p className="text-lg font-bold text-muted-foreground font-medium">{job.Origin_Location || job.Location_Origin_Name || '-'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="mt-1"><MapPin size={14} className="text-emerald-500" /></div>
                            <div>
                                <p className="text-base font-bold uppercase text-muted-foreground font-bold">{t('jobs.dialog.destination')}</p>
                                <p className="text-lg font-bold text-muted-foreground font-bold">{job.Dest_Location || job.Location_Destination_Name || '-'}</p>
                            </div>
                        </div>
                    </div>
                </section>
              </div>
            </div>{/* end Grid */}

            {/* GPS Map Section */}
            <section className="space-y-4 no-print">
              <h3 className="text-xl font-black text-foreground flex items-center gap-2 uppercase tracking-wider">
                <MapPin size={16} className="text-emerald-400" />
                {t('reports.latest_location')}
              </h3>
              <div className="h-[250px] rounded-2xl overflow-hidden border border-border/10 bg-muted shadow-inner relative">
                {(job.Tracking_LAT && job.Tracking_LNG) || gpsPoints.length > 0 || latestLocation ? (
                  <LeafletMap 
                    routeHistory={gpsPoints as [number, number][]}
                    drivers={mapDrivers}
                    center={latestLocation ? [latestLocation.lat, latestLocation.lng] : undefined}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background/80 backdrop-blur-sm">
                    <MapPin size={32} className="mb-2 opacity-20" />
                    <p className="text-lg font-bold font-medium">{t('reports.no_gps')}</p>
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pickup Info */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-foreground flex items-center gap-2 border-l-4 border-indigo-500 pl-3 uppercase tracking-wider">
                    <Package size={16} className="text-emerald-400" />
                    {t('reports.pickup_info')}
                  </h3>
                  <span className="text-base font-bold text-muted-foreground font-bold uppercase no-print">{t('reports.photo_count', { count: pickupPhotos.length })}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {pickupPhotos.map((url: string, i: number) => (
                    <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/10 bg-muted group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                      <Image 
                        src={url} 
                        alt={`Pickup proof ${i}`} 
                        fill 
                        className="object-cover transition-transform duration-500 hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink size={20} className="text-foreground" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border/10 bg-muted/50 p-4 shadow-sm">
                  <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mb-3">{t('reports.pickup_signature')}</p>
                  <div className="h-24 flex items-center justify-center border border-dashed border-border/10 rounded-lg relative overflow-hidden bg-muted/50">
                    {job.Signature_Pickup_Url || job.Pickup_Signature_Url ? (
                      <Image 
                        src={job.Signature_Pickup_Url || job.Pickup_Signature_Url} 
                        alt="Pickup Signature" 
                        fill 
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-muted-foreground text-lg font-bold italic">{t('reports.no_signature')}</span>
                    )}
                  </div>
                </div>
              </section>

              {/* POD Info */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-foreground flex items-center gap-2 border-l-4 border-emerald-500 pl-3 uppercase tracking-wider">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    {t('reports.pod_info')}
                  </h3>
                  <span className="text-base font-bold text-muted-foreground font-bold uppercase no-print">{t('reports.photo_count', { count: podPhotos.length })}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {podPhotos.map((url: string, i: number) => {
                    const isReport = url.toUpperCase().includes('REPORT');
                    return (
                      <div key={i} className={cn(
                        "relative aspect-[4/3] rounded-xl overflow-hidden border border-border/10 bg-muted group cursor-pointer",
                        isReport && "col-span-2 aspect-video ring-2 ring-indigo-500/30"
                      )} onClick={() => window.open(url, '_blank')}>
                        <Image 
                          src={url} 
                          alt={`POD proof ${i}`} 
                          fill 
                          className="object-cover transition-transform duration-500 hover:scale-110"
                        />
                        {isReport && (
                          <div className="absolute top-3 left-3 bg-indigo-500 text-foreground font-bold font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <FileText size={10} />
                            {t('reports.digital_report')}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink size={20} className="text-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-border/10 bg-muted/50 p-4 shadow-sm">
                   <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mb-3">{t('reports.dropoff_signature')}</p>
                  <div className="h-24 flex items-center justify-center border border-dashed border-border/10 rounded-lg relative overflow-hidden bg-muted/50">
                    {job.Signature_Proof_Url || job.Signature_Url ? (
                      <Image 
                        src={job.Signature_Proof_Url || job.Signature_Url} 
                        alt="POD Signature" 
                        fill 
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-muted-foreground text-lg font-bold italic">{t('reports.no_signature')}</span>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="sticky bottom-0 bg-background/90 backdrop-blur-md p-4 border-t border-border/10 flex justify-between items-center gap-3 no-print">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            {t('reports.close_btn')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-border/10 text-foreground" onClick={() => window.print()}>
              <FileText size={16} />
              {t('reports.print_btn')}
            </Button>
            
            {reportUrl ? (
              <Button 
                asChild
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
              >
                <Link href={reportUrl} target="_blank">
                  <Eye size={16} />
                  {t('reports.view_original_btn')}
                </Link>
              </Button>
            ) : (
              <Button 
                disabled
                variant="secondary"
                className="gap-2 opacity-50 transition-opacity"
              >
                <FileX size={16} />
                {t('reports.no_file')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

