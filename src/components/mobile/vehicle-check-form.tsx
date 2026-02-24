"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ClipboardCheck, User, Truck } from "lucide-react"
import { CameraInput } from "@/components/mobile/camera-input"
import { SignaturePad } from "@/components/mobile/signature-pad"
import { submitVehicleCheck } from "@/app/mobile/actions"
import html2canvas from "html2canvas"


interface MobileVehicleCheckFormProps {
    driverId: string
    driverName: string
    defaultVehiclePlate?: string
}

import { VehicleCheckReport } from "@/components/mobile/vehicle-check-report"

export function MobileVehicleCheckForm({ driverId, driverName, defaultVehiclePlate }: MobileVehicleCheckFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [plate, setPlate] = useState(defaultVehiclePlate || "")
  const [photos, setPhotos] = useState<File[]>([])
  const [signature, setSignature] = useState<Blob | null>(null)
  const [submitStatus, setSubmitStatus] = useState<string>("")
  const reportRef = useRef<HTMLDivElement>(null)
  
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
    console.log("Submit start", { signature: !!signature, plate })
    alert("เริ่มบันทึกข้อมูล...") // Checkpoint 1
    
    if (!signature) {
        alert("กรุณาลงลายเซ็นก่อนบันทึก")
        return
    }

    setLoading(true)
    setSubmitStatus("กำลังเตรียมข้อมูล...")
    
    try {
        const formData = new FormData()
        
        // 1. Capture Report
        if (reportRef.current) {
            setSubmitStatus("ก. กำลังสร้างรูปรายงาน...")
            alert("Step 1: กำลังสร้างรูปจากหน้าจอ...") // Checkpoint 2
            try {
                await new Promise(r => setTimeout(r, 500))
                
                const canvas = await html2canvas(reportRef.current, {
                    scale: 1,
                    useCORS: true,
                    logging: true,
                    windowWidth: 1000,
                    backgroundColor: "#ffffff",
                    onclone: (doc) => {
                        const el = doc.getElementById("report-capture-area")
                        if (el) el.style.position = "static"
                    }
                })
                alert("Step 2: สร้าง Canvas สำเร็จ กำลังแปลงเป็นไฟล์...") // Checkpoint 3
                const reportBlob = await new Promise<Blob | null>(resolve => {
                    const timeout = setTimeout(() => {
                        console.error("toBlob timeout")
                        resolve(null)
                    }, 5000)
                    canvas.toBlob((blob) => {
                        clearTimeout(timeout)
                        resolve(blob)
                    }, 'image/jpeg', 0.6)
                })
                
                if (reportBlob) {
                    formData.append("check_report", reportBlob, `Report_${plate}.jpg`)
                    alert(`Step 3: แปลงไฟล์รายงานสำเร็จ (ขนาด: ${Math.round(reportBlob.size / 1024)} KB)`) // Checkpoint 4
                } else {
                    alert("Step 3 Error: ได้รับ Blob ว่างเปล่าสำหรับตัวรายงาน")
                }
            } catch (err) {
                console.error("Report capture failed:", err)
                alert(`เตือน: สร้างรายงานรูปภาพไม่สำเร็จ แต่อาจจะบันทึกส่วนอื่นได้: ${err}`)
            }
        }

        setSubmitStatus("ข. เตรียมรูปถ่าย...")
        formData.append("driverId", driverId)
        formData.append("driverName", driverName)
        formData.append("vehiclePlate", plate)
        formData.append("items", JSON.stringify(checkedItems))
        
        photos.forEach((file, i) => {
            formData.append(`photo_${i}`, file)
        })
        formData.append("photo_count", photos.length.toString())

        if (signature) {
            formData.append("signature", signature, "signature.png")
        }

        setSubmitStatus("ค. ส่งข้อมูลเข้าเซิร์ฟเวอร์...")
        alert("Step 4: กำลังส่งข้อมูลไปยัง Google Drive & Database (โปรดรอสักครู่)...") // Checkpoint 5
        
        const result = await submitVehicleCheck(formData)
        alert(`Step 5: ผลการส่ง -> ${result.success ? "สำเร็จ" : "ล้มเหลว"}`) // Checkpoint 6
        
        if (result.success) {
             alert("✅ บันทึกข้อมูลเรียบร้อยแล้ว!")
             router.push('/mobile/profile')
        } else {
             setSubmitStatus("")
             alert(`❌ บันทึกไม่สำเร็จ: ${result.message}`)
        }
    } catch (err) {
        console.error("Vehicle Check Error:", err)
        setSubmitStatus("")
        const errMsg = err instanceof Error ? err.message : String(err)
        alert(`Submit Catch Error: ${errMsg}`)
    } finally {
        setLoading(false)
    }
  }

  // Manage object URLs for capture
  const [reportPhotos, setReportPhotos] = useState<string[]>([])
  const [reportSig, setReportSig] = useState<string | null>(null)

  const updateCaptureData = () => {
      try {
          // Cleanup old
          reportPhotos.forEach(url => { if(url) URL.revokeObjectURL(url) })
          if (reportSig) URL.revokeObjectURL(reportSig)

          // Create new
          const newPhotos = photos.map(p => URL.createObjectURL(p))
          const newSig = signature ? URL.createObjectURL(signature) : null
          
          setReportPhotos(newPhotos)
          setReportSig(newSig)
          console.log("Capture data updated", { photos: newPhotos.length, sig: !!newSig })
      } catch (e) {
          console.error("updateCaptureData Error:", e)
          alert("เกิดข้อผิดพลาดในการโหลดรูปเพื่อสร้างรายงาน: " + e)
      }
  }

  return (
    <form onSubmit={(e) => { 
        e.preventDefault(); 
        console.log("Form submit triggered");
        updateCaptureData(); 
        setTimeout(() => handleSubmit(e), 800); 
    }} className="space-y-6">
        {/* Hidden Report Container - More stable positioning */}
        <div 
            id="report-capture-area" 
            className="fixed top-0 left-[-5000px] pointer-events-none overflow-hidden"
            style={{ zIndex: -1 }}
        >
             <VehicleCheckReport 
                ref={reportRef}
                driverName={driverName}
                vehiclePlate={plate}
                items={checkedItems}
                photos={reportPhotos}
                signature={reportSig}
             />
        </div>

        <Card className="bg-slate-900 border-slate-800">

            <CardContent className="p-4 space-y-4">
                
                {/* Driver Info - Read Only */}
                <div className="space-y-2">
                    <Label className="text-white">ชื่อผู้ตรวจสอบ</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <Input 
                            value={driverName} 
                            disabled 
                            className="bg-slate-800 border-slate-700 pl-10 text-slate-300" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-white">ทะเบียนรถ</Label>
                    <div className="relative">
                         <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <Input 
                            placeholder="เลขทะเบียนรถ" 
                            className="bg-slate-950 border-slate-700 pl-10 text-white"
                            value={plate}
                            onChange={(e) => setPlate(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-2 mt-4 text-emerald-400">
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

                <div className="space-y-4 pt-4 border-t border-slate-800">
                    <div className="space-y-2">
                        <Label className="text-white">ถ่ายรูปบริเวณจุดที่ตรวจสอบ (ถ้ามี)</Label>
                        <CameraInput onImagesChange={setPhotos} maxImages={5} />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white font-medium">ลายเซ็นผู้ตรวจสอบ</Label>
                        <SignaturePad onSave={setSignature} />
                    </div>
                </div>
            </CardContent>
        </Card>

        <Button 
            type="submit" 
            className={`w-full h-14 font-bold text-lg shadow-lg transition-all ${
                signature && !loading
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20" 
                    : "bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
            disabled={loading || !signature}
        >
            {loading ? (
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin mb-1" />
                    <span className="text-[10px] font-normal opacity-80">{submitStatus}</span>
                </div>
            ) : "บันทึกการตรวจสอบ"}
        </Button>
      </form>

  )
}
