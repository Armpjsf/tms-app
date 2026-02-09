"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createRepairTicket } from "@/app/maintenance/actions"
import { Loader2 } from "lucide-react"

type MaintenanceDialogProps = {
  drivers: any[]
  vehicles: any[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MaintenanceDialog({
  drivers,
  vehicles,
  trigger,
  open,
  onOpenChange
}: MaintenanceDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const show = isControlled ? open : internalOpen
  const setShow = isControlled ? onOpenChange! : setInternalOpen

  const [formData, setFormData] = useState({
    Date_Report: new Date().toISOString().slice(0, 16),
    Driver_ID: '',
    Vehicle_Plate: '',
    Issue_Type: 'Engine',
    Issue_Desc: '',
    Priority: 'Medium'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createRepairTicket({
        ...formData,
        Date_Report: new Date(formData.Date_Report).toISOString()
      })
      
      setShow(false)
      if (!isControlled) {
        setFormData({
            Date_Report: new Date().toISOString().slice(0, 16),
            Driver_ID: '',
            Vehicle_Plate: '',
            Issue_Type: 'Engine',
            Issue_Desc: '',
            Priority: 'Medium'
        })
      }
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px] bg-slate-900/95 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>แจ้งซ่อมบำรุง</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="Date_Report">วัน-เวลาที่แจ้ง</Label>
            <Input
              id="Date_Report"
              type="datetime-local"
              value={formData.Date_Report}
              onChange={(e) => setFormData({ ...formData, Date_Report: e.target.value })}
              required
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="Driver_ID">ผู้แจ้ง (คนขับ)</Label>
                <select
                    id="Driver_ID"
                    value={formData.Driver_ID}
                    onChange={(e) => setFormData({ ...formData, Driver_ID: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                >
                    <option value="" className="bg-slate-900">เลือกคนขับ</option>
                    {drivers.map((d) => (
                        <option key={d.Driver_ID} value={d.Driver_ID} className="bg-slate-900">
                        {d.Driver_Name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="Vehicle_Plate">ทะเบียนรถ</Label>
                <select
                    id="Vehicle_Plate"
                    value={formData.Vehicle_Plate}
                    onChange={(e) => setFormData({ ...formData, Vehicle_Plate: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                >
                    <option value="" className="bg-slate-900">เลือกทะเบียน</option>
                    {vehicles.map((v) => (
                        <option key={v.Vehicle_Plate} value={v.Vehicle_Plate} className="bg-slate-900">
                        {v.Vehicle_Plate}
                        </option>
                    ))}
                </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="Issue_Type">ประเภทปัญหา</Label>
            <select
                id="Issue_Type"
                value={formData.Issue_Type}
                onChange={(e) => setFormData({ ...formData, Issue_Type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="Engine" className="bg-slate-900">เครื่องยนต์</option>
                <option value="Tire" className="bg-slate-900">ยาง</option>
                <option value="Battery" className="bg-slate-900">แบตเตอรี่</option>
                <option value="Body" className="bg-slate-900">ตัวถัง</option>
                <option value="Other" className="bg-slate-900">อื่นๆ</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="Issue_Desc">รายละเอียดปัญหา</Label>
            <Input
              id="Issue_Desc"
              value={formData.Issue_Desc}
              onChange={(e) => setFormData({ ...formData, Issue_Desc: e.target.value })}
              placeholder="รายละเอียด..."
              required
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Priority">ความสำคัญ</Label>
            <select
                id="Priority"
                value={formData.Priority}
                onChange={(e) => setFormData({ ...formData, Priority: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="Low" className="bg-slate-900">Low (ต่ำ)</option>
                <option value="Medium" className="bg-slate-900">Medium (ปานกลาง)</option>
                <option value="High" className="bg-slate-900">High (สูง/ด่วน)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-amber-500 to-orange-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              แจ้งซ่อม
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
