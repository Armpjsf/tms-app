"use client"

import { Button } from "@/components/ui/button"
import { JobDialog } from "@/components/planning/job-dialog"
import { Plus } from "lucide-react"
import { useState } from "react"

type Props = {
  drivers: any[]
  vehicles: any[]
  customers: any[]
  routes: any[]
}

export function CreateJobButton({ drivers, vehicles, customers, routes }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button 
        size="lg" 
        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        onClick={() => setOpen(true)}
      >
        <Plus size={20} />
        สร้างงานใหม่
      </Button>

      <JobDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
      />
    </>
  )
}
