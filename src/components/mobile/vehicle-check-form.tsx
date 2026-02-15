"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ClipboardCheck, User, Truck } from "lucide-react"

import { submitVehicleCheck } from "@/app/mobile/actions"

interface MobileVehicleCheckFormProps {
    driverId: string
    driverName: string
    defaultVehiclePlate?: string
}

export function MobileVehicleCheckForm({ driverId, driverName, defaultVehiclePlate }: MobileVehicleCheckFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [plate, setPlate] = useState(defaultVehiclePlate || "")
  
  const checklist = [
    "น้ำมันเครื่อง", "น้ำในหม้อน้ำ", "ลมยาง", "ไฟเบรค/ไฟเลี้ยว", 
    "สภาพยางรถยนต์", "อุปกรณ์ฉุกเฉิน", "เอกสารประจำรถ"
  ]
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const handleToggle = (item: string) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
        const result = await submitVehicleCheck({ 
            driverId,
            driverName,
            vehiclePlate: plate,
            items: checkedItems 
        })
        if (result.success) {
             // alert("บันทึกการตรวจสอบเรียบร้อยแล้ว")
             router.push('/mobile/profile')
        }
    } catch {} finally {
        setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-4">
                
                {/* Driver Info - Read Only */}
                <div className="space-y-2">
                    <Label className="text-white">ชื่อผู้ตรวจสอบ</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <Input 
                            value={driverName} 
                            disabled 
                            className="bg-slate-800 border-slate-700 pl-10 text-slate-300" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-white">ทะเบียนรถ</Label>
                    <div className="relative">
                         <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <Input 
                            placeholder="เลขทะเบียนรถ" 
                            className="bg-slate-950 border-slate-700 pl-10 text-white"
                            value={plate}
                            onChange={(e) => setPlate(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-2 mt-4 text-emerald-400">
                    <ClipboardCheck size={20} />
                    <span className="font-semibold">รายการตรวจสอบ</span>
                </div>
                
                {checklist.map((item) => (
                    <div key={item} className="flex items-center space-x-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <Checkbox 
                            id={item} 
                            checked={checkedItems[item] || false}
                            onCheckedChange={() => handleToggle(item)}
                            className="border-slate-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <Label 
                            htmlFor={item} 
                            className="text-white cursor-pointer flex-1"
                        >
                            {item}
                        </Label>
                    </div>
                ))}
            </CardContent>
        </Card>

        <Button 
            type="submit" 
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            disabled={loading}
        >
            {loading ? <Loader2 className="animate-spin" /> : "บันทึกการตรวจสอบ"}
        </Button>
      </form>
  )
}
