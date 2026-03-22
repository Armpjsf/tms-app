"use client"

import { useEffect, useRef, useState } from "react"
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode"
import { QrCode, X, Camera, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface QRScannerModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (decodedText: string) => void
}

export function QRScannerModal({ isOpen, onOpenChange, onScanSuccess }: QRScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    if (isOpen && !isStarted) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("qr-reader")
          scannerRef.current = html5QrCode
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              onScanSuccess(decodedText)
              stopScanner()
              onOpenChange(false)
            },
            (errorMessage) => {
              // Ignore failure to scan in preview
            }
          )
          setIsStarted(true)
        } catch (err: any) {
          console.error("Scanner Error:", err)
          setError("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึง")
        }
      }

      // Small delay to ensure DOM is ready
      const timer = setTimeout(startScanner, 100)
      return () => clearTimeout(timer)
    }

    if (!isOpen && isStarted) {
      stopScanner()
    }
  }, [isOpen])

  const stopScanner = async () => {
    if (scannerRef.current && isStarted) {
      try {
        await scannerRef.current.stop()
        setIsStarted(false)
      } catch (err) {
        console.error("Stop Error:", err)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) stopScanner()
      onOpenChange(open)
    }}>
      <DialogContent className="bg-[#050110] border-white/10 rounded-[2.5rem] p-6 max-w-[90vw] md:max-w-md overflow-hidden">
        <DialogHeader className="space-y-4">
          <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent mx-auto mb-2">
            <QrCode size={24} />
          </div>
          <DialogTitle className="text-xl font-black text-white text-center uppercase tracking-tighter">สแกนคิวอาร์เพื่อเข้าสู่ระบบ</DialogTitle>
        </DialogHeader>

        <div className="relative mt-4 aspect-square bg-slate-900 rounded-[2rem] overflow-hidden border border-white/5 shadow-inner">
          <div id="qr-reader" className="w-full h-full"></div>
          
          {!isStarted && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
               <RefreshCw size={32} className="text-primary animate-spin" />
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">กำลังเริ่มต้นกล้อง...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
               <Camera size={40} className="text-red-500 opacity-50" />
               <p className="text-xs font-bold text-red-400 leading-relaxed">{error}</p>
               <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="border-white/10 text-white">
                 ลองใหม่อีกครั้ง
               </Button>
            </div>
          )}

          {/* Scanning Overlay UI */}
          <div className="absolute inset-0 border-[40px] border-[#050110]/60 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border-2 border-primary/50 rounded-2xl pointer-events-none">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[2px] bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line"></div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-6">
          วางรหัสคิวอาร์ให้อยู่ในกรอบเพื่อสแกน
        </p>

        <Button 
          onClick={() => onOpenChange(false)}
          className="w-full h-14 mt-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10"
        >
          ยกเลิก
        </Button>
      </DialogContent>
    </Dialog>
  )
}
