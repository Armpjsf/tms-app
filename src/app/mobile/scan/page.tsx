"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Camera, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScanning(true)
      // Simulate scanning delay
      setTimeout(() => {
        setScanning(false)
        toast.error("ไม่พบรหัส QR Code ในรูปภาพ (ระบบสแกนยังไม่เปิดใช้งาน)")
      }, 2000)
    }
  }

  const openCamera = () => {
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md bg-white border-gray-200">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center relative">
            <QrCode className={`w-10 h-10 text-emerald-500 ${scanning ? 'animate-pulse' : ''}`} />
            {scanning && (
                <div className="absolute inset-0 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            )}
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Barcode / QR Scanner</h1>
            <p className="text-gray-500 text-xl">
              สแกน Barcode หรือ QR Code เพื่อค้นหางานหรือยืนยันการส่งสินค้า
            </p>
          </div>

          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={inputRef}
            onChange={handleCapture}
          />

          <Button 
            className="w-full bg-emerald-600 hover:bg-blue-700 h-12 text-lg" 
            onClick={openCamera}
            disabled={scanning}
          >
            <Camera className="mr-2 h-5 w-5" />
            {scanning ? "กำลังสแกน..." : "เปิดกล้อง"}
          </Button>

          {/* Fallback for manual search */}
          <Link href="/mobile/jobs" className="block">
            <Button variant="ghost" className="w-full text-gray-500 hover:text-white hover:bg-gray-100">
                ค้นหางานด้วยตัวเอง
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

