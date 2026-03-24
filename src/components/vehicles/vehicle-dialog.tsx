"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createVehicle, updateVehicle } from "@/app/vehicles/actions"
import { Loader2 } from "lucide-react"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Branch } from "@/lib/supabase/branches"
import { Subcontractor } from "@/types/subcontractor" // Ensure this type exists or is imported correctly
import { getVehicleTypes, VehicleType } from "@/lib/actions/vehicle-type-actions"
import { useEffect } from "react"

type VehicleDialogProps = {
  mode?: 'create' | 'edit'
  vehicle?: Partial<Vehicle>
  branches?: Branch[]
  subcontractors?: Subcontractor[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VehicleDialog({
  mode = 'create',
  vehicle,
  branches = [],
  subcontractors = [],
  trigger,
  open,
  onOpenChange
}: VehicleDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const show = isControlled ? open : internalOpen
  const setShow = isControlled ? onOpenChange! : setInternalOpen

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])

  useEffect(() => {
    const fetchTypes = async () => {
        const types = await getVehicleTypes()
        setVehicleTypes(types)
    }
    fetchTypes()
  }, [])

  const [formData, setFormData] = useState({
    Vehicle_Plate: vehicle?.Vehicle_Plate || '',
    Vehicle_Type: vehicle?.Vehicle_Type || '4-Wheel',
    Brand: vehicle?.Brand || '',
    Model: vehicle?.Model || '',
    Active_Status: vehicle?.Active_Status || 'Active',
    Current_Mileage: vehicle?.Current_Mileage || 0,
    Next_Service_Mileage: vehicle?.Next_Service_Mileage || 0,
    Branch_ID: vehicle?.Branch_ID || '',
    Sub_ID: vehicle?.Sub_ID || '',
    Max_Weight_kg: vehicle?.Max_Weight_kg || 0,
    Max_Volume_cbm: vehicle?.Max_Volume_cbm || 0,
    Tax_Expiry: vehicle?.Tax_Expiry || '',
    Insurance_Expiry: vehicle?.Insurance_Expiry || '',
    Act_Expiry: vehicle?.Act_Expiry || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'create') {
        await createVehicle(formData)
      } else {
        if (!vehicle?.Vehicle_Plate) throw new Error("Vehicle Plate not found")
        await updateVehicle(vehicle.Vehicle_Plate, formData)
      }
      setShow(false)
      if (!isControlled) {
        setFormData({
            Vehicle_Plate: '',
            Vehicle_Type: '4-Wheel',
            Brand: '',
            Model: '',
            Active_Status: 'Active',
            Current_Mileage: 0,
            Next_Service_Mileage: 0,

            Branch_ID: '',
            Sub_ID: '',
            Max_Weight_kg: 0,
            Max_Volume_cbm: 0,
            Tax_Expiry: '',
            Insurance_Expiry: '',
            Act_Expiry: ''
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
          <DialogTitle>{mode === 'create' ? 'เพิ่มรถใหม่' : 'แก้ไขข้อมูลรถ'}</DialogTitle>
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

          {subcontractors && subcontractors.length > 0 && (
            <div className="space-y-2">
                <Label htmlFor="Sub_ID" className="text-blue-700 font-bold">รถร่วมบริการ (Subcontractor)</Label>
                <Select value={formData.Sub_ID || "__company__"} onValueChange={(val) => setFormData({ ...formData, Sub_ID: val === "__company__" ? "" : val })}>
                    <SelectTrigger className="w-full h-10 border-blue-200 bg-blue-50 text-gray-900">
                        <SelectValue placeholder="-- รถบริษัท (Company Fleet) --" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__company__">-- รถบริษัท (Company Fleet) --</SelectItem>
                        {subcontractors.map((s) => (
                            <SelectItem key={s.Sub_ID} value={s.Sub_ID}>{s.Sub_Name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="Vehicle_Plate" className="text-gray-900 font-bold text-xl">ทะเบียนรถ</Label>
            <Input
              id="Vehicle_Plate"
              value={formData.Vehicle_Plate}
              onChange={(e) => setFormData({ ...formData, Vehicle_Plate: e.target.value })}
              placeholder="1กข-1234"
              required
              disabled={mode === 'edit'}
              className="bg-gray-50 border-gray-200 text-gray-900"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="Brand" className="text-gray-900 font-bold text-xl">ยี่ห้อ</Label>
                <Input
                id="Brand"
                value={formData.Brand}
                onChange={(e) => setFormData({ ...formData, Brand: e.target.value })}
                placeholder="Toyota"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="Model" className="text-gray-900 font-bold text-xl">รุ่น</Label>
                <Input
                id="Model"
                value={formData.Model}
                onChange={(e) => setFormData({ ...formData, Model: e.target.value })}
                placeholder="Hilux Revo"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="Current_Mileage" className="text-gray-900 font-bold text-xl">เลขไมล์ปัจจุบัน</Label>
                <Input
                id="Current_Mileage"
                type="number"
                value={formData.Current_Mileage}
                onChange={(e) => setFormData({ ...formData, Current_Mileage: Number(e.target.value) })}
                className="bg-gray-50 border-gray-200 text-gray-900"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="Next_Service_Mileage" className="text-gray-900 font-bold text-xl">แจ้งซ่อมครั้งถัดไป</Label>
                <Input
                id="Next_Service_Mileage"
                type="number"
                value={formData.Next_Service_Mileage}
                onChange={(e) => setFormData({ ...formData, Next_Service_Mileage: Number(e.target.value) })}
                className="bg-gray-50 border-gray-200 text-gray-900"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
             <div className="space-y-2">
                <Label htmlFor="Max_Weight_kg" className="text-emerald-700 font-bold text-xl">น้ำหนักบรรทุกสูงสุด (kg)</Label>
                <Input
                id="Max_Weight_kg"
                type="number"
                value={formData.Max_Weight_kg}
                onChange={(e) => setFormData({ ...formData, Max_Weight_kg: Number(e.target.value) })}
                placeholder="e.g. 1500"
                className="bg-emerald-50 border-emerald-200 text-emerald-900 placeholder:text-emerald-300"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="Max_Volume_cbm" className="text-emerald-700 font-bold text-xl">ปริมาตรบรรทุกสูงสุด (CBM)</Label>
                <Input
                id="Max_Volume_cbm"
                type="number"
                value={formData.Max_Volume_cbm}
                onChange={(e) => setFormData({ ...formData, Max_Volume_cbm: Number(e.target.value) })}
                placeholder="e.g. 2.5"
                step="0.1"
                className="bg-emerald-50 border-emerald-200 text-emerald-900 placeholder:text-emerald-300"
                />
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4">
            <Label className="text-blue-700 font-black block mb-1 uppercase tracking-tight text-xl">เอกสารสำคัญ (Compliance)</Label>
            
            <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="Tax_Expiry" className="text-base font-bold font-bold text-gray-700">ภาษีรถ (Tax Expiry)</Label>
                    <Input
                        id="Tax_Expiry"
                        type="date"
                        value={formData.Tax_Expiry}
                        onChange={(e) => setFormData({ ...formData, Tax_Expiry: e.target.value })}
                        className="bg-gray-50 border-gray-200 h-9 text-lg font-bold text-gray-900 font-medium"
                    />
                </div>
                
                <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="Insurance_Expiry" className="text-base font-bold font-bold text-gray-700">ประกันภัย (Insurance)</Label>
                    <Input
                        id="Insurance_Expiry"
                        type="date"
                        value={formData.Insurance_Expiry}
                        onChange={(e) => setFormData({ ...formData, Insurance_Expiry: e.target.value })}
                        className="bg-gray-50 border-gray-200 h-9 text-lg font-bold text-gray-900 font-medium"
                    />
                </div>

                <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="Act_Expiry" className="text-base font-bold font-bold text-gray-700">พ.ร.บ. (ACT Expiry)</Label>
                    <Input
                        id="Act_Expiry"
                        type="date"
                        value={formData.Act_Expiry}
                        onChange={(e) => setFormData({ ...formData, Act_Expiry: e.target.value })}
                        className="bg-gray-50 border-gray-200 h-9 text-lg font-bold text-gray-900 font-medium"
                    />
                </div>
            </div>
          </div>





          <div className="space-y-2">
            <Label htmlFor="Vehicle_Type" className="text-gray-900 font-bold text-xl">ประเภทรถ</Label>
            <Select value={formData.Vehicle_Type} onValueChange={(val) => setFormData({ ...formData, Vehicle_Type: val })}>
                <SelectTrigger className="w-full h-10 border-gray-200 bg-gray-50 text-gray-900">
                    <SelectValue placeholder="เลือกประเภทรถ" />
                </SelectTrigger>
                <SelectContent>
                    {vehicleTypes.length > 0 ? (
                        vehicleTypes.map((type) => (
                            <SelectItem key={type.type_id} value={type.type_name}>
                                {type.type_name} {type.description ? `(${type.description})` : ''}
                            </SelectItem>
                        ))
                    ) : (
                        <>
                            <SelectItem value="4-Wheel">4 ล้อ (4-Wheel)</SelectItem>
                            <SelectItem value="6-Wheel">6 ล้อ (6-Wheel)</SelectItem>
                            <SelectItem value="10-Wheel">10 ล้อ (10-Wheel)</SelectItem>
                        </>
                    )}
                </SelectContent>
            </Select>
          </div>

          {mode === 'edit' && (
             <div className="space-y-2">
              <Label htmlFor="Active_Status" className="text-gray-900 font-bold text-xl">สถานะ</Label>
              <Select value={formData.Active_Status} onValueChange={(val) => setFormData({ ...formData, Active_Status: val })}>
                <SelectTrigger className="w-full h-10 border-gray-200 bg-gray-50 text-gray-900">
                    <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Active">Active (พร้อมใช้)</SelectItem>
                    <SelectItem value="Maintenance">Maintenance (ซ่อมบำรุง)</SelectItem>
                    <SelectItem value="Inactive">Inactive (เลิกใช้)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-purple-500 to-pink-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'เพิ่มรถใหม่' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

