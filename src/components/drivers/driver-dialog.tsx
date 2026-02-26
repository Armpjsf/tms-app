"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDriver, updateDriver } from "@/app/drivers/actions"
import { Loader2 } from "lucide-react"
import { Driver } from "@/lib/supabase/drivers"
import { Subcontractor } from "@/types/subcontractor"
import { Branch } from "@/lib/supabase/branches"

type DriverDialogProps = {
  mode?: 'create' | 'edit'
  driver?: Partial<Driver>
  vehicles?: any[]
  subcontractors?: Subcontractor[]
  branches?: Branch[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DriverDialog({
  mode = 'create',
  driver,
  vehicles = [],
  subcontractors = [],
  branches = [],
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
    Active_Status: driver?.Active_Status || 'Active',
    License_Expiry: driver?.License_Expiry || '',
    Sub_ID: driver?.Sub_ID || '',
    Branch_ID: (driver as any)?.Branch_ID || ''
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
            Active_Status: 'Active',
            License_Expiry: '',
            Sub_ID: '',
            Branch_ID: ''
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
          {branches.length > 0 && (
            <div className="space-y-2">
                <Label htmlFor="Branch_ID" className="text-yellow-400">เลือกสาขา (Super Admin)</Label>
                <Select value={formData.Branch_ID || undefined} onValueChange={(val) => setFormData({ ...formData, Branch_ID: val })}>
                    <SelectTrigger className="w-full h-10 border-yellow-500/50 bg-yellow-500/10 text-white">
                        <SelectValue placeholder="-- เลือกสาขา --" />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map((b) => (
                            <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                                {b.Branch_Name} ({b.Branch_ID})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}

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
            <Label htmlFor="License_Expiry">วันหมดอายุใบขับขี่</Label>
             <Input
                id="License_Expiry"
                type="date"
                value={formData.License_Expiry}
                onChange={(e) => setFormData({ ...formData, License_Expiry: e.target.value })}
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
            <Label htmlFor="Sub_ID">สังกัดบริษัทรถร่วม (Subcontractor)</Label>
            <Select value={formData.Sub_ID || "__independent__"} onValueChange={(val) => setFormData({ ...formData, Sub_ID: val === "__independent__" ? "" : val })}>
                <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="อิสระ / รถบริษัท" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__independent__">อิสระ / รถบริษัท (Independent)</SelectItem>
                    {subcontractors.map((s) => (
                        <SelectItem key={s.Sub_ID} value={s.Sub_ID}>{s.Sub_Name} ({s.Sub_ID})</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

        <div className="space-y-2">
            <Label htmlFor="Vehicle_Plate">รถประจำ</Label>
            <Select value={formData.Vehicle_Plate || "__none__"} onValueChange={(val) => setFormData({ ...formData, Vehicle_Plate: val === "__none__" ? "" : val })}>
                <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="ไม่ระบุ / ไม่มีรถประจำ" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none__">ไม่ระบุ / ไม่มีรถประจำ</SelectItem>
                    {vehicles.map((v: any) => (
                        <SelectItem key={v.vehicle_plate} value={v.vehicle_plate}>
                            {v.vehicle_plate} {v.brand ? `(${v.brand})` : ''}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

          {mode === 'edit' && (
             <div className="space-y-2">
              <Label htmlFor="Active_Status">สถานะ</Label>
              <Select value={formData.Active_Status} onValueChange={(val) => setFormData({ ...formData, Active_Status: val })}>
                <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
