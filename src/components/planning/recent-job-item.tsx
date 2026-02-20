"use client"

import { useState } from "react"
import { Package } from "lucide-react"
import { JobDialog } from "./job-dialog"

type Props = {
  job: any
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
        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
              <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-foreground font-medium group-hover:text-primary transition-colors">{job.Job_ID}</p>
              <p className="text-sm text-muted-foreground">{job.Customer_Name || "-"}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              job.Job_Status === 'Complete' || job.Job_Status === 'Delivered' 
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : job.Job_Status === 'In Transit' || job.Job_Status === 'Picked Up'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              {job.Job_Status}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{new Date(job.Plan_Date).toLocaleDateString('th-TH')}</p>
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
