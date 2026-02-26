"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
    vehicle_plate: vehicle?.vehicle_plate || '',
    vehicle_type: vehicle?.vehicle_type || '4-Wheel',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    active_status: vehicle?.active_status || 'Active',
    current_mileage: vehicle?.current_mileage || 0,
    next_service_mileage: vehicle?.next_service_mileage || 0,
    branch_id: vehicle?.branch_id || '',
    sub_id: vehicle?.sub_id || '',
    max_weight_kg: vehicle?.max_weight_kg || 0,
    max_volume_cbm: vehicle?.max_volume_cbm || 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'create') {
        await createVehicle(formData)
      } else {
        if (!vehicle?.vehicle_plate) throw new Error("Vehicle Plate not found")
        await updateVehicle(vehicle.vehicle_plate, formData)
      }
      setShow(false)
      if (!isControlled) {
        setFormData({
            vehicle_plate: '',
            vehicle_type: '4-Wheel',
            brand: '',
            model: '',
            active_status: 'Active',
            current_mileage: 0,
            next_service_mileage: 0,

            branch_id: '',
            sub_id: '',
            max_weight_kg: 0,
            max_volume_cbm: 0
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
          <DialogTitle>{mode === 'create' ? 'เพิ่มรถใหม่' : 'แก้ไขข้อมูลรถ'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {branches.length > 0 && (
            <div className="space-y-2">
                <Label htmlFor="Branch_ID" className="text-yellow-400">เลือกสาขา (Super Admin)</Label>
                <Select value={formData.branch_id || undefined} onValueChange={(val) => setFormData({ ...formData, branch_id: val })}>
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

          {subcontractors && subcontractors.length > 0 && (
            <div className="space-y-2">
                <Label htmlFor="sub_id" className="text-blue-400">รถร่วมบริการ (Subcontractor)</Label>
                <Select value={formData.sub_id || "__company__"} onValueChange={(val) => setFormData({ ...formData, sub_id: val === "__company__" ? "" : val })}>
                    <SelectTrigger className="w-full h-10 border-blue-500/50 bg-blue-500/10 text-white">
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
            <Label htmlFor="vehicle_plate">ทะเบียนรถ</Label>
            <Input
              id="vehicle_plate"
              value={formData.vehicle_plate}
              onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
              placeholder="1กข-1234"
              required
              disabled={mode === 'edit'}
              className="bg-white/5 border-white/10"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="brand">ยี่ห้อ</Label>
                <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Toyota"
                className="bg-white/5 border-white/10"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="model">รุ่น</Label>
                <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Hilux Revo"
                className="bg-white/5 border-white/10"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="current_mileage">เลขไมล์ปัจจุบัน</Label>
                <Input
                id="current_mileage"
                type="number"
                value={formData.current_mileage}
                onChange={(e) => setFormData({ ...formData, current_mileage: Number(e.target.value) })}
                className="bg-white/5 border-white/10"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="next_service_mileage">แจ้งซ่อมครั้งถัดไป</Label>
                <Input
                id="next_service_mileage"
                type="number"
                value={formData.next_service_mileage}
                onChange={(e) => setFormData({ ...formData, next_service_mileage: Number(e.target.value) })}
                className="bg-white/5 border-white/10"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
             <div className="space-y-2">
                <Label htmlFor="max_weight_kg" className="text-emerald-400">น้ำหนักบรรทุกสูงสุด (kg)</Label>
                <Input
                id="max_weight_kg"
                type="number"
                value={formData.max_weight_kg}
                onChange={(e) => setFormData({ ...formData, max_weight_kg: Number(e.target.value) })}
                placeholder="e.g. 1500"
                className="bg-white/5 border-emerald-500/30 text-emerald-100"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="max_volume_cbm" className="text-emerald-400">ปริมาตรบรรทุกสูงสุด (CBM)</Label>
                <Input
                id="max_volume_cbm"
                type="number"
                value={formData.max_volume_cbm}
                onChange={(e) => setFormData({ ...formData, max_volume_cbm: Number(e.target.value) })}
                placeholder="e.g. 2.5"
                step="0.1"
                className="bg-white/5 border-emerald-500/30 text-emerald-100"
                />
            </div>
          </div>





          <div className="space-y-2">
            <Label htmlFor="vehicle_type">ประเภทรถ</Label>
            <Select value={formData.vehicle_type} onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}>
                <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
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
              <Label htmlFor="active_status">สถานะ</Label>
              <Select value={formData.active_status} onValueChange={(val) => setFormData({ ...formData, active_status: val })}>
                <SelectTrigger className="w-full h-10 border-white/10 bg-white/5 text-white">
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
