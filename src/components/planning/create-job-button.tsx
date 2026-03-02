"use client"

import { PremiumButton } from "@/components/ui/premium-button"
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
      <PremiumButton 
        className="h-14 px-8 rounded-2xl"
        onClick={() => setOpen(true)}
      >
        <Plus size={24} className="mr-2" />
        สร้างงานใหม่
      </PremiumButton>

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
