"use client"

import { Button } from "@/components/ui/button"
import { deleteVehicle } from "@/app/vehicles/actions"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { VehicleDialog } from "./vehicle-dialog"

export function VehicleActions({ vehicle }: { vehicle: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`ยืนยันการลบรถ ${vehicle.Vehicle_Plate}?`)) return
    
    setLoading(true)
    try {
      await deleteVehicle(vehicle.Vehicle_Plate)
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
