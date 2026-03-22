"use client"

import { useState, useEffect } from "react"
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
import Image from "next/image"

export default function DriverLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
  const [identifier, setIdentifier] = useState("")

  const urlError = searchParams.get("error")

  useEffect(() => {
    if (urlError) {
      if (urlError === 'session_missing') {
        setError("กรุณาเข้าสู่ระบบก่อนใช้งาน")
      } else if (urlError === 'session_invalid') {
        setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่")
      } else {
        setError(urlError)
      }
    }
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
      setError("กรุณากรอกรหัสพนักงานหรือเบอร์โทรก่อนสแกน")
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
    } catch (err: any) {
      console.error(err)
      setError(err.message || "เกิดข้อผิดพลาดในการสแกน")
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
    } catch (err: any) {
      console.error(err)
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย QR")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Decor */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] translate-y-1/2 animate-pulse" />
      
      <div className="w-full max-w-sm space-y-8 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="w-32 h-32 mx-auto bg-[#050110]/80 border border-white/10 rounded-[3rem] overflow-hidden relative shadow-2xl shadow-primary/20 p-2">
             <Image src="/logo-tactical.png" alt="LogisPro Logo" fill className="object-cover" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter">Logis<span className="text-primary">Pro</span></h1>
            <p className="text-slate-400 text-sm font-bold">ขนส่งง่ายๆ มั่นใจทุกการจัดส่ง</p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel rounded-[2.5rem] p-8 shadow-2xl relative">
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="identifier" className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">รหัสพนักงาน / เบอร์โทรศัพท์</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                <Input 
                  id="identifier" 
                  name="identifier" 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="กรอกไอดี หรือ เบอร์โทร..." 
                  className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-14 rounded-2xl focus:ring-primary/50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end ml-1">
                <Label htmlFor="password" className="text-slate-400 text-[10px] font-black uppercase tracking-widest">รหัสผ่านปลอดภัย</Label>
                <button 
                  type="button" 
                  onClick={() => setIsForgotOpen(true)}
                  className="text-[10px] font-black text-primary/80 uppercase tracking-widest hover:text-primary"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-14 rounded-2xl focus:ring-primary/50 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-center font-bold animate-shake">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-16 text-xs font-black uppercase tracking-[0.3em] bg-primary hover:brightness-110 shadow-xl shadow-primary/20 rounded-2xl transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.4em]"><span className="bg-[#050110] px-4 text-slate-600">หรือเข้าสู่ระบบด้วย</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                 type="button" 
                 onClick={handleBiometricLogin}
                 disabled={loading}
                 className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50"
               >
                  <Fingerprint size={16} className="text-primary" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest pt-0.5">สแกนนิ้ว/หน้า</span>
               </button>
               <button 
                 type="button" 
                 onClick={() => setIsQRScannerOpen(true)}
                 disabled={loading}
                 className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50"
               >
                  <QrCode size={16} className="text-accent" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest pt-0.5">สแกนคิวอาร์</span>
               </button>
            </div>
          </form>
        </div>

        <div className="text-center pt-4">
           <p className="text-[10px] text-slate-500 font-medium">
             หากยังไม่มีบัญชี? <button onClick={() => router.push('/mobile/apply')} className="text-primary font-black uppercase tracking-widest">ลงทะเบียนสมัครคนขับ</button>
           </p>
        </div>

        <div className="flex justify-center gap-8 pt-10 border-t border-white/5">
             <Shield size={16} className="text-slate-700" />
             <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-primary/50" /></div>
             <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-slate-700" /></div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="bg-[#050110] border-white/10 rounded-[2.5rem] p-8 max-w-[90vw] md:max-w-md">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-2">
              <Lock size={32} />
            </div>
            <DialogTitle className="text-2xl font-black text-white text-center uppercase tracking-tighter italic">ลืมรหัสผ่าน?</DialogTitle>
            <DialogDescription className="text-slate-400 text-center font-bold text-xs uppercase tracking-widest leading-relaxed">
              กรุณาจัดเตรียม &quot;รหัสพนักงาน&quot; และติดต่อหัวหน้าสายงาน หรือ ฝ่ายบุคคลประจำสาขาของท่านเพื่อดำเนินการรีเซ็ตรหัสผ่านใหม่
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 mt-8">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 border-dashed">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                <Phone size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">สาขาของท่าน</span>
                <span className="text-xs font-black text-white uppercase tracking-tight italic">ติดต่อสาขาโดยตรง</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 border-dashed">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Headphones size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ฝ่ายสนับสนุนส่วนกลาง</span>
                <span className="text-xs font-black text-white uppercase tracking-tight italic">โทร. 02-XXX-XXXX</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setIsForgotOpen(false)}
            className="w-full h-14 mt-8 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10"
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
