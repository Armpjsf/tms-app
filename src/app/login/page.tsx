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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      router.push('/mobile/login');
    }
  }, [router]);

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    await login(formData)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2" />

      <div className="w-full max-w-sm space-y-8 relative">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
             <Shield className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">LOGIS-PRO 360</h1>
          <p className="text-slate-400">เข้าสู่ระบบสำหรับเจ้าหน้าที่และผู้บริหาร</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">ชื่อผู้ใช้งาน</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <Input 
                id="email" 
                name="email" 
                type="text" 
                placeholder="ระบุชื่อผู้ใช้งาน" 
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">รหัสผ่าน</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••" 
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 h-12"
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
            className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20"
            disabled={loading}
          >
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <div className="pt-4 border-t border-white/5 text-center">
           <p className="text-xs text-slate-500 mb-2">เข้าสู่ระบบสำหรับพนักงานขับรถ?</p>
           <Button variant="link" className="text-blue-400 text-xs h-auto p-0" onClick={() => router.push('/mobile/login')}>
             ไปที่หน้า Driver Login (พนักงานขับรถ)
           </Button>
        </div>

        <p className="text-center text-[10px] text-slate-600">
          © 2024 LOGIS-PRO TMS. สงวนลิขสิทธิ์
        </p>
      </div>
    </div>
  )
}
