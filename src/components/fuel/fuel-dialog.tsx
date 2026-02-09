"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFuelLog } from "@/app/fuel/actions"
import { Loader2 } from "lucide-react"

type FuelDialogProps = {
  drivers: any[]
  vehicles: any[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function FuelDialog({
  drivers,
  vehicles,
  trigger,
  open,
  onOpenChange
}: FuelDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const show = isControlled ? open : internalOpen
  const setShow = isControlled ? onOpenChange! : setInternalOpen

  const [formData, setFormData] = useState({
    Date_Time: new Date().toISOString().slice(0, 16),
    Driver_ID: '',
    Vehicle_Plate: '',
    Fuel_Type: 'Diesel',
    Liter: '',
    Price: '',
    Total_Amount: 0,
    Mileage: ''
  })

  // Auto calculate total
  useEffect(() => {
    const liter = parseFloat(formData.Liter) || 0
    const price = parseFloat(formData.Price) || 0
    setFormData(prev => ({ ...prev, Total_Amount: liter * price }))
  }, [formData.Liter, formData.Price])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createFuelLog({
        ...formData,
        Liter: parseFloat(formData.Liter),
        Price: parseFloat(formData.Price),
        Mileage: parseInt(formData.Mileage),
        Date_Time: new Date(formData.Date_Time).toISOString()
      })
      
      setShow(false)
      if (!isControlled) {
        setFormData({
            Date_Time: new Date().toISOString().slice(0, 16),
            Driver_ID: '',
            Vehicle_Plate: '',
            Fuel_Type: 'Diesel',
            Liter: '',
            Price: '',
            Total_Amount: 0,
            Mileage: ''
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
          <DialogTitle>บันทึกการเติมน้ำมัน</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="Date_Time">วัน-เวลา</Label>
            <Input
              id="Date_Time"
              type="datetime-local"
              value={formData.Date_Time}
              onChange={(e) => setFormData({ ...formData, Date_Time: e.target.value })}
              required
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

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="Fuel_Type">ประเภท</Label>
                <select
                    id="Fuel_Type"
                    value={formData.Fuel_Type}
                    onChange={(e) => setFormData({ ...formData, Fuel_Type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="Diesel" className="bg-slate-900">Diesel</option>
                    <option value="Gasohol 95" className="bg-slate-900">Gasohol 95</option>
                    <option value="NGV" className="bg-slate-900">NGV</option>
                </select>
            </div>
            <div className="space-y-2">
                 <Label htmlFor="Mileage">เลขไมล์</Label>
                 <Input
                    id="Mileage"
                    type="number"
                    value={formData.Mileage}
                    onChange={(e) => setFormData({ ...formData, Mileage: e.target.value })}
                    placeholder="km"
                    required
                    className="bg-white/5 border-white/10"
                 />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor="Liter">จำนวน (ลิตร)</Label>
                <Input
                id="Liter"
                type="number"
                step="0.01"
                value={formData.Liter}
                onChange={(e) => setFormData({ ...formData, Liter: e.target.value })}
                required
                className="bg-white/5 border-white/10"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="Price">ราคา/ลิตร</Label>
                <Input
                id="Price"
                type="number"
                step="0.01"
                value={formData.Price}
                onChange={(e) => setFormData({ ...formData, Price: e.target.value })}
                required
                className="bg-white/5 border-white/10"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="Total_Amount">รวมเงิน</Label>
                <Input
                id="Total_Amount"
                value={formData.Total_Amount.toFixed(2)}
                readOnly
                className="bg-white/5 border-white/10 text-emerald-400 font-bold"
                />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-emerald-500 to-teal-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
