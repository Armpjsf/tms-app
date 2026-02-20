"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { CameraInput } from "@/components/mobile/camera-input"
import { SignaturePad } from "@/components/mobile/signature-pad"
import { PickupReport } from "@/components/mobile/pickup-report"
import { submitJobPickup } from "@/lib/actions/pod-actions"
import { getJobDetails } from "@/app/mobile/jobs/actions"
import { Job } from "@/lib/supabase/jobs"
import { Loader2, Box } from "lucide-react"
import html2canvas from "html2canvas"

export default function JobPickupPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [photos, setPhotos] = useState<File[]>([])
  const [signature, setSignature] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Job Data for Report
  const [job, setJob] = useState<Job | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (params.id) {
        getJobDetails(params.id).then(setJob)
    }
  }, [params.id])

  const handleSubmit = async () => {
    if (photos.length === 0 || !signature) return

    setLoading(true)
    
    try {
        const formData = new FormData()
        
        // 1. Capture Report BEFORE sending
        if (reportRef.current && job) {
            try {
                const canvas = await html2canvas(reportRef.current, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: 1200
                })
                
                const reportBlob = await new Promise<Blob | null>(resolve => 
                    canvas.toBlob(resolve, 'image/jpeg', 0.8)
                )
                
                if (reportBlob) {
                    formData.append("pickup_report", reportBlob, `Pickup_Report_${params.id}.jpg`)
                }
            } catch (err) {
                console.error("Pickup Report Generation Failed:", err)
            }
        }

        // 2. Append Photos
        photos.forEach((photo, index) => {
            formData.append(`photo_${index}`, photo)
        })
        formData.append("photo_count", photos.length.toString())
        
        // 3. Append Signature
        formData.append("signature", signature, "signature.png")
        
        const result = await submitJobPickup(params.id, formData)
        
        if (result.success) {
          if (result.warning) {
            alert(result.warning) // Upload failed but status updated
          }
          router.push("/mobile/dashboard")
        } else {
          alert(result.error)
          setLoading(false)
        }
    } catch (error) {
        console.error("Pickup Submit Error:", error)
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล")
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="รับสินค้า (Pickup)" showBack />

      {/* Hidden Report Container for html2canvas */}
      {job && (
          <div className="fixed left-[-9999px] top-0">
             <PickupReport 
                ref={reportRef} 
                job={job} 
                photos={photos.map(f => URL.createObjectURL(f))} 
                signature={signature ? URL.createObjectURL(signature) : null} 
             />
          </div>
      )}

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

        <section>
            <h2 className="text-white font-medium mb-2">2. ลายเซ็นผู้ส่งของ</h2>
            <SignaturePad onSave={setSignature} />
        </section>

        <Button 
            onClick={handleSubmit}
            disabled={photos.length === 0 || !signature || loading}
            className={`w-full h-14 font-bold text-lg shadow-lg transition-all ${
                photos.length > 0 && signature 
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/20 text-white" 
                    : "bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
        >
            {loading ? <Loader2 className="animate-spin" /> : "ยืนยันการรับสินค้า / ออกเดินทาง"}
        </Button>
      </div>

    </div>
  )
}
