"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { QrCode, Camera, RefreshCw } from "lucide-react"
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
  const propsRef = useRef({ onScanSuccess, onOpenChange })

  // Keep props ref updated
  useEffect(() => {
    propsRef.current = { onScanSuccess, onOpenChange }
  }, [onScanSuccess, onOpenChange])

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isOpen && !isStarted) {
      const startScanner = async () => {
        try {
          if (!document.getElementById("qr-reader")) return

          // Prevent double start
          if (isStarted) return

          const html5QrCode = new Html5Qrcode("qr-reader", { verbose: false })
          scannerRef.current = html5QrCode
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              propsRef.current.onScanSuccess(decodedText)
              if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current = null
                    setIsStarted(false)
                    propsRef.current.onOpenChange(false)
                }).catch(e => console.error("Stop Error:", e))
              }
            },
            () => {} 
          )
          setIsStarted(true)
          setError(null)
        } catch (err: unknown) {
          console.error("Scanner Error:", err)
          const errorMsg = err instanceof Error ? err.message : String(err)
          
          if (errorMsg.includes("NotAllowedError") || errorMsg.includes("Permission denied")) {
            setError("คุณปฏิเสธการเข้าถึงกล้อง หรือเบราว์เซอร์บล็อกการเข้าถึง (ต้องใช้งานผ่าน HTTPS เท่านั้น)")
          } else if (errorMsg.includes("NotFoundError")) {
            setError("ไม่พบกล้องในอุปกรณ์นี้")
          } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            setError("กล้องต้องใช้งานผ่านการเชื่อมต่อที่ปลอดภัย (HTTPS) เท่านั้น")
          } else {
            setError("ไม่สามารถเริ่มการสแกนได้: " + errorMsg)
          }
          setIsStarted(false)
        }
      }

      // 800ms delay to ensure full DOM and Browser Readiness
      timer = setTimeout(startScanner, 800)
    }

    return () => {
      if (timer) clearTimeout(timer)
      if (scannerRef.current && isStarted) {
        scannerRef.current.stop().then(() => {
            scannerRef.current = null
            setIsStarted(false)
        }).catch(err => console.error("Cleanup Error:", err))
      }
    }
  }, [isOpen, isStarted])

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
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
      <DialogContent className="bg-background border-border/10 rounded-[2.5rem] p-6 max-w-[90vw] md:max-w-md overflow-hidden">
        <DialogHeader className="space-y-4">
          <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent mx-auto mb-2">
            <QrCode size={24} />
          </div>
          <DialogTitle className="text-xl font-black text-white text-center uppercase tracking-tighter">สแกนคิวอาร์เพื่อเข้าสู่ระบบ</DialogTitle>
        </DialogHeader>

        <div className="relative mt-4 aspect-square bg-card rounded-[2rem] overflow-hidden border border-border/5 shadow-inner">
          <div id="qr-reader" className="w-full h-full"></div>
          
          {!isStarted && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
               <RefreshCw size={32} className="text-primary animate-spin" />
               <p className="text-base font-bold font-bold text-muted-foreground uppercase tracking-widest">กำลังเริ่มต้นกล้อง...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
               <Camera size={40} className="text-red-500 opacity-50" />
               <p className="text-lg font-black text-red-400 leading-relaxed">{error}</p>
               <div className="text-sm text-muted-foreground space-y-2 pt-2 border-t border-border/5 w-full">
                  <p>1. ตรวจสอบว่าไม่ได้ใช้กล้องในแอปอื่น</p>
                  <p>2. กดสัญลักษณ์ล็อค (🔒) ที่แถบบนเบราว์เซอร์</p>
                  <p>3. เลือก Permissions -&gt; Camera -&gt; Allow</p>
               </div>
               <Button 
                 variant="outline" 
                 onClick={() => { setError(null); onOpenChange(false); }}
                 className="mt-4 border-border/10 text-white rounded-xl"
               >
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

        <p className="text-center text-muted-foreground text-base font-bold font-bold uppercase tracking-widest mt-6">
          วางรหัสคิวอาร์ให้อยู่ในกรอบเพื่อสแกน
        </p>

        <Button 
          onClick={() => onOpenChange(false)}
          className="w-full h-14 mt-6 bg-muted/50 hover:bg-muted/80 text-foreground rounded-2xl font-black uppercase tracking-widest text-base font-bold border border-border/10"
        >
          ยกเลิก
        </Button>
      </DialogContent>
    </Dialog>
  )
}

