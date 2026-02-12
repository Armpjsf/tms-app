"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createDriver, updateDriver } from "@/app/drivers/actions"
import { Loader2 } from "lucide-react"
import { Driver } from "@/lib/supabase/drivers"

type DriverDialogProps = {
  mode?: 'create' | 'edit'
  driver?: Partial<Driver>
  vehicles?: any[] // Optional: for selecting assigned vehicle
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DriverDialog({
  mode = 'create',
  driver,
  vehicles = [],
  trigger,
  open,
  onOpenChange
}: DriverDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const show = isControlled ? open : internalOpen
  const setShow = isControlled ? onOpenChange! : setInternalOpen

  const [formData, setFormData] = useState({
    Driver_ID: driver?.Driver_ID || '',
    Driver_Name: driver?.Driver_Name || '',
    Mobile_No: driver?.Mobile_No || '',
    Password: driver?.Password || '',
    Vehicle_Plate: driver?.Vehicle_Plate || '',
    Active_Status: 'Active' // default
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result;
      if (mode === 'create') {
        // @ts-ignore
        result = await createDriver(formData)
      } else {
        // @ts-ignore
        result = await updateDriver(driver.Driver_ID, formData)
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Operation failed')
      }

      setShow(false)
      if (!isControlled) {
        setFormData({
            Driver_ID: '',
            Driver_Name: '',
            Mobile_No: '',
            Password: '',
            Vehicle_Plate: '',
            Active_Status: 'Active'
        })
      }
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px] bg-slate-900/95 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'เพิ่มคนขับ' : 'แก้ไขข้อมูลคนขับ'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="Driver_ID">รหัสพนักงาน (ID)</Label>
            <Input
              id="Driver_ID"
              value={formData.Driver_ID}
              onChange={(e) => setFormData({ ...formData, Driver_ID: e.target.value })}
              placeholder="DRV-001"
              required
              disabled={mode === 'edit'}
              className="bg-white/5 border-white/10"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="Driver_Name">ชื่อ-นามสกุล</Label>
            <Input
              id="Driver_Name"
              value={formData.Driver_Name}
              onChange={(e) => setFormData({ ...formData, Driver_Name: e.target.value })}
              placeholder="นาย ขับรถ ดี"
              required
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Mobile_No">เบอร์โทรศัพท์</Label>
            <Input
              id="Mobile_No"
              value={formData.Mobile_No}
              onChange={(e) => setFormData({ ...formData, Mobile_No: e.target.value })}
              placeholder="081-234-5678"
              required
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Password">รหัสผ่าน (สำหรับเข้าสู่ระบบ)</Label>
            <Input
              id="Password"
              type="text"
              value={formData.Password}
              onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
              placeholder="ตั้งรหัสผ่าน"
              required={mode === 'create'}
              className="bg-white/5 border-white/10"
            />
          </div>

        <div className="space-y-2">
            <Label htmlFor="Vehicle_Plate">รถประจำ</Label>
            <select
                id="Vehicle_Plate"
                value={formData.Vehicle_Plate}
                onChange={(e) => setFormData({ ...formData, Vehicle_Plate: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="" className="bg-slate-900">ไม่ระบุ / ไม่มีรถประจำ</option>
                {vehicles.map((v) => (
                    <option key={v.vehicle_plate} value={v.vehicle_plate} className="bg-slate-900">
                      {v.vehicle_plate} {v.brand ? `(${v.brand})` : ''}
                    </option>
                ))}
            </select>
        </div>

          {mode === 'edit' && (
             <div className="space-y-2">
              <Label htmlFor="Active_Status">สถานะ</Label>
              <select
                id="Active_Status"
                value={formData.Active_Status}
                onChange={(e) => setFormData({ ...formData, Active_Status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                 <option value="Active" className="text-black">Active</option>
                 <option value="Inactive" className="text-black">Inactive</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'เพิ่มคนขับ' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
