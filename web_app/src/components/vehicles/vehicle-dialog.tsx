"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createVehicle, updateVehicle } from "@/app/vehicles/actions"
import { Loader2 } from "lucide-react"

type VehicleDialogProps = {
  mode?: 'create' | 'edit'
  vehicle?: any
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VehicleDialog({
  mode = 'create',
  vehicle,
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

  const [formData, setFormData] = useState({
    Vehicle_Plate: vehicle?.Vehicle_Plate || '',
    Vehicle_Type: vehicle?.Vehicle_Type || '4W',
    Brand: vehicle?.Brand || '',
    Model: vehicle?.Model || '',
    Active_Status: vehicle?.Active_Status || 'Active'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'create') {
        await createVehicle(formData)
      } else {
        await updateVehicle(vehicle.Vehicle_Plate, formData)
      }
      setShow(false)
      if (!isControlled) {
        setFormData({
            Vehicle_Plate: '',
            Vehicle_Type: '4W',
            Brand: '',
            Model: '',
            Active_Status: 'Active'
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
          <div className="space-y-2">
            <Label htmlFor="Vehicle_Plate">ทะเบียนรถ</Label>
            <Input
              id="Vehicle_Plate"
              value={formData.Vehicle_Plate}
              onChange={(e) => setFormData({ ...formData, Vehicle_Plate: e.target.value })}
              placeholder="70-1234"
              required
              disabled={mode === 'edit'}
              className="bg-white/5 border-white/10"
            />
          </div>
          
           <div className="space-y-2">
              <Label htmlFor="Vehicle_Type">ประเภทรถ</Label>
              <select
                id="Vehicle_Type"
                value={formData.Vehicle_Type}
                onChange={(e) => setFormData({ ...formData, Vehicle_Type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                 <option value="4W" className="text-black">4 ล้อ</option>
                 <option value="6W" className="text-black">6 ล้อ</option>
                 <option value="10W" className="text-black">10 ล้อ</option>
              </select>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="Brand">ยี่ห้อ</Label>
                <Input
                id="Brand"
                value={formData.Brand}
                onChange={(e) => setFormData({ ...formData, Brand: e.target.value })}
                placeholder="Isuzu"
                className="bg-white/5 border-white/10"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="Model">รุ่น</Label>
                <Input
                id="Model"
                value={formData.Model}
                onChange={(e) => setFormData({ ...formData, Model: e.target.value })}
                placeholder="FTR"
                className="bg-white/5 border-white/10"
                />
            </div>
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
                 <option value="Maintenance" className="text-black">Maintenance</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-purple-500 to-indigo-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'เพิ่มรถ' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
