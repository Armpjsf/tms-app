"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ClipboardCheck } from "lucide-react"

export default function MobileVehicleCheckPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
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
    
    setTimeout(() => {
        setLoading(false)
        router.push('/mobile/profile')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="เช็คสภาพรถประจำวัน" showBack />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-4 text-emerald-400">
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
    </div>
  )
}
