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
  canViewIncome?: boolean
  canViewExpense?: boolean
  canAssign?: boolean
  canDelete?: boolean
}

export function RecentJobItem({ job, drivers, vehicles, customers, routes, subcontractors, canViewIncome = true, canViewExpense = true, canAssign = true, canDelete = true }: Props) {
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
        className="px-6 py-4 transition-all cursor-pointer group relative overflow-hidden border-b border-border/5 last:border-0 bg-background hover:bg-muted/30"
      >
        {/* Hover Highlight Accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(255,30,133,1)]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 w-full">
          
          {/* Section 1: Identifier & Customer */}
          <div className="flex items-center gap-4 min-w-[30%]">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Package size={18} className="text-primary" />
            </div>
            <div>
                <p className="text-primary font-black text-base tracking-tight transition-colors uppercase leading-none mb-1">
                    {job.Job_ID}
                </p>
                <p className="text-foreground font-bold text-sm truncate max-w-[200px]">
                    {job.Customer_Name || t('jobs.unassigned_client')}
                </p>
            </div>
          </div>

          {/* Section 2: Technical Metrics */}
          <div className="flex flex-1 items-center justify-center gap-8 xl:gap-12">
            <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{t('jobs.label_route_node')}</p>
                <p className="text-xs font-black text-foreground uppercase tracking-tighter whitespace-nowrap">
                    {job.Route_Name || "UNASSIGNED GRID"}
                </p>
            </div>
            <div className="h-6 w-px bg-muted/50" />
            <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{t('jobs.label_assigned_unit')}</p>
                <p className="text-xs font-black text-foreground uppercase tracking-tighter whitespace-nowrap">
                    {job.Vehicle_Plate || "ASSET-TBD"}
                </p>
            </div>
          </div>

          {/* Section 3: Status & Date */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 min-w-[180px]">
            <div className="flex items-center gap-2 pr-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('en-GB') : "PENDING"}
                </p>
            </div>
            <button className={cn(
                "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm bg-muted/50 text-muted-foreground border-border/10",
                (job.Job_Status === 'Complete' || job.Job_Status === 'Delivered') && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            )}>
              {getStatusLabel(job.Job_Status)}
            </button>
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
        canViewIncome={canViewIncome}
        canViewExpense={canViewExpense}
        canAssign={canAssign}
        canDelete={canDelete}
      />
    </>
  )
}
