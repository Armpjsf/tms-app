"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, User, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "./actions"

export default function StaffLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  
  const error = searchParams.get("error")

  // Mobile detection and redirect
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      
      if (isMobile || isSmallScreen) {
        router.replace('/mobile/login');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [router]);

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    await login(formData)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Decor */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px] translate-y-1/2 animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[150px]" />
      
      {/* Glass Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 relative">
        {/* Glass Login Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-4 ring-4 ring-emerald-500/10">
             <Shield className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">LOGIS-PRO 360</h1>
          <p className="text-gray-500">เข้าสู่ระบบสำหรับเจ้าหน้าที่และผู้บริหาร</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-800">ชื่อผู้ใช้งาน</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                id="email" 
                name="email" 
                type="text" 
                placeholder="ระบุชื่อผู้ใช้งาน" 
                className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl focus:ring-emerald-500/50 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-800">รหัสผ่าน</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••" 
                className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl focus:ring-emerald-500/50 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error === "Invalid credentials" ? "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" : error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/20 rounded-xl"
            disabled={loading}
          >
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
        </div> {/* end glass card */}

        <div className="pt-4 border-t border-gray-200 text-center">
           <p className="text-xs text-gray-400 mb-2">เข้าสู่ระบบสำหรับพนักงานขับรถ?</p>
           <Button variant="link" className="text-emerald-600 text-xs h-auto p-0" onClick={() => router.push('/mobile/login')}>
             ไปที่หน้า Driver Login (พนักงานขับรถ)
           </Button>
        </div>

        <p className="text-center text-[10px] text-gray-500">
          © 2024 LOGIS-PRO TMS. สงวนลิขสิทธิ์
        </p>
      </div>
    </div>
  )
}
