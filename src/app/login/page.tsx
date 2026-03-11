"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Shield, X, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "./actions"
import Image from "next/image"

export default function StaffLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'staff_form'>('info')
  
  const error = searchParams.get("error")

  // Mobile detection and redirect
  useEffect(() => {
    const checkMobile = () => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('type') === 'staff') return; // Bypass redirect

      const userAgent = navigator.userAgent || navigator.vendor || (window as { opera?: string }).opera;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent || '');
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Cinematic Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/login-bg.png" 
          alt="Transport Background" 
          fill 
          className="object-cover opacity-40 mix-blend-overlay"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/40" />
      </div>

      {/* Glass Decor Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/2 animate-pulse" />
      
      <div className="w-full max-w-5xl space-y-12 relative z-10 text-center">
        {/* Logo & Header Section */}
        <div className="space-y-6 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="w-24 h-24 p-4 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Image src="/logo.png" alt="LOGIS Driver Logo" width={64} height={64} className="w-full h-full object-contain relative z-10" />
            </div>
            <div className="space-y-2">
                <h1 className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                    LOGIS-PRO <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">360</span>
                </h1>
                <p className="text-xl text-slate-300 font-medium tracking-wide">
                    The Ultimate Transport Management Solution
                </p>
                <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full mt-4 shadow-lg shadow-emerald-500/20" />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            {/* Driver Login Option */}
            <div 
                onClick={() => router.push('/mobile/login')}
                className="group cursor-pointer relative overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-emerald-500/50 rounded-[2.5rem] p-10 shadow-2xl transition-all hover:shadow-emerald-500/10 hover:-translate-y-2 text-center flex flex-col items-center gap-6"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20 group-hover:rotate-6 transition-all">
                    <Truck className="text-white w-10 h-10" />
                </div>
                <div className="space-y-2 relative z-10">
                    <h2 className="text-3xl font-bold text-white">พนักงานขับรถ</h2>
                    <p className="text-slate-400 text-sm leading-relaxed px-4">ระบบนำทางงานขนส่ง, เช็คอินจุดส่งของ และรายงานสถานะแบบ Real-time</p>
                </div>
                <Button className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg mt-4 shadow-lg shadow-emerald-500/20 border-none relative z-10">
                    เข้าสู่ระบบ Driver
                </Button>
            </div>

            {/* Staff Login Option */}
            <div 
                onClick={() => setActiveTab('staff_form')}
                className="group cursor-pointer relative overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-blue-500/50 rounded-[2.5rem] p-10 shadow-2xl transition-all hover:shadow-blue-500/10 hover:-translate-y-2 text-center flex flex-col items-center gap-6"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 group-hover:-rotate-6 transition-all">
                    <Shield className="text-white w-10 h-10" />
                </div>
                <div className="space-y-2 relative z-10">
                    <h2 className="text-3xl font-bold text-white">ผู้บริหาร / เจ้าหน้าที่</h2>
                    <p className="text-slate-400 text-sm leading-relaxed px-4">แดชบอร์ดควบคุม, วางแผนเที่ยวรถ, จัดการคิวงาน และรายงานวิเคราะห์ข้อมูล</p>
                </div>
                <Button variant="outline" className="w-full h-14 rounded-2xl border-2 border-blue-500/30 text-blue-400 font-bold text-lg mt-4 hover:bg-blue-500 hover:text-white transition-all relative z-10">
                    เข้าสู่ระบบ Staff / Admin
                </Button>
            </div>
        </div>

        {/* Staff Login Modal */}
        {activeTab === 'staff_form' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-6 top-6 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                        onClick={() => setActiveTab('info')}
                    >
                        <X className="w-6 h-6" />
                    </Button>
                    
                    <div className="text-center mb-10">
                        <h3 className="text-3xl font-black text-white mb-2">Login เข้าสู่ระบบ</h3>
                        <p className="text-sm text-slate-400 font-medium">ระบุบัญชีผู้ใช้สำหรับเจ้าหน้าที่จัดการ</p>
                    </div>

                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-3 text-left">
                            <Label htmlFor="email" className="text-slate-300 font-semibold ml-1">ชื่อผู้ใช้งาน</Label>
                            <Input 
                                id="email" 
                                name="email" 
                                type="text" 
                                placeholder="Username" 
                                required 
                                className="h-14 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:ring-emerald-500/50" 
                            />
                        </div>
                        <div className="space-y-3 text-left">
                            <Label htmlFor="password" className="text-slate-300 font-semibold ml-1">รหัสผ่าน</Label>
                            <Input 
                                id="password" 
                                name="password" 
                                type="password" 
                                placeholder="••••••••" 
                                required 
                                className="h-14 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:ring-emerald-500/50" 
                            />
                        </div>
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl animate-shake">
                                {error === 'Invalid credentials' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : error}
                            </div>
                        )}
                        <Button type="submit" className="w-full h-14 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                            {loading ? "กำลังตรวจสอบ..." : "ยืนยันการเข้าสู่ระบบ"}
                        </Button>
                    </form>
                </div>
            </div>
        )}

        <div className="space-y-4 animate-in fade-in duration-1000 delay-700">
            <p className="text-sm text-slate-500 font-medium">
                © 2024 <span className="text-slate-400">LOGIS-PRO TMS</span>. All Rights Reserved.
            </p>
            <div className="flex justify-center gap-6 text-xs text-slate-600 font-bold">
                <a href="#" className="hover:text-emerald-400 transition-colors">นโยบายความเป็นส่วนตัว</a>
                <a href="#" className="hover:text-emerald-400 transition-colors">เงื่อนไขการใช้งาน</a>
            </div>
        </div>
      </div>
    </div>
  )
}
