"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { CameraInput } from "@/components/mobile/camera-input"
import { Loader2, Wrench, User, Gauge } from "lucide-react"
import { createRepairTicket } from "@/app/maintenance/actions"
import { uploadImageToDrive } from "@/lib/actions/upload-actions"

interface MobileMaintenanceFormProps {
  driverId: string
  driverName: string
  defaultVehiclePlate?: string
}

export function MobileMaintenanceForm({ driverId, driverName, defaultVehiclePlate }: MobileMaintenanceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [plate, setPlate] = useState(defaultVehiclePlate || "")
  const [odometer, setOdometer] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
        // Upload photo first if provided
        let photoUrl: string | undefined = undefined
        if (photo) {
            const uploadData = new FormData()
            uploadData.append('file', photo)
            uploadData.append('folder', 'Repair_Photos')
            const uploadResult = await uploadImageToDrive(uploadData)
            if (uploadResult.success && uploadResult.directLink) {
                photoUrl = uploadResult.directLink
            }
        }

        const result = await createRepairTicket({
            Date_Report: new Date().toISOString(),
            Driver_ID: driverId,
            Vehicle_Plate: plate,
            Issue_Type: title,
            Description: description,
            Priority: "Medium",
            Odometer: odometer ? parseInt(odometer) : undefined,
            Photo_Url: photoUrl
        })

        if (result.success) {
            alert("ส่งแจ้งซ่อมเรียบร้อยแล้ว")
            router.push('/mobile/dashboard')
        } else {
            alert(`เกิดข้อผิดพลาด: ${result.message}`)
        }
    } catch (error) {
        console.error("Maintenance form error:", error)
        const errMsg = error instanceof Error ? error.message : String(error)
        alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${errMsg}`)
    } finally {
        setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-white border-gray-200">
            <CardContent className="p-4 space-y-4">
                
                <div className="space-y-2">
                    <Label className="text-foreground">ชื่อผู้แจ้ง</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input 
                            value={driverName} 
                            disabled 
                            className="bg-gray-100 border-gray-200 pl-10 text-gray-700" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-foreground">ทะเบียนรถ</Label>
                    <Input 
                        placeholder="เลขทะเบียนรถ" 
                        className="bg-background border-gray-200 text-gray-900"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-foreground">เลขไมล์</Label>
                    <div className="relative">
                        <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input 
                            type="number"
                            placeholder="เลขไมล์ปัจจุบัน" 
                            className="bg-background border-gray-200 pl-10 text-gray-900"
                            value={odometer}
                            onChange={(e) => setOdometer(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-foreground">หัวข้อการซ่อม</Label>
                    <div className="relative">
                        <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input 
                            placeholder="เช่น เบรคมีเสียงดัง, แอร์ไม่เย็น" 
                            className="bg-background border-gray-200 pl-10 text-gray-900"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-foreground">รายละเอียดเพิ่มเติม</Label>
                    <Textarea 
                        placeholder="อธิบายอาการเสีย..." 
                        className="bg-background border-gray-200 text-gray-900 min-h-[100px]"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-foreground">รูปถ่ายอาการเสีย</Label>
                    <CameraInput onImagesChange={(files) => setPhoto(files[0] || null)} maxImages={3} />
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
  )
}
