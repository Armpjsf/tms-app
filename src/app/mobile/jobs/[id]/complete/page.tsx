"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { CameraInput } from "@/components/mobile/camera-input"
import { SignaturePad } from "@/components/mobile/signature-pad"
import { toast } from "sonner"
import { submitJobPOD } from "@/lib/actions/pod-actions"
import { getJobDetails } from "@/app/mobile/jobs/actions"
import { Loader2, CheckCircle, BrainCircuit, AlertTriangle, ScanLine, Box } from "lucide-react"
import { PodReport } from "@/components/mobile/pod-report"
import { Job } from "@/lib/supabase/jobs"
import html2canvas from "html2canvas"
import { analyzePODImage, AIAnalysisResult } from "@/lib/utils/ai-verification"
import { saveJobOffline, blobToB64 } from "@/lib/utils/offline-storage"
import { QuantityStepper } from "@/components/mobile/quantity-stepper"

export default function JobCompletePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [photos, setPhotos] = useState<File[]>([])
  const [signature, setSignature] = useState<Blob | null>(null)
  const [loadedQty, setLoadedQty] = useState<string>("")
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
        getJobDetails(params.id).then(j => {
            setJob(j)
            if (j?.Loaded_Qty) {
                setLoadedQty(j.Loaded_Qty.toString())
            }
        })
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
      } catch (err) {
          console.error("AI Analysis failed:", err)
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
    // Explicit Validation Feedback
    if (photos.length === 0) {
        toast.error("กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป")
        return
    }
    if (!signature) {
        toast.error("กรุณาลงลายเซ็นผู้รับสินค้า")
        return
    }

    setLoading(true)
    
    try {
        const formData = new FormData()
        
        // 1. Capture Report BEFORE sending
        if (reportRef.current && job) {
            const captureReport = async (retryCount = 0): Promise<Blob | null> => {
                try {
                    // Wait for all images in the report to load properly
                    await waitForImages(reportRef.current!)
                    
                    // Progressive delay based on retries
                    const delay = 500 + (retryCount * 500)
                    await new Promise(resolve => setTimeout(resolve, delay))

                    const canvas = await html2canvas(reportRef.current!, {
                        scale: 2, // High resolution
                        useCORS: true,
                        logging: false, // Disabled to save memory
                        backgroundColor: "#ffffff",
                        windowWidth: 800, // Consistent with component width
                        allowTaint: true
                    })
                    
                    return new Promise<Blob | null>(resolve => 
                        canvas.toBlob(resolve, 'image/jpeg', 0.8)
                    )
                } catch (err) {
                    console.error("Capture effort failed:", err)
                    if (retryCount < 1) return captureReport(retryCount + 1)
                    return null
                }
            }

            try {
                const reportBlob = await captureReport()
                
                if (reportBlob && reportBlob.size > 5000) { 
                    formData.append("pod_report", reportBlob, `POD_Report_${params.id}.jpg`)
                } else {
                    // Report too small or empty
                }
                } catch (err) {
                    console.error("Inner capture error:", err)
                }
        }

        // Photos are already compressed by CameraInput component
        photos.forEach((photo, index) => {
            formData.append(`photo_${index}`, photo)
        })

        // Also send count so server knows how many to look for
        formData.append("photo_count", photos.length.toString())
        
        formData.append("signature", signature, "signature.png")
        
        if (loadedQty) {
            formData.append("loaded_qty", loadedQty)
        }
        
        const result = await submitJobPOD(params.id, formData)
        
        if (result.success) {
          router.push(`/mobile/jobs/${params.id}?success=pod`)
        } else {
          toast.error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
          setLoading(false)
        }
    } catch (error: unknown) {
        // Check if it's a network error
        const isNetworkError = !navigator.onLine || error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))
        
        if (isNetworkError) {
          try {
            // Prepare data for offline storage (convert Blobs to Base64)
            const photoB64s = await Promise.all(photos.map(p => blobToB64(p)))
            const sigB64 = signature ? await blobToB64(signature) : null
            
            // Capture report if possible (as Base64)
            let reportB64 = null
            if (reportRef.current && job) {
                try {
                    const canvas = await html2canvas(reportRef.current!, { scale: 2, useCORS: true })
                    reportB64 = canvas.toDataURL('image/jpeg', 0.8)
                } catch { /* Fail silently */ }
            }

            const offlineData = {
                photos: photoB64s,
                signature: sigB64,
                pod_report: reportB64,
                photo_count: photos.length,
                actualCompletionTime: new Date().toISOString()
            }

            saveJobOffline(params.id, offlineData, 'POD')
            setCompleted(true) 
            toast.success("บันทึกข้อมูลแล้ว (โหมดออฟไลน์) จะส่งให้อัตโนมัติเมื่อมีสัญญาณ")
          } catch (offlineErr) {
            toast.error("ไม่สามารถบันทึกข้อมูลออฟไลน์ได้: " + String(offlineErr))
          }
        } else {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const isAuthError = errorMessage.includes('invalid_grant') || errorMessage.includes('refresh_token_not_found')
            
            if (isAuthError) {
                toast.error("เซสชั่นหมดอายุ กรุณาล็อกอินใหม่อีกครั้ง", {
                    action: {
                        label: "ไปหน้าล็อกอิน",
                        onClick: () => router.push('/mobile/login')
                    }
                })
            } else {
                toast.error(`Error: ${errorMessage}`)
            }
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
              <h1 className="text-2xl font-bold text-foreground">ส่งงานสำเร็จ!</h1>
              <p className="text-muted-foreground">ขอบคุณสำหรับการทำงาน</p>
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
            <h2 className="text-muted-foreground font-bold mb-2">1. ถ่ายรูปสินค้า</h2>
            <CameraInput onImagesChange={setPhotos} maxImages={5} />
            
            {/* AI Verification Feedback - Reserved space to prevent signature jumping */}
            <div className="mt-3 bg-card border border-slate-800 rounded-lg p-3 min-h-[5rem] flex flex-col justify-center">
                {photos.length > 0 ? (
                    <>
                    {verifying ? (
                        <div className="flex items-center gap-3 text-purple-400 animate-pulse">
                            <ScanLine className="animate-spin-slow" size={20} />
                            <span className="text-xl">กำลังตรวจสอบคุณภาพรูปภาพ (AI)...</span>
                        </div>
                    ) : verificationResult ? (
                        <div>
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <BrainCircuit size={16} className={verificationResult.isValid ? "text-emerald-400" : "text-amber-400"} />
                                    <span className={`text-xl font-bold ${verificationResult.isValid ? "text-emerald-400" : "text-amber-400"}`}>
                                        คะแนน AI: {verificationResult.score}/100
                                    </span>
                                </div>
                                {verificationResult.isValid && <CheckCircle size={16} className="text-emerald-500" />}
                             </div>
                             
                             {!verificationResult.isValid && (
                                <div className="space-y-1">
                                    {verificationResult.issues.map((issue, i) => (
                                        <div key={i} className="flex items-center gap-2 text-lg font-bold text-red-400">
                                            <AlertTriangle size={12} />
                                            {issue}
                                        </div>
                                    ))}
                                    <p className="text-lg font-bold text-muted-foreground mt-1 pl-5">แนะนำให้ถ่ายใหม่อีกครั้งเพื่อความชัดเจน</p>
                                </div>
                             )}
                        </div>
                    ) : null}
                    </>
                ) : (
                    <div className="flex items-center gap-3 text-muted-foreground/40 italic">
                        <ScanLine size={20} />
                        <span className="text-lg">ถ่ายรูปเพื่อรับการตรวจสอบด้วย AI</span>
                    </div>
                )}
            </div>
        </section>

                {/* Quantity Input Section (Only if needed for pricing) */}
                {job && job.Price_Per_Unit && Number(job.Price_Per_Unit) > 0 && (!job.Price_Cust_Total || Number(job.Price_Cust_Total) === 0) && (
                <section>
                    <h2 className="text-muted-foreground font-bold mb-2">2. ยืนยันจำนวนที่ส่งจริง</h2>
                    <QuantityStepper 
                        value={loadedQty}
                        onChange={setLoadedQty}
                        label="ระบุจำนวนที่ส่งมอบจริง (ชิ้น)"
                    />
                </section>
                )}

                <section>
                <h2 className="text-muted-foreground font-bold mb-2">
                    {job && job.Price_Per_Unit && Number(job.Price_Per_Unit) > 0 && (!job.Price_Cust_Total || Number(job.Price_Cust_Total) === 0) ? "3. ลายเซ็นผู้รับ" : "2. ลายเซ็นผู้รับ"}
                </h2>
                <SignaturePad onSave={setSignature} />
                </section>
        <div className="space-y-3">
            <Button 
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full h-14 font-black text-lg shadow-xl transition-all duration-500 rounded-2xl ${
                    photos.length > 0 && signature 
                        ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-blue-500/30 text-white translate-y-0 active:scale-95" 
                        : "bg-slate-800 text-muted-foreground opacity-70 grayscale translate-y-1"
                }`}
            >
                {loading ? <Loader2 className="animate-spin" /> : "ยืนยันการส่งงาน"}
            </Button>
            
            {/* Validation Feedback */}
            <div className="text-center space-y-1">
                {photos.length === 0 && (
                    <p className="text-lg font-bold text-red-400 animate-pulse">* กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป</p>
                )}
                {!signature && (
                    <p className="text-lg font-bold text-red-400 animate-pulse">* กรุณาลงลายเซ็นผู้รับ</p>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
