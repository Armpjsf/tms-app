"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CameraInput } from "@/components/mobile/camera-input"
import { Loader2, Fuel, User } from "lucide-react"
import { createFuelLog } from "@/app/fuel/actions"

interface MobileFuelFormProps {
  driverId: string
  driverName: string
  defaultVehiclePlate?: string
}

export function MobileFuelForm({ driverId, driverName, defaultVehiclePlate }: MobileFuelFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [liters, setLiters] = useState("")
  const [mileage, setMileage] = useState("")
  const [station, setStation] = useState("")
  const [plate, setPlate] = useState(defaultVehiclePlate || "")
  const [photo, setPhoto] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        const formData = {
            Date_Time: new Date().toISOString(),
            Driver_ID: driverId,
            Vehicle_Plate: plate,
            Liter: parseFloat(liters),
            Price: 0, // Calculated or input? Schema has Price/Liter. We have Total Amount & Liters.
            Total_Amount: parseFloat(amount),
            Mileage: parseFloat(mileage),
            Station_Name: station,
            Photo_Url: photo ? "pending_upload" : undefined // We need to handle upload if real
        }

        // Note: Real file upload needs Supabase Storage handling. 
        // For this demo, we might skip the actual file upload or assume it's handled elsewhere
        // But createFuelLog expects Photo_Url string.
        
        const result = await createFuelLog({
            ...formData,
            Price: formData.Total_Amount / formData.Liter
        })

        if (result.success) {
            alert("บันทึกข้อมูลเรียบร้อยแล้ว")
            router.push('/mobile/profile')
        } else {
            alert(`เกิดข้อผิดพลาด: ${result.message}`)
        }
    } catch (error) {
        console.error(error)
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
        setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
    <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 space-y-4">
            
            <div className="space-y-2">
                <Label className="text-white">ชื่อผู้เบิก</Label>
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
                <Input 
                    placeholder="เลขทะเบียนรถ" 
                    className="bg-slate-950 border-slate-700 text-white"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label className="text-white">ยอดเงิน (บาท)</Label>
                <div className="relative">
                    <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="bg-slate-950 border-slate-700 pl-10 text-white"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-white">จำนวนลิตร</Label>
                <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="bg-slate-950 border-slate-700 text-white"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label className="text-white">เลขไมล์</Label>
                <Input 
                    type="number" 
                    placeholder="เลขไมล์ปัจจุบัน" 
                    className="bg-slate-950 border-slate-700 text-white"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label className="text-white">ชื่อปั๊มน้ำมัน</Label>
                <Input 
                    placeholder="เช่น ปตท. สาขา..." 
                    className="bg-slate-950 border-slate-700 text-white"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label className="text-white">รูปใบเสร็จ / หน้าตู้</Label>
                <CameraInput onImagesChange={(files) => setPhoto(files[0] || null)} maxImages={1} />
            </div>
        </CardContent>
    </Card>

    <Button 
        type="submit" 
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
        disabled={loading}
    >
        {loading ? <Loader2 className="animate-spin" /> : "บันทึกข้อมูล"}
    </Button>
  </form>
  )
}
