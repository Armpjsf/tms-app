"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createVehicle, updateVehicle } from "@/app/vehicles/actions"
import { Loader2 } from "lucide-react"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Branch } from "@/lib/supabase/branches"
import { getVehicleTypes, VehicleType } from "@/lib/actions/vehicle-type-actions"
import { useEffect } from "react"

type VehicleDialogProps = {
  mode?: 'create' | 'edit'
  vehicle?: Partial<Vehicle>
  branches?: Branch[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VehicleDialog({
  mode = 'create',
  vehicle,
  branches = [],
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
    Branch_ID: vehicle?.branch_id || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'create') {
        // @ts-ignore
        await createVehicle(formData)
      } else {
        // @ts-ignore
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
            Branch_ID: ''
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
                <select
                    id="Branch_ID"
                    value={formData.Branch_ID}
                    onChange={(e) => setFormData({ ...formData, Branch_ID: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required={mode === 'create'}
                >
                    <option value="" className="bg-slate-900">-- เลือกสาขา --</option>
                    {branches.map((b) => (
                        <option key={b.Branch_ID} value={b.Branch_ID} className="bg-slate-900">
                        {b.Branch_Name} ({b.Branch_ID})
                        </option>
                    ))}
                </select>
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





          <div className="space-y-2">
            <Label htmlFor="vehicle_type">ประเภทรถ</Label>
            <select
                id="vehicle_type"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
                {vehicleTypes.length > 0 ? (
                    vehicleTypes.map((type) => (
                        <option key={type.type_id} value={type.type_name} className="bg-slate-900">
                            {type.type_name} {type.description ? `(${type.description})` : ''}
                        </option>
                    ))
                ) : (
                    <>
                        <option value="4-Wheel" className="bg-slate-900">4 ล้อ (4-Wheel)</option>
                        <option value="6-Wheel" className="bg-slate-900">6 ล้อ (6-Wheel)</option>
                        <option value="10-Wheel" className="bg-slate-900">10 ล้อ (10-Wheel)</option>
                    </>
                )}
            </select>
          </div>

          {mode === 'edit' && (
             <div className="space-y-2">
              <Label htmlFor="active_status">สถานะ</Label>
              <select
                id="active_status"
                value={formData.active_status}
                onChange={(e) => setFormData({ ...formData, active_status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                 <option value="Active" className="text-black">Active (พร้อมใช้)</option>
                 <option value="Maintenance" className="text-black">Maintenance (ซ่อมบำรุง)</option>
                 <option value="Inactive" className="text-black">Inactive (เลิกใช้)</option>
              </select>
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
