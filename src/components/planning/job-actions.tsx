"use client"

import { Button } from "@/components/ui/button"
import { deleteJob } from "@/app/planning/actions"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { JobDialog } from "./job-dialog"

import { Job } from "@/lib/supabase/jobs"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Route } from "@/lib/supabase/routes"
import { Subcontractor } from "@/types/subcontractor"

export function JobActions({ 
  job, 
  drivers, 
  vehicles,
  customers = [],
  routes = [],
  subcontractors = []
}: { 
  job: Job, 
  drivers: Driver[], 
  vehicles: Vehicle[],
  customers?: Customer[],
  routes?: Route[],
  subcontractors?: Subcontractor[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const handleDelete = async () => {
    if (!confirm('ยืนยันการลบงานนี้?')) return
    
    setLoading(true)
    try {
      await deleteJob(job.Job_ID)
      router.refresh()
    } catch {
      toast.error('ลบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <JobDialog 
        mode="edit" 
        job={job} 
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        subcontractors={subcontractors}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 hover:bg-emerald-500/15 text-emerald-500"
        onClick={() => setShowEdit(true)}
      >
        <Pencil size={16} />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 hover:bg-red-500/20 text-red-400"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  )
}
