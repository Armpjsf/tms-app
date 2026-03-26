"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, User, Shield, Fingerprint, QrCode, Phone, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { loginDriver, loginWithQRToken } from "@/lib/actions/auth-actions"
import { authenticateBiometrics } from "@/lib/webauthn-client"
import { QRScannerModal } from "@/components/mobile/qr-scanner-modal"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import Image from "next/image"

function DriverLoginContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
  const [identifier, setIdentifier] = useState("")

  const urlError = searchParams.get("error")

  useEffect(() => {
    if (!urlError) return

    const timer = setTimeout(() => {
      if (urlError === 'session_missing') {
        setError("กรุณาเข้าสู่ระบบก่อนใช้งาน")
      } else if (urlError === 'session_invalid') {
        setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่")
      } else {
        setError(urlError)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [urlError])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")
    
    const result = await loginDriver(formData)
    
    if (result.error) {
      setError(result?.error === "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" ? "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" : result.error)
      setLoading(false)
    } else {
      router.push("/mobile/dashboard")
    }
  }

  async function handleBiometricLogin() {
    if (!identifier) {
      setError("กรุณากรอก 'รหัสพนักงาน' หรือ 'เบอร์โทรศัพท์' ก่อนสแกนนิ้ว/หน้า")
      return
    }

    setLoading(true)
    setError("")
    try {
      const result = await authenticateBiometrics(identifier)
      if (result.success) {
        router.push("/mobile/dashboard")
      } else {
        setError("การยืนยันตัวตนขัดข้อง")
        setLoading(false)
      }
    } catch (err: unknown) {
      console.error("Biometric Login Error:", err)
      const errMessage = err instanceof Error ? err.message : ""
      
      if (errMessage.includes("NotAllowedError") || errMessage.includes("SecurityError")) {
        setError("การเข้าใช้ระบบสแกนถูกปฏิเสธ")
      } else if (errMessage.includes("InvalidStateError") || errMessage.includes("not found")) {
        setError("ไม่พบข้อมูลการสแกนนิ้ว/หน้า กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อนเพื่อลงทะเบียน")
      } else {
        setError("ไม่สามารถสแกนได้ในขณะนี้ กรุณาใช้รหัสผ่านแทน")
      }
      setLoading(false)
    }
  }

  async function handleQRScanSuccess(decodedText: string) {
    setLoading(true)
    setError("")
    try {
      const result = await loginWithQRToken(decodedText)
      if (result.success) {
        router.push("/mobile/dashboard")
      } else {
        setError(result.error || "รหัส QR ไม่ถูกต้อง")
        setLoading(false)
      }
    } catch (err: unknown) {
      console.error(err)
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย QR")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Corporate CI Background (Navy #001E4C) */}
      <div className="absolute inset-0 z-0 bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-transparent to-background" />
      </div>
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] translate-y-1/2 animate-pulse" />
      
      <div className="w-full max-w-sm space-y-8 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-4 flex flex-col items-center">
          <div className={cn(
            "relative w-56 h-56 transition-all duration-700 logo-container-pure",
            "bg-white rounded-full shadow-2xl ring-1 ring-border/5",
            "dark:bg-white/10 dark:backdrop-blur-3xl dark:border dark:border-white/20 dark:shadow-[0_0_50px_rgba(255,255,255,0.1)]",
            "p-6"
          )}>
            <div className="relative w-full h-full rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
              <Image src="/logo-ci.png" alt="LogisPro" fill className="object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-110" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-sans font-black text-accent tracking-tighter uppercase italic">Logis<span className="text-primary">Pro</span></h1>
            <p className="text-muted-foreground text-xl font-sans font-bold uppercase tracking-widest">{t('login.tagline') || 'ขนส่งง่ายๆ มั่นใจทุกการจัดส่ง'}</p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel rounded-[2.5rem] p-8 shadow-2xl relative">
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="identifier" className="text-accent text-base font-bold font-black uppercase tracking-widest ml-1">รหัสพนักงาน / เบอร์โทรศัพท์</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                <Input 
                  id="identifier" 
                  name="identifier" 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="กรอกไอดี หรือ เบอร์โทร..." 
                  className="pl-12 bg-muted/50 border-border/10 text-foreground placeholder:text-muted-foreground h-14 rounded-2xl focus:ring-primary/50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end ml-1">
                <Label htmlFor="password" className="text-accent text-base font-bold font-black uppercase tracking-widest">รหัสผ่านปลอดภัย</Label>
                <button 
                  type="button" 
                  onClick={() => setIsForgotOpen(true)}
                  className="text-base font-bold font-black text-primary/80 uppercase tracking-widest hover:text-primary"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-12 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground h-14 rounded-2xl focus:ring-primary/50 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-lg font-bold text-center font-bold animate-shake">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-16 text-lg font-bold font-black uppercase tracking-[0.3em] bg-primary hover:brightness-110 shadow-xl shadow-primary/20 rounded-2xl transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/5"></div></div>
              <div className="relative flex justify-center text-base font-bold font-black uppercase tracking-[0.4em]"><span className="bg-background px-4 text-muted-foreground">หรือเข้าสู่ระบบด้วย</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                 type="button" 
                 onClick={handleBiometricLogin}
                 disabled={loading}
                 className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-muted/20 border border-border hover:bg-muted/30 transition-all disabled:opacity-50"
               >
                  <Fingerprint size={16} className="text-primary" />
                  <span className="text-base font-bold font-black text-foreground uppercase tracking-widest pt-0.5">สแกนนิ้ว/หน้า</span>
               </button>
               <button 
                 type="button" 
                 onClick={() => setIsQRScannerOpen(true)}
                 disabled={loading}
                 className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-muted/20 border border-border hover:bg-muted/30 transition-all disabled:opacity-50"
               >
                  <QrCode size={16} className="text-accent" />
                  <span className="text-base font-bold font-black text-foreground uppercase tracking-widest pt-0.5">สแกนคิวอาร์</span>
               </button>
            </div>
          </form>
        </div>

        <div className="text-center pt-4">
           <p className="text-base font-bold text-muted-foreground font-medium">
             หากยังไม่มีบัญชี? <button onClick={() => router.push('/mobile/apply')} className="text-primary font-black uppercase tracking-widest">ลงทะเบียนสมัครคนขับ</button>
           </p>
        </div>

        <div className="flex justify-center gap-8 pt-10 border-t border-border/5">
             <Shield size={16} className="text-muted-foreground" />
             <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-primary/50" /></div>
             <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-slate-700" /></div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="bg-background border-border/10 rounded-[2.5rem] p-8 max-w-[90vw] md:max-w-md">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-2">
              <Lock size={32} />
            </div>
            <DialogTitle className="text-2xl font-black text-foreground text-center uppercase tracking-tighter italic">ลืมรหัสผ่าน?</DialogTitle>
            <DialogDescription className="text-muted-foreground text-center font-bold text-lg font-bold uppercase tracking-widest leading-relaxed">
              กรุณาจัดเตรียม &quot;รหัสพนักงาน&quot; และติดต่อหัวหน้าสายงาน หรือ ฝ่ายบุคคลประจำสาขาของท่านเพื่อดำเนินการรีเซ็ตรหัสผ่านใหม่
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 mt-8">
            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-2xl border border-border/10 border-dashed">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                <Phone size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">สาขาของท่าน</span>
                <span className="text-foreground uppercase tracking-tight italic">ติดต่อสาขาโดยตรง</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-2xl border border-border/10 border-dashed">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Headphones size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">ฝ่ายสนับสนุนส่วนกลาง</span>
                <span className="text-foreground uppercase tracking-tight italic">โทร. 02-XXX-XXXX</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setIsForgotOpen(false)}
            className="w-full h-14 mt-8 bg-muted/50 hover:bg-muted/80 text-foreground rounded-2xl font-black uppercase tracking-widest text-base font-bold border border-border/10"
          >
            เข้าใจแล้ว
          </Button>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal */}
      <QRScannerModal 
        isOpen={isQRScannerOpen} 
        onOpenChange={setIsQRScannerOpen}
        onScanSuccess={handleQRScanSuccess}
      />
    </div>
  )
}

export default function DriverLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <DriverLoginContent />
    </Suspense>
  )
}

