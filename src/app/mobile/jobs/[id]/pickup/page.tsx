"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { CameraInput } from "@/components/mobile/camera-input"
import { SignaturePad } from "@/components/mobile/signature-pad"
import { PickupReport } from "@/components/mobile/pickup-report"
import { toast } from "sonner"
import { submitJobPickup } from "@/lib/actions/pod-actions"
import { getJobDetails } from "@/app/mobile/jobs/actions"
import { Job } from "@/lib/supabase/jobs"
import { Loader2, Box, Info } from "lucide-react"
import html2canvas from "html2canvas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function JobPickupPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [photos, setPhotos] = useState<File[]>([])
  const [signature, setSignature] = useState<Blob | null>(null)
  const [loadedQty, setLoadedQty] = useState<string>("")
  const [loading, setLoading] = useState(false)
  
  // Job Data for Report
  const [job, setJob] = useState<Job | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (params.id) {
        getJobDetails(params.id).then(setJob)
    }
  }, [params.id])

  const canSubmit = photos.length > 0 && signature && (
    (loadedQty && Number(loadedQty) > 0) ||
    (!job?.Price_Per_Unit || Number(job.Price_Per_Unit) === 0) ||
    (job?.Price_Cust_Total && Number(job.Price_Cust_Total) > 0) // Fixed price ignores quantity requirement
  )

  const handleSubmit = async () => {
    // Enhanced Validation with feedback
    if (photos.length === 0) {
        toast.error("กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป")
        return
    }
    if (!signature) {
        toast.error("กรุณาลงลายเซ็นผู้ส่งของ")
        return
    }
    
    const needsQty = (job?.Price_Per_Unit && Number(job.Price_Per_Unit) > 0) && 
                     (!job?.Price_Cust_Total || Number(job.Price_Cust_Total) === 0)
    
    if (needsQty && (!loadedQty || Number(loadedQty) <= 0)) {
        toast.error("กรุณาระบุจำนวนสินค้าที่รับจริง (มากกว่า 0)")
        return
    }

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
            } catch {
                // Pickup Report Generation Failed
            }
        }

        // 2. Append Photos
        photos.forEach((photo, index) => {
            formData.append(`photo_${index}`, photo)
        })
        formData.append("photo_count", photos.length.toString())
        
        // 3. Append Signature
        formData.append("signature", signature, "signature.png")
        
        // 4. Append Quantity
        if (loadedQty) {
            formData.append("loaded_qty", loadedQty)
        }
        
        const result = await submitJobPickup(params.id, formData)
        
        if (result.success) {
          if (result.warning) {
            toast.warning(String(result.warning)) 
          }
          router.push(`/mobile/jobs/${params.id}?success=pickup`)
        } else {
          toast.error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
          setLoading(false)
        }
    } catch (error: unknown) {
        // Pickup Submit Error
        const isNetworkError = !navigator.onLine || error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))
        
        if (isNetworkError) {
             // ...
        } else {
            const msg = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error))
            toast.error(`เกิดข้อผิดพลาดในการส่งข้อมูล: ${msg}`)
            setLoading(false)
        }
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
                loadedQty={parseFloat(loadedQty) || 0}
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
                    <p className="text-xl text-muted-foreground">ถ่ายรูปสินค้าเพื่อยืนยันสภาพก่อนขนส่ง</p>
                </div>
             </div>

            <CameraInput onImagesChange={setPhotos} maxImages={10} />
        </section>

        {/* Quantify Input Section */}
        {job && (
            <section className="space-y-4">
                {job.Price_Cust_Total && Number(job.Price_Cust_Total) > 0 ? (
                    <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-[2.5rem] flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                            <Info className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="font-black text-white uppercase tracking-widest text-sm mb-1 italic">ราคาถูกกำหนดโดยแอดมินแล้ว</p>
                            <p className="text-blue-300 text-[11px] font-black uppercase tracking-widest leading-relaxed">
                                หากต้องการแก้ไขราคาหรือจำนวน กรุณาติดต่อแอดมินโดยตรง
                            </p>
                        </div>
                    </div>
                ) : job.Price_Per_Unit && Number(job.Price_Per_Unit) > 0 ? (
                    <div className="glass-panel p-8 rounded-[3rem] border-emerald-500/20 space-y-6 relative overflow-hidden bg-emerald-500/[0.03]">
                        <div className="flex items-center gap-4 text-emerald-500">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                                <Box size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="font-black uppercase tracking-widest text-sm italic">ระบุจำนวนสินค้าที่รับจริง</h2>
                                <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">นับจำนวนชิ้นและระบุเพื่อยืนยัน</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="loadedQty" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">ระบุจำนวนจริง (ชิ้น)</Label>
                            <div className="relative">
                                <Input
                                    id="loadedQty"
                                    type="number"
                                    step="0.01"
                                    value={loadedQty}
                                    onChange={(e) => setLoadedQty(e.target.value)}
                                    placeholder="ใส่จำนวนชิ้นที่นี่..."
                                    className="h-20 bg-slate-900/50 border-emerald-500/20 rounded-[2rem] text-3xl font-black text-white px-8 placeholder:text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-center italic"
                                />
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-sm uppercase tracking-widest pointer-events-none opacity-40">
                                    ชิ้น
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>
        )}

        <section>
            <h2 className="text-muted-foreground font-bold mb-2">2. ลายเซ็นผู้ส่งของ</h2>
            <SignaturePad onSave={setSignature} />
        </section>

        <Button 
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full h-14 font-black text-lg shadow-xl transition-all duration-500 rounded-2xl ${
                canSubmit
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/30 text-white translate-y-0 active:scale-95" 
                    : "bg-slate-800 text-muted-foreground opacity-70 grayscale translate-y-1"
            }`}
        >
            {loading ? <Loader2 className="animate-spin" /> : "ยืนยันการรับสินค้า / ออกเดินทาง"}
        </Button>
      </div>

    </div>
  )
}
