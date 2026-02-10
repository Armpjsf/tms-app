"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteFuelLog } from "@/app/fuel/actions"
import { FuelLog } from "@/lib/supabase/fuel"
import { FuelDialog } from "./fuel-dialog"

interface FuelActionsProps {
  log: FuelLog
  drivers: any[]
  vehicles: any[]
}

export function FuelActions({ log, drivers, vehicles }: FuelActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบรายการนี้?")) return

    setLoading(true)
    try {
      const result = await deleteFuelLog(log.Log_ID)
      if (!result.success) {
        alert(result.message)
      }
    } catch (error) {
      console.error(error)
      alert("เกิดข้อผิดพลาดในการลบ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
            <span className="sr-only">Open menu</span>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
          <DropdownMenuLabel>การจัดการ</DropdownMenuLabel>
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white"
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            แก้ไขข้อมูล
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleDelete}
            className="text-red-400 focus:text-red-400 cursor-pointer hover:bg-red-950/20 focus:bg-red-950/20"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            ลบรายการ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FuelDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        drivers={drivers}
        vehicles={vehicles}
        initialData={log}
      />
    </>
  )
}
