"use client"

import { useState } from "react"
import { Package, Truck } from "lucide-react"
import { JobDialog } from "./job-dialog"
import { RequestPreviewDialog } from "./request-preview-dialog"
import { cn } from "@/lib/utils"
import { Job } from "@/lib/supabase/jobs"
import { Route } from "@/lib/supabase/routes"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Subcontractor } from "@/types/subcontractor"
import { useLanguage } from "@/components/providers/language-provider"

type Props = {
  job: Job
  drivers: Driver[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes: Route[]
  subcontractors: Subcontractor[]
  canViewPrice?: boolean
  canDelete?: boolean
}

export function RecentJobItem({ job, drivers, vehicles, customers, routes, subcontractors, canViewPrice = true, canDelete = true }: Props) {
  const [open, setOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { t } = useLanguage()

  const handleOpen = () => {
    if (job.Job_Status === 'Requested') {
        setPreviewOpen(true)
    } else {
        setOpen(true)
    }
  }

  const handleTransitionToPlan = () => {
    setPreviewOpen(false)
    setTimeout(() => setOpen(true), 100) 
  }

  // Display a shortened version of the UUID for better UI
  const displayId = job.Job_ID.length > 15 
    ? `${job.Job_ID.substring(0, 8)}...` 
    : job.Job_ID;

  // Localize Status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Requested': return t('jobs.status_requested');
      case 'Pending': return t('jobs.status_pending');
      case 'In Transit': return t('jobs.status_in_transit');
      case 'Picked Up': return t('jobs.status_picked_up');
      case 'Delivered': return t('jobs.status_delivered');
      case 'Complete': return t('jobs.status_completed');
      case 'Cancelled': return t('jobs.status_cancelled');
      default: return status;
    }
  }

  return (
    <>
      <div 
        onClick={handleOpen}
        className="px-8 py-10 transition-all cursor-pointer group relative overflow-hidden border-b border-border/5 last:border-0 bg-background"
      >
        {/* Hover Highlight Accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_15px_rgba(255,30,133,1)]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10 w-full">
          
          {/* Section 1: Identifier & Customer */}
          <div className="flex items-center gap-8 min-w-[30%]">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(255,30,133,0.3)] border border-primary/50">
              <Package size={28} strokeWidth={2.5} className="text-foreground" />
            </div>
            <div>
                <p className="text-primary font-black text-3xl tracking-tighter transition-colors uppercase font-display break-all leading-none mb-1">
                    {job.Job_ID}
                </p>
                <p className="text-foreground font-bold text-xl tracking-tight opacity-90">
                    {job.Customer_Name || t('jobs.unassigned_client')}
                </p>
            </div>
          </div>

          {/* Section 2: Technical Metrics */}
          <div className="flex flex-1 items-center justify-center gap-16 xl:gap-24">
            <div className="text-right">
                <p className="text-base font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t('jobs.label_route_node')}</p>
                <p className="text-lg font-black text-foreground uppercase tracking-tighter whitespace-nowrap">
                    {job.Route_Name || "UNASSIGNED GRID"}
                </p>
            </div>
            <div className="h-10 w-px bg-muted/80" />
            <div className="text-right">
                <p className="text-base font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t('jobs.label_assigned_unit')}</p>
                <p className="text-lg font-black text-foreground uppercase tracking-tighter whitespace-nowrap">
                    {job.Vehicle_Plate || "ASSET-TBD"}
                </p>
            </div>
          </div>

          {/* Section 3: Status & Date */}
          <div className="flex flex-col items-end gap-3 min-w-[180px]">
            <button className={cn(
                "px-10 py-4 rounded-full text-base font-black uppercase tracking-[0.2em] transition-all border shadow-lg bg-muted/50 text-muted-foreground border-border/10",
                (job.Job_Status === 'Complete' || job.Job_Status === 'Delivered') && 'bg-muted/80 text-foreground border-border/20'
            )}>
              {getStatusLabel(job.Job_Status)}
            </button>
            <div className="flex items-center gap-2 pr-2">
                <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(255,30,133,0.5)]" />
                <p className="text-base font-black text-muted-foreground uppercase tracking-[0.2em]">
                    {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('en-GB') : "PENDING"}
                </p>
            </div>
          </div>

        </div>
      </div>

      <RequestPreviewDialog 
        job={job}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onPlan={handleTransitionToPlan}
      />

      <JobDialog
        mode="edit"
        open={open}
        onOpenChange={setOpen}
        job={job}
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        subcontractors={subcontractors}
        canViewPrice={canViewPrice}
        canDelete={canDelete}
      />
    </>
  )
}
