"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CameraInput } from "@/components/mobile/camera-input"
import { Loader2, Fuel } from "lucide-react"

export default function MobileFuelPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [liters, setLiters] = useState("")
  const [mileage, setMileage] = useState("")
  const [station, setStation] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // TODO: Connect to Server Action
    // await createFuelLog(...)
    
    setTimeout(() => {
        setLoading(false)
        router.push('/mobile/profile')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="แจ้งเติมน้ำมัน" showBack />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-4">
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
                    <CameraInput onImageCapture={setPhoto} />
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
    </div>
  )
}
