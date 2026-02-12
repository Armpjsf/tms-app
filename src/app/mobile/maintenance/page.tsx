"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { CameraInput } from "@/components/mobile/camera-input"
import { Loader2, Wrench, Calendar } from "lucide-react"

export default function MobileMaintenancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
        setLoading(false)
        router.push('/mobile/profile')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="แจ้งซ่อมบำรุง" showBack />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                    <Label className="text-white">หัวข้อการซ่อม</Label>
                    <div className="relative">
                        <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <Input 
                            placeholder="เช่น เบรคมีเสียงดัง, แอร์ไม่เย็น" 
                            className="bg-slate-950 border-slate-700 pl-10 text-white"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-white">รายละเอียดเพิ่มเติม</Label>
                    <Textarea 
                        placeholder="อธิบายอาการเสีย..." 
                        className="bg-slate-950 border-slate-700 text-white min-h-[100px]"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-white">รูปถ่ายอาการเสีย</Label>
                    <CameraInput onImageCapture={setPhoto} />
                </div>
            </CardContent>
        </Card>

        <Button 
            type="submit" 
            className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold"
            disabled={loading}
        >
            {loading ? <Loader2 className="animate-spin" /> : "ส่งแจ้งซ่อม"}
        </Button>
      </form>
    </div>
  )
}
