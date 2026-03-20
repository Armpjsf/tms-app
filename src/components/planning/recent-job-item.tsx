"use client"

import { useState } from "react"
import { Package } from "lucide-react"
import { JobDialog } from "./job-dialog"
import { RequestPreviewDialog } from "./request-preview-dialog"
import { cn } from "@/lib/utils"
import { Job } from "@/lib/supabase/jobs"
import { Route } from "@/lib/supabase/routes"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Subcontractor } from "@/types/subcontractor"

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

  return (
    <>
      <div 
        onClick={handleOpen}
        className="p-8 hover:bg-white/[0.03] transition-all cursor-pointer group relative overflow-hidden border-b border-white/5 last:border-0"
      >
        {/* Hover Highlight Accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_15px_rgba(255,30,133,1)]" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-xl group-hover:shadow-[0_0_30px_rgba(255,30,133,0.3)] group-hover:-rotate-3">
              <Package size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-4">
                <p className="text-white font-black text-2xl tracking-tighter group-hover:text-primary transition-colors uppercase font-display">{job.Job_ID}</p>
                {job.Cargo_Type && (
                    <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">{job.Cargo_Type}</span>
                )}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 group-hover:text-slate-300 transition-colors">{job.Customer_Name || "No Client Assigned"}</p>
            </div>
          </div>

          <div className="flex items-center gap-12">
            {/* Operational Metrics Sub-info */}
            <div className="hidden md:flex items-center gap-8">
                <div className="text-right">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Route Node</p>
                    <p className="text-xs font-black text-slate-300 uppercase tracking-tighter">{job.Route_Name || "Local Grid"}</p>
                </div>
                <div className="h-8 w-px bg-white/5" />
                <div className="text-right">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Assigned Unit</p>
                    <p className="text-xs font-black text-slate-300 uppercase tracking-tighter">{job.Vehicle_Plate || "Asset-TBD"}</p>
                </div>
            </div>

            <div className="text-right flex flex-col items-end gap-3 min-w-[140px]">
                <span className={cn(
                    "px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg",
                    job.Job_Status === 'Complete' || job.Job_Status === 'Delivered' 
                        ? 'bg-primary/20 text-primary border-primary/30 shadow-primary/5'
                        : job.Job_Status === 'In Transit' || job.Job_Status === 'Picked Up'
                        ? 'bg-accent/20 text-accent border-accent/30 shadow-accent/5'
                        : job.Job_Status === 'Requested'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : 'bg-white/5 text-slate-400 border-white/10'
                )}>
                {job.Job_Status}
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('en-GB') : "PENDING SCHEDULE"}
                    </p>
                </div>
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
