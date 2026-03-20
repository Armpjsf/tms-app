"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDriver, updateDriver, type DriverFormData } from "@/app/drivers/actions"
import { Loader2 } from "lucide-react"
import { Driver } from "@/lib/supabase/drivers"
import { Subcontractor } from "@/types/subcontractor"
import { Branch } from "@/lib/supabase/branches"
import { BANKS } from "@/lib/constants/banks"

type DriverDialogProps = {
  mode?: 'create' | 'edit'
  driver?: Partial<Driver>
  vehicles?: { Vehicle_Plate: string; Brand?: string | null }[]
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
    Expire_Date: driver?.Expire_Date || '',
    Sub_ID: driver?.Sub_ID || '',
    Branch_ID: (driver as { Branch_ID?: string })?.Branch_ID || '',
    Bank_Name: driver?.Bank_Name || '',
    Bank_Account_No: driver?.Bank_Account_No || '',
    Bank_Account_Name: driver?.Bank_Account_Name || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result;
      if (mode === 'create') {
        result = await createDriver(formData as unknown as DriverFormData)
      } else if (driver?.Driver_ID) {
        result = await updateDriver(driver.Driver_ID, formData as unknown as DriverFormData)
      } else {
        throw new Error('Driver ID is missing')
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
            Expire_Date: '',
            Sub_ID: '',
            Branch_ID: '',
            Bank_Name: '',
            Bank_Account_No: '',
            Bank_Account_Name: ''
        })
      }
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px] bg-white border-gray-200 text-gray-900">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'เพิ่มคนขับ' : 'แก้ไขข้อมูลคนขับ'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {branches.length > 0 && (
            <div className="space-y-2">
                <Label htmlFor="Branch_ID" className="text-amber-600 font-bold">เลือกสาขา (Super Admin)</Label>
                <Select value={formData.Branch_ID || undefined} onValueChange={(val) => setFormData({ ...formData, Branch_ID: val })}>
                    <SelectTrigger className="w-full h-10 border-amber-200 bg-amber-50 text-gray-900">
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
              className="bg-gray-50 border-gray-200 text-gray-900"
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
              className="bg-gray-50 border-gray-200 text-gray-900"
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
              className="bg-gray-50 border-gray-200 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Expire_Date">วันหมดอายุใบขับขี่</Label>
             <Input
                id="Expire_Date"
                type="date"
                value={formData.Expire_Date}
                onChange={(e) => setFormData({ ...formData, Expire_Date: e.target.value })}
                className="bg-gray-50 border-gray-200 text-gray-900"
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
              className="bg-gray-50 border-gray-200 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Sub_ID">สังกัดบริษัทรถร่วม (Subcontractor)</Label>
            <Select value={formData.Sub_ID || "__independent__"} onValueChange={(val) => setFormData({ ...formData, Sub_ID: val === "__independent__" ? "" : val })}>
                <SelectTrigger className="w-full h-10 border-gray-200 bg-gray-50 text-gray-900">
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
                <SelectTrigger className="w-full h-10 border-gray-200 bg-gray-50 text-gray-900">
                    <SelectValue placeholder="ไม่ระบุ / ไม่มีรถประจำ" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none__">ไม่ระบุ / ไม่มีรถประจำ</SelectItem>
                    {vehicles.map((v) => (
                        <SelectItem key={v.Vehicle_Plate} value={v.Vehicle_Plate}>
                            {v.Vehicle_Plate} {v.Brand ? `(${v.Brand})` : ''}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* Bank Information Section */}
        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-4">
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest">ข้อมูลบัญชีธนาคาร (Payment Details)</h3>
            
            <div className="space-y-2">
                <Label htmlFor="Bank_Name">เลือกธนาคาร</Label>
                <Select value={formData.Bank_Name || "__none__"} onValueChange={(val) => setFormData({ ...formData, Bank_Name: val === "__none__" ? "" : val })}>
                    <SelectTrigger className="w-full h-10 border-emerald-200 bg-white text-gray-900">
                        <SelectValue placeholder="-- เลือกธนาคาร --" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                        {BANKS.map((b) => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="Bank_Account_No">เลขที่บัญชี</Label>
                    <Input
                        id="Bank_Account_No"
                        value={formData.Bank_Account_No}
                        onChange={(e) => setFormData({ ...formData, Bank_Account_No: e.target.value })}
                        placeholder="000-0-00000-0"
                        className="bg-white border-emerald-100 text-gray-900"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="Bank_Account_Name">ชื่อบัญชี</Label>
                    <Input
                        id="Bank_Account_Name"
                        value={formData.Bank_Account_Name}
                        onChange={(e) => setFormData({ ...formData, Bank_Account_Name: e.target.value })}
                        placeholder="ชื่อ-นามสกุล"
                        className="bg-white border-emerald-100 text-gray-900"
                    />
                </div>
            </div>
        </div>

          {mode === 'edit' && (
             <div className="space-y-2">
              <Label htmlFor="Active_Status">สถานะ</Label>
              <Select value={formData.Active_Status} onValueChange={(val) => setFormData({ ...formData, Active_Status: val })}>
                <SelectTrigger className="w-full h-10 border-gray-200 bg-gray-50 text-gray-900">
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
