"use client"

import { Button } from "@/components/ui/button"
import { deleteDriver } from "@/app/drivers/actions"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { DriverDialog } from "./driver-dialog"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"

import { Subcontractor } from "@/types/subcontractor"

export function DriverActions({ driver, vehicles, subcontractors }: { driver: Driver, vehicles: Vehicle[], subcontractors: Subcontractor[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`ยืนยันการลบคนขับ ${driver.Driver_Name}?`)) return
    
    setLoading(true)
    try {
      await deleteDriver(driver.Driver_ID)
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
      <DriverDialog 
        mode="edit" 
        driver={driver}
        vehicles={vehicles}
        subcontractors={subcontractors}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 hover:bg-blue-500/20 text-blue-400"
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
