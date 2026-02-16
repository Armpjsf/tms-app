'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Loader2 } from "lucide-react" // Use Settings icon for manage
import { adminUpdateJobStatus } from "@/app/admin/jobs/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Props = {
  jobId: string
  currentStatus: string
}

const JOB_STATUSES = [
  "New",
  "Assigned",
  "In Progress", 
  "In Transit",
  "Delivered",
  "Completed",
  "Failed", 
  "Cancelled"
]

export function AdminJobActions({ jobId, currentStatus }: Props) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpdate = async () => {
    try {
      setLoading(true)
      const result = await adminUpdateJobStatus(jobId, status, note)
      
      if (result.success) {
        toast.success("Job status updated")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("Failed to update status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-300">
          <Settings className="h-4 w-4" />
          จัดการสถานะ (Admin)
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>อัพเดทสถานะงาน (Admin Override)</DialogTitle>
          <DialogDescription className="text-slate-400">
            เปลี่ยนสถานะงานแทนคนขับ หรือปิดงานกรณีฉุกเฉิน
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right text-slate-300">
              สถานะ
            </Label>
            <div className="col-span-3">
                <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {JOB_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                        {s}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="note" className="text-right text-slate-300">
              หมายเหตุ
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="col-span-3 bg-slate-950 border-slate-700 text-white resize-none"
              placeholder="เหตุผลการแก้ไข (ถ้ามี)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white" disabled={loading}>
            ยกเลิก
          </Button>
          <Button onClick={handleUpdate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
