"use client"

import { useState } from "react"
import { MoreVertical, Pencil, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { deleteRepairTicket, updateRepairTicket } from "@/app/maintenance/actions"
import { MaintenanceDialog } from "./maintenance-dialog"
import { RepairTicket } from "@/lib/supabase/maintenance"

interface MaintenanceActionsProps {
  ticket: RepairTicket
  drivers: any[]
  vehicles: any[]
}

export function MaintenanceActions({ ticket, drivers, vehicles }: MaintenanceActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบใบแจ้งซ่อมนี้?")) return

    setLoading(true)
    try {
      const result = await deleteRepairTicket(ticket.Ticket_ID)
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

  const handleStatusUpdate = async (status: string) => {
    setLoading(true)
    try {
      // For quick status update, we just send the status and required ID
      const result = await updateRepairTicket(ticket.Ticket_ID, { ...ticket, Status: status })
      if (!result.success) {
        alert(result.message)
      }
    } catch (error) {
      console.error(error)
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ")
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
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
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white cursor-pointer">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              อัปเดตสถานะ
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-slate-900 border-slate-800 text-slate-200">
              <DropdownMenuItem onClick={() => handleStatusUpdate('Pending')} className="cursor-pointer hover:bg-slate-800">
                รอดำเนินการ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate('In Progress')} className="cursor-pointer hover:bg-slate-800 text-blue-400">
                อนุมัติ / กำลังซ่อม
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate('Rejected')} className="cursor-pointer hover:bg-slate-800 text-red-400">
                ไม่อนุมัติ / ปฏิเสธ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate('Completed')} className="cursor-pointer hover:bg-slate-800 text-emerald-400">
                เสร็จสิ้น
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="bg-slate-800" />
          
          <DropdownMenuItem 
            onClick={handleDelete}
            className="text-red-400 focus:text-red-400 cursor-pointer hover:bg-red-950/20 focus:bg-red-950/20"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            ลบรายการ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MaintenanceDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        drivers={drivers}
        vehicles={vehicles}
        initialData={ticket}
      />
    </>
  )
}
