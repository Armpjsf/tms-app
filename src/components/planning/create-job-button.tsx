"use client"

import { PremiumButton } from "@/components/ui/premium-button"
import { JobDialog } from "@/components/planning/job-dialog"
import { Plus } from "lucide-react"
import { useState } from "react"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Route } from "@/lib/supabase/routes"
import { Subcontractor } from "@/types/subcontractor"

type Props = {
  drivers: Driver[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes: Route[]
  subcontractors: Subcontractor[]
}

export function CreateJobButton({ drivers, vehicles, customers, routes, subcontractors }: Props) {
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
        subcontractors={subcontractors}
      />
    </>
  )
}
