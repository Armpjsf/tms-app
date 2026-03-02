"use client"

import { useState } from "react"
import { Package } from "lucide-react"
import { JobDialog } from "./job-dialog"
import { cn } from "@/lib/utils"
import { Job } from "@/types/database"

type Props = {
  job: Job
  drivers: any[]
  vehicles: any[]
  customers: any[]
  routes: any[]
  canViewPrice?: boolean
  canDelete?: boolean
}

export function RecentJobItem({ job, drivers, vehicles, customers, routes, canViewPrice = true, canDelete = true }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="p-6 hover:bg-emerald-500/5 transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-inner group-hover:shadow-xl group-hover:shadow-emerald-500/20 group-hover:-rotate-3">
              <Package size={24} />
            </div>
            <div>
              <p className="text-gray-900 font-black text-xl tracking-tighter group-hover:text-emerald-600 transition-colors uppercase">{job.Job_ID}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{job.Customer_Name || "No Customer Assigned"}</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <span className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                job.Job_Status === 'Complete' || job.Job_Status === 'Delivered' 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : job.Job_Status === 'In Transit' || job.Job_Status === 'Picked Up'
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            )}>
              {job.Job_Status}
            </span>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(job.Plan_Date).toLocaleDateString('th-TH')}</p>
            </div>
          </div>
        </div>
      </div>

      <JobDialog
        mode="edit"
        open={open}
        onOpenChange={setOpen}
        job={job}
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        canViewPrice={canViewPrice}
        canDelete={canDelete}
      />
    </>
  )
}
