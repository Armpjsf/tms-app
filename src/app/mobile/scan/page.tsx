"use client"

import { Camera, QrCode, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ScanPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
            <QrCode className="w-10 h-10 text-blue-400" />
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Barcode / QR Scanner</h1>
            <p className="text-slate-400 text-sm">
              สแกน Barcode หรือ QR Code เพื่อค้นหางานหรือยืนยันการส่งสินค้า
            </p>
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
            <Camera className="mr-2 h-5 w-5" />
            เปิดกล้อง
          </Button>

          <div className="flex items-start gap-2 text-left p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              ฟีเจอร์นี้ต้องการสิทธิ์การเข้าถึงกล้อง กรุณาอนุญาตเมื่อระบบถาม
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
