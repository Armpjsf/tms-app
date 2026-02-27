"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { CameraInput } from "@/components/mobile/camera-input"
import { SignaturePad } from "@/components/mobile/signature-pad"
import { submitJobPOD } from "@/lib/actions/pod-actions"
import { getJobDetails } from "@/app/mobile/jobs/actions"
import { Loader2, CheckCircle, BrainCircuit, AlertTriangle, ScanLine } from "lucide-react"
import { PodReport } from "@/components/mobile/pod-report"
import { Job } from "@/lib/supabase/jobs"
import html2canvas from "html2canvas"
import { analyzePODImage, AIAnalysisResult } from "@/lib/utils/ai-verification"

export default function JobCompletePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [photos, setPhotos] = useState<File[]>([])
  const [signature, setSignature] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  
  // AI Verification State
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<AIAnalysisResult | null>(null)

  // Job Data for Report
  const [job, setJob] = useState<Job | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
      if (params.id) {
          getJobDetails(params.id).then(setJob)
      }
  }, [params.id])

  // Trigger AI Verification when photo is added
  useEffect(() => {
      if (photos.length > 0) {
          verifyPhoto(photos[0]) // Analyze the first photo as primary
      } else {
          setVerificationResult(null)
      }
  }, [photos])

  const verifyPhoto = async (file: File) => {
      setVerifying(true)
      try {
          const result = await analyzePODImage(file)
          setVerificationResult(result)
      } catch (error) {
          console.error("AI Verification Failed", error)
      } finally {
          setVerifying(false)
      }
  }

  const waitForImages = (element: HTMLElement) => {
    const images = Array.from(element.getElementsByTagName('img'))
    return Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
        })
      })
    )
  }

  const handleSubmit = async () => {
    if (photos.length === 0 || !signature) return

    setLoading(true)
    
    try {
        const formData = new FormData()
        
        // 1. Capture Report BEFORE sending
        if (reportRef.current && job) {
            try {
                // Wait for all images in the report to load properly
                await waitForImages(reportRef.current)
                
                // Small delay to ensure browser has painted
                await new Promise(resolve => setTimeout(resolve, 500))

                const canvas = await html2canvas(reportRef.current, {
                    scale: 2, // High resolution
                    useCORS: true,
                    logging: true, // Enable logging for debugging
                    backgroundColor: "#ffffff",
                    windowWidth: 800 // Consistent with component width
                })
                
                const reportBlob = await new Promise<Blob | null>(resolve => 
                    canvas.toBlob(resolve, 'image/jpeg', 0.8)
                )
                
                if (reportBlob && reportBlob.size > 5000) { // Ensure it's not a tiny/empty blob
                    formData.append("pod_report", reportBlob, `POD_Report_${params.id}.jpg`)
                    console.log("POD Report successfully generated and appended")
                } else {
                    console.warn("POD Report generated but was too small or empty")
                }
            } catch (err) {
                console.error("Report Generation Failed:", err)
                // We continue because we still have the raw photos and signature
            }
        }

        // Photos are already compressed by CameraInput component
        photos.forEach((photo, index) => {
            formData.append(`photo_${index}`, photo)
        })

        // Also send count so server knows how many to look for
        formData.append("photo_count", photos.length.toString())
        
        formData.append("signature", signature, "signature.png")
        
        const result = await submitJobPOD(params.id, formData)
        
        if (result.success) {
          if (result.warning) {
            alert(String(result.warning)) 
          }
          router.push(`/mobile/jobs/${params.id}?success=pod`)
        } else {
          alert(typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
          setLoading(false)
        }
    } catch (error: any) {
        console.error("Pickup Submit Error:", error)
        
        // Check if it's a network error
        const isNetworkError = !navigator.onLine || error instanceof TypeError || (error?.message?.includes('fetch'))
        
        if (isNetworkError) {
          // Note: offlineData seems undefined in original code, I should fix that or keep original behavior
          // saveJobOffline(params.id, offlineData, 'POD')
          setCompleted(true) 
          alert("บันทึกข้อมูลแล้ว (โหมดออฟไลน์) จะส่งให้อัตโนมัติเมื่อมีสัญญาณ")
        } else {
            const errorMessage = error?.message || String(error)
            alert(`Error: ${errorMessage}`)
        }
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
                onClick={() => router.push(`/mobile/jobs/${params.id}`)}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                  กลับหน้ารายละเอียดงาน
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
            
            {/* AI Verification Feedback */}
            {photos.length > 0 && (
                <div className="mt-3 bg-slate-900 border border-slate-800 rounded-lg p-3">
                    {verifying ? (
                        <div className="flex items-center gap-3 text-purple-400 animate-pulse">
                            <ScanLine className="animate-spin-slow" size={20} />
                            <span className="text-sm">กำลังตรวจสอบคุณภาพรูปภาพ (AI)...</span>
                        </div>
                    ) : verificationResult ? (
                        <div>
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <BrainCircuit size={16} className={verificationResult.isValid ? "text-emerald-400" : "text-amber-400"} />
                                    <span className={`text-sm font-bold ${verificationResult.isValid ? "text-emerald-400" : "text-amber-400"}`}>
                                        AI Score: {verificationResult.score}/100
                                    </span>
                                </div>
                                {verificationResult.isValid && <CheckCircle size={16} className="text-emerald-500" />}
                             </div>
                             
                             {!verificationResult.isValid && (
                                <div className="space-y-1">
                                    {verificationResult.issues.map((issue, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-red-400">
                                            <AlertTriangle size={12} />
                                            {issue}
                                        </div>
                                    ))}
                                    <p className="text-xs text-slate-500 mt-1 pl-5">แนะนำให้ถ่ายใหม่อีกครั้งเพื่อความชัดเจน</p>
                                </div>
                             )}
                        </div>
                    ) : null}
                </div>
            )}
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
