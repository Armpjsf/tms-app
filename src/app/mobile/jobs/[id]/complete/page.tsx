"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { CameraInput } from "@/components/mobile/camera-input"
import { SignaturePad } from "@/components/mobile/signature-pad"
import { submitJobPOD } from "@/lib/actions/pod-actions"
import { getJobDetails } from "@/app/mobile/jobs/actions"
import { Loader2, CheckCircle } from "lucide-react"
import { PodReport } from "@/components/mobile/pod-report"
import { Job } from "@/lib/supabase/jobs"
import html2canvas from "html2canvas"

export default function JobCompletePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [photos, setPhotos] = useState<File[]>([])
  const [signature, setSignature] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  
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
                // Wait for images to be ready (optional check)
                const canvas = await html2canvas(reportRef.current, {
                    scale: 2, // High resolution
                    useCORS: true,
                    logging: false,
                    windowWidth: 1200 // Force desktop width for layout
                })
                
                const reportBlob = await new Promise<Blob | null>(resolve => 
                    canvas.toBlob(resolve, 'image/jpeg', 0.8)
                )
                
                if (reportBlob) {
                    formData.append("pod_report", reportBlob, `POD_Report_${params.id}.jpg`)
                }
            } catch (err) {
                console.error("Report Generation Failed:", err)
                // Continue without report if fails? or Alert?
                // alert("สร้างใบงานไม่สำเร็จ แต่จะพยายามส่งรูปปกติ")
            }
        }

        // Append all photos
        photos.forEach((photo, index) => {
            formData.append(`photo_${index}`, photo)
        })
        // Also send count so server knows how many to look for
        formData.append("photo_count", photos.length.toString())
        
        formData.append("signature", signature, "signature.png")
        
        // ... rest of submit logic
        const result = await submitJobPOD(params.id, formData)
        
        if (result.success) {
          setCompleted(true)
        } else {
          alert(result.error)
        }
    } catch (error: any) {
        console.error("Submit Error:", error)
        alert(`Error: ${error?.message || "Internal Server Error"}`)
    } finally {
        setLoading(false)
    }
  }

  if (completed) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 animate-in zoom-in duration-300">
                  <CheckCircle size={48} />
              </div>
              <h1 className="text-2xl font-bold text-white">ส่งงานสำเร็จ!</h1>
              <p className="text-slate-400">ขอบคุณสำหรับการทำงาน</p>
              <Button 
                onClick={() => router.push("/mobile/dashboard")}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                  กลับหน้าหลัก
              </Button>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="ส่งงาน (POD)" showBack />

      {/* Hidden Report Container */}
      {job && (
          <div className="fixed left-[-9999px] top-0">
             <PodReport 
                ref={reportRef} 
                job={job} 
                photos={photos.map(f => URL.createObjectURL(f))} 
                signature={signature ? URL.createObjectURL(signature) : null} 
             />
          </div>
      )}

      <div className="space-y-6">
        <section>
            <h2 className="text-white font-medium mb-2">1. ถ่ายรูปสินค้า</h2>
            <CameraInput onImagesChange={setPhotos} maxImages={5} />
        </section>

        <section>
            <h2 className="text-white font-medium mb-2">2. ลายเซ็นผู้รับ</h2>
            <SignaturePad onSave={setSignature} />
        </section>

        <div className="space-y-3">
            <Button 
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full h-14 font-bold text-lg shadow-lg transition-all ${
                    photos.length > 0 && signature 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20 text-white" 
                        : "bg-slate-800 text-slate-400 cursor-not-allowed"
                }`}
            >
                {loading ? <Loader2 className="animate-spin" /> : "ยืนยันการส่งงาน"}
            </Button>
            
            {/* Validation Feedback */}
            <div className="text-center space-y-1">
                {photos.length === 0 && (
                    <p className="text-xs text-red-400 animate-pulse">* กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป</p>
                )}
                {!signature && (
                    <p className="text-xs text-red-400 animate-pulse">* กรุณาลงลายเซ็นผู้รับ</p>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
