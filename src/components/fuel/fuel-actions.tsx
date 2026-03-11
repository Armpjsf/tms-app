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
import { deleteFuelLog, updateFuelLogStatus } from "@/app/fuel/actions"
import { toast } from "sonner"
import { FuelLog } from "@/lib/supabase/fuel"
import { FuelDialog } from "./fuel-dialog"
import { CheckCircle2, XCircle } from "lucide-react"

interface FuelActionsProps {
  log: FuelLog
  drivers: { Driver_ID: string; Driver_Name: string }[]
  vehicles: { Vehicle_Plate: string; Vehicle_Type: string }[]
}

export function FuelActions({ log, drivers, vehicles }: FuelActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบรายการนี้?")) return

    setLoading(true)
    try {
      const result = await deleteFuelLog(log.Log_ID)
    } catch {
      toast.error('ไม่สามารถอ่านข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (status: string) => {
    setLoading(true)
    try {
      const result = await updateFuelLogStatus(log.Log_ID, status)
      if (!result.success) {
        toast.error(result.message)
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-white">
            <span className="sr-only">Open menu</span>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white border-gray-200 text-gray-800">
          <DropdownMenuLabel>การจัดการ</DropdownMenuLabel>
          
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-gray-100 hover:text-emerald-400 focus:bg-gray-100 focus:text-emerald-400"
            onClick={() => handleStatusUpdate('Approved')}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            อนุมัติ
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="cursor-pointer hover:bg-gray-100 hover:text-red-400 focus:bg-gray-100 focus:text-red-400"
            onClick={() => handleStatusUpdate('Rejected')}
          >
            <XCircle className="mr-2 h-4 w-4" />
            ไม่อนุมัติ
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="cursor-pointer hover:bg-gray-100 hover:text-white focus:bg-gray-100 focus:text-white"
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
