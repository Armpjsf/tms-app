"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { CameraInput } from "@/components/mobile/camera-input"
import { submitJobPickup } from "@/lib/actions/pod-actions"
import { Loader2, Box } from "lucide-react"

export default function JobPickupPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (photos.length === 0) return

    setLoading(true)
    const formData = new FormData()
    
    photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, photo)
    })
    formData.append("photo_count", photos.length.toString())
    
    const result = await submitJobPickup(params.id, formData)
    
    if (result.success) {
      router.push("/mobile/dashboard")
    } else {
      alert(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="รับสินค้า (Pickup)" showBack />

      <div className="space-y-6">
        <section className="space-y-4">
             <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <Box size={20} />
                </div>
                <div>
                    <h2 className="font-bold">ยืนยันการรับสินค้า</h2>
                    <p className="text-sm text-slate-400">ถ่ายรูปสินค้าเพื่อยืนยันสภาพก่อนขนส่ง</p>
                </div>
             </div>

            <CameraInput onImagesChange={setPhotos} maxImages={10} />
        </section>

        <Button 
            onClick={handleSubmit}
            disabled={photos.length === 0 || loading}
            className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 font-bold text-lg shadow-lg shadow-amber-500/20"
        >
            {loading ? <Loader2 className="animate-spin" /> : "ยืนยันการรับสินค้า / ออกเดินทาง"}
        </Button>
      </div>
    </div>
  )
}
