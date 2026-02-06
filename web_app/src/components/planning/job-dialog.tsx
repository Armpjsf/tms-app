"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createJob, updateJob } from "@/app/planning/actions"
import { Plus, Loader2 } from "lucide-react"

type JobDialogProps = {
  mode?: 'create' | 'edit'
  job?: any
  drivers: any[]
  vehicles: any[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function JobDialog({
  mode = 'create',
  job,
  drivers,
  vehicles,
  trigger,
  open,
  onOpenChange
}: JobDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Controlled vs Uncontrolled
  const isControlled = open !== undefined
  const show = isControlled ? open : internalOpen
  const setShow = isControlled ? onOpenChange! : setInternalOpen

  const [formData, setFormData] = useState({
    Job_ID: job?.Job_ID || '',
    Plan_Date: job?.Plan_Date || new Date().toISOString().split('T')[0],
    Customer_Name: job?.Customer_Name || '',
    Route_Name: job?.Route_Name || '',
    Driver_ID: job?.Driver_ID || '',
    Vehicle_Plate: job?.Vehicle_Plate || '',
    Job_Status: job?.Job_Status || 'New'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'create') {
        await createJob(formData)
      } else {
        await updateJob(job.Job_ID, formData)
      }
      setShow(false)
      if (!isControlled) {
        setFormData({
            Job_ID: '',
            Plan_Date: new Date().toISOString().split('T')[0],
            Customer_Name: '',
            Route_Name: '',
            Driver_ID: '',
            Vehicle_Plate: '',
            Job_Status: 'New'
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
          <DialogTitle>{mode === 'create' ? 'สร้างงานใหม่' : 'แก้ไขงาน'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Job_ID">Job ID</Label>
              <Input
                id="Job_ID"
                value={formData.Job_ID}
                onChange={(e) => setFormData({ ...formData, Job_ID: e.target.value })}
                placeholder="JOB-XXX"
                required
                disabled={mode === 'edit'}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Plan_Date">วันที่</Label>
              <Input
                id="Plan_Date"
                type="date"
                value={formData.Plan_Date}
                onChange={(e) => setFormData({ ...formData, Plan_Date: e.target.value })}
                required
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="Customer_Name">ลูกค้า</Label>
            <Input
              id="Customer_Name"
              value={formData.Customer_Name}
              onChange={(e) => setFormData({ ...formData, Customer_Name: e.target.value })}
              placeholder="ชื่อลูกค้า"
              required
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Route_Name">เส้นทาง</Label>
            <Input
              id="Route_Name"
              value={formData.Route_Name}
              onChange={(e) => setFormData({ ...formData, Route_Name: e.target.value })}
              placeholder="ต้นทาง - ปลายทาง"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Driver_ID">คนขับ</Label>
              <select
                id="Driver_ID"
                value={formData.Driver_ID}
                onChange={(e) => setFormData({ ...formData, Driver_ID: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          
          {mode === 'edit' && (
             <div className="space-y-2">
              <Label htmlFor="Job_Status">สถานะ</Label>
              <select
                id="Job_Status"
                value={formData.Job_Status}
                onChange={(e) => setFormData({ ...formData, Job_Status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                 <option value="New" className="text-black">New</option>
                 <option value="Assigned" className="text-black">Assigned</option>
                 <option value="Picked Up" className="text-black">Picked Up</option>
                 <option value="In Transit" className="text-black">In Transit</option>
                 <option value="Delivered" className="text-black">Delivered</option>
                 <option value="Complete" className="text-black">Complete</option>
                 <option value="Failed" className="text-black">Failed</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-indigo-500 to-purple-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'สร้างงาน' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
