"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createRepairTicket, updateRepairTicket } from "@/app/maintenance/actions"
import { Loader2 } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"

type MaintenanceDialogProps = {
  drivers: any[]
  vehicles: any[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialData?: any
}

export function MaintenanceDialog({
  drivers,
  vehicles,
  trigger,
  open,
  onOpenChange,
  initialData
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
    Description: '',
    Priority: 'Medium',
    Photo_Url: '',
    Status: 'Pending',
    Cost_Total: 0,
    Remark: ''
  })

  useEffect(() => {
    if (initialData) {
      let photoUrl = initialData.Photo_Url || '';
      try {
        if (photoUrl.startsWith('[') && photoUrl.endsWith(']')) {
            const parsed = JSON.parse(photoUrl);
            if (Array.isArray(parsed) && parsed.length > 0) {
                photoUrl = parsed[0]
            }
        }
      } catch (e) {}

      setFormData({
        Date_Report: initialData.Date_Report ? new Date(initialData.Date_Report).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        Driver_ID: initialData.Driver_ID || '',
        Vehicle_Plate: initialData.Vehicle_Plate || '',
        Issue_Type: initialData.Issue_Type || 'Engine',
        Description: initialData.Description || '',
        Priority: initialData.Priority || 'Medium',
        Photo_Url: photoUrl,
        Status: initialData.Status || 'Pending',
        Cost_Total: initialData.Cost_Total || 0,
        Remark: initialData.Remark || ''
      })
    }
  }, [initialData, show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        Date_Report: new Date(formData.Date_Report).toISOString()
      }

      if (initialData) {
        await updateRepairTicket(initialData.Ticket_ID, payload)
      } else {
        await createRepairTicket(payload)
      }
      
      setShow(false)
      if (!isControlled && !initialData) {
        setFormData({
            Date_Report: new Date().toISOString().slice(0, 16),
            Driver_ID: '',
            Vehicle_Plate: '',
            Issue_Type: 'Engine',
            Description: '',
            Priority: 'Medium',
            Photo_Url: '',
            Status: 'Pending',
            Cost_Total: 0,
            Remark: ''
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
      <DialogContent className="sm:max-w-[425px] bg-slate-900/95 border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'แก้ไขข้อมูลการซ่อม' : 'แจ้งซ่อมบำรุง'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          <div className="flex justify-center mb-4">
             <ImageUpload 
                value={formData.Photo_Url} 
                onChange={(url) => setFormData({ ...formData, Photo_Url: url })}
             />
          </div>

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
                <Label htmlFor="Driver_ID">ผู้แจ้ง</Label>
                <Select value={formData.Driver_ID || undefined} onValueChange={(val) => setFormData({ ...formData, Driver_ID: val })}>
                    <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
                        <SelectValue placeholder="เลือกคนขับ" />
                    </SelectTrigger>
                    <SelectContent>
                        {drivers.map((d: any) => (
                            <SelectItem key={d.Driver_ID} value={d.Driver_ID}>{d.Driver_Name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="Vehicle_Plate">ทะเบียนรถ</Label>
                <Select value={formData.Vehicle_Plate || undefined} onValueChange={(val) => setFormData({ ...formData, Vehicle_Plate: val })}>
                    <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
                        <SelectValue placeholder="เลือกทะเบียน" />
                    </SelectTrigger>
                    <SelectContent>
                        {vehicles.map((v: any) => (
                            <SelectItem key={v.Vehicle_Plate} value={v.Vehicle_Plate}>{v.Vehicle_Plate}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="Issue_Type">ประเภทปัญหา</Label>
                <Select value={formData.Issue_Type} onValueChange={(val) => setFormData({ ...formData, Issue_Type: val })}>
                    <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
                        <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Engine">เครื่องยนต์</SelectItem>
                        <SelectItem value="Tire">ยาง</SelectItem>
                        <SelectItem value="Battery">แบตเตอรี่</SelectItem>
                        <SelectItem value="Body">ตัวถัง</SelectItem>
                        <SelectItem value="Other">อื่นๆ</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="Priority">ความสำคัญ</Label>
                <Select value={formData.Priority} onValueChange={(val) => setFormData({ ...formData, Priority: val })}>
                    <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
                        <SelectValue placeholder="เลือกระดับ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="Description">รายละเอียดปัญหา</Label>
            <Textarea
              id="Description"
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              placeholder="รายละเอียด..."
              required
              className="bg-white/5 border-white/10"
            />
          </div>

          {initialData && (
             <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="Status">สถานะ</Label>
                        <Select value={formData.Status} onValueChange={(val) => setFormData({ ...formData, Status: val })}>
                            <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
                                <SelectValue placeholder="เลือกสถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pending">รอดำเนินการ</SelectItem>
                                <SelectItem value="In Progress">กำลังซ่อม</SelectItem>
                                <SelectItem value="Completed">เสร็จสิ้น</SelectItem>
                                <SelectItem value="Cancelled">ยกเลิก</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="Cost_Total">ค่าใช้จ่าย</Label>
                         <Input
                            id="Cost_Total"
                            type="number"
                            value={formData.Cost_Total}
                            onChange={(e) => setFormData({ ...formData, Cost_Total: parseFloat(e.target.value) || 0 })}
                            className="bg-white/5 border-white/10"
                         />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="Remark">หมายเหตุ / การแก้ไข</Label>
                    <Textarea
                        id="Remark"
                        value={formData.Remark}
                        onChange={(e) => setFormData({ ...formData, Remark: e.target.value })}
                        placeholder="บันทึกการซ่อม..."
                        className="bg-white/5 border-white/10"
                    />
                </div>
             </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-amber-500 to-orange-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'บันทึกการแก้ไข' : 'แจ้งซ่อม'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
