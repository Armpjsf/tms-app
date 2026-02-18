"use client"

import { Button } from "@/components/ui/button"
import { deleteVehicle } from "@/app/vehicles/actions"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { VehicleDialog } from "./vehicle-dialog"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Branch } from "@/lib/supabase/branches"
import { Subcontractor } from "@/types/subcontractor"

export function VehicleActions({ vehicle, branches = [], subcontractors = [] }: { vehicle: Vehicle, branches?: Branch[], subcontractors?: Subcontractor[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`ยืนยันการลบรถทะเบียน ${vehicle.vehicle_plate}?`)) return
    
    setLoading(true)
    try {
      await deleteVehicle(vehicle.vehicle_plate)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('ลบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <VehicleDialog 
        mode="edit" 
        vehicle={vehicle}
        branches={branches}
        subcontractors={subcontractors}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 hover:bg-purple-500/20 text-purple-400"
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
