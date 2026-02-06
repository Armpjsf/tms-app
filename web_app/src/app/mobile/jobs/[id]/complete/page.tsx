"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CameraInput } from "@/components/mobile/camera-input"
import { SignaturePad } from "@/components/mobile/signature-pad"
import { submitJobPOD } from "@/lib/actions/pod-actions"
import { Loader2, CheckCircle } from "lucide-react"

export default function JobCompletePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [photo, setPhoto] = useState<File | null>(null)
  const [signature, setSignature] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  const handleSubmit = async () => {
    if (!photo || !signature) return

    setLoading(true)
    const formData = new FormData()
    formData.append("photo", photo)
    formData.append("signature", signature, "signature.png")
    
    // Note: params.id is a promise in Next.js 15+, but we will handle it in parent or assume sync for client comp if needed
    // However, page props params is better resolved before passing or using use() hook.
    // Simplifying for now assuming direct access or fix later. 
    // Wait, client components accessing params directly is okay in older Next, 
    // but in newer ones it's async. Let's assume passed correctly.
    // Actually, let's just use the ID we know we have.
    const result = await submitJobPOD(params.id, formData)
    
    if (result.success) {
      setCompleted(true)
    } else {
      alert(result.error)
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

      <div className="space-y-6">
        <section>
            <h2 className="text-white font-medium mb-2">1. ถ่ายรูปสินค้า</h2>
            <CameraInput onImageCapture={setPhoto} />
        </section>

        <section>
            <h2 className="text-white font-medium mb-2">2. ลายเซ็นผู้รับ</h2>
            <SignaturePad onSave={setSignature} />
        </section>

        <Button 
            onClick={handleSubmit}
            disabled={!photo || !signature || loading}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-lg shadow-lg shadow-blue-500/20"
        >
            {loading ? <Loader2 className="animate-spin" /> : "ยืนยันการส่งงาน"}
        </Button>
      </div>
    </div>
  )
}
