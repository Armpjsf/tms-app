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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Cinematic Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/login-bg.png" 
          alt="Transport Background" 
          fill 
          className="object-cover opacity-20 mix-blend-overlay"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40" />
      </div>

      {/* Glass Decor Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] translate-y-1/2 animate-pulse" />
      
      <div className="w-full max-w-5xl space-y-12 relative z-10 text-center">
        {/* Logo & Header Section */}
        <div className="space-y-6 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
                        <div className="relative w-48 h-48 rounded-[3.5rem] bg-[#050110]/80 border-2 border-white/10 flex items-center justify-center shadow-2xl shadow-primary/20 overflow-hidden ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-700">
                             <Image src="/logo-tactical.png" alt="LogisPro" fill className="object-cover p-4" priority />
                        </div>
            <div className="space-y-2">
                <h1 className="text-7xl font-black text-white tracking-tighter drop-shadow-lg">
                    Logis<span className="text-primary">Pro</span>
                </h1>
                <p className="text-xl text-slate-400 font-medium tracking-wide">
                    Sweet deliveries, serious logistics.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            {/* Driver Login Option */}
            <div 
                onClick={() => router.push('/mobile/login')}
                className="group cursor-pointer relative overflow-hidden glass-panel rounded-[3rem] p-12 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(255,30,133,0.15)] hover:-translate-y-3 text-center flex flex-col items-center gap-8"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 bg-slate-900 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl group-hover:rotate-6 group-hover:bg-primary transition-all duration-700">
                    <Truck className="text-white w-10 h-10" strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">DRIVER</h2>
                    <p className="text-slate-500 text-base font-bold font-black uppercase tracking-[0.3em]">Fleet Portal</p>
                </div>
                <button className="w-full h-16 rounded-2xl bg-primary hover:brightness-110 text-white font-black text-lg font-bold uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all">
                    Start Engine
                </button>
            </div>

            {/* Staff Login Option */}
            <div 
                onClick={() => setActiveTab('staff_form')}
                className="group cursor-pointer relative overflow-hidden glass-panel rounded-[3rem] p-12 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(147,51,234,0.15)] hover:-translate-y-3 text-center flex flex-col items-center gap-8"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 bg-slate-900 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl group-hover:-rotate-6 group-hover:bg-accent transition-all duration-700">
                    <Shield className="text-white w-10 h-10" strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">ADMIN</h2>
                    <p className="text-slate-500 text-base font-bold font-black uppercase tracking-[0.3em]">Command Center</p>
                </div>
                <button className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-lg font-bold uppercase tracking-[0.3em] shadow-2xl transition-all">
                    Command Key
                </button>
            </div>
        </div>

        {/* Staff Login Modal */}
        {activeTab === 'staff_form' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-purple-500" />
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-6 top-6 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                        onClick={() => setActiveTab('info')}
                    >
                        <X className="w-6 h-6" />
                    </Button>
                    
                    <div className="text-center mb-10">
                        <h3 className="text-3xl font-black text-white mb-2 underline decoration-primary/30 underline-offset-8">Login</h3>
                        <p className="text-xl text-slate-400 font-medium tracking-tight">Enterprise staff authentication</p>
                    </div>

                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-3 text-left">
                            <Label htmlFor="email" className="text-slate-400 text-base font-bold font-black uppercase tracking-widest ml-1">Username / Fleet ID</Label>
                            <Input 
                                id="email" 
                                name="email" 
                                type="text" 
                                placeholder="e.g. admin_pro_01" 
                                required 
                                className="h-14 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-primary/50" 
                            />
                        </div>
                        <div className="space-y-3 text-left">
                            <Label htmlFor="password" className="text-slate-400 text-base font-bold font-black uppercase tracking-widest ml-1">Security Key</Label>
                            <Input 
                                id="password" 
                                name="password" 
                                type="password" 
                                placeholder="••••••••" 
                                required 
                                className="h-14 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-primary/50" 
                            />
                        </div>
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-lg font-bold font-bold rounded-xl animate-shake">
                                {error === 'Invalid credentials' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 
                                 error === 'session_missing' ? 'กรุณาเข้าสู่ระบบก่อนใช้งาน' :
                                 error === 'session_invalid' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : 
                                 error}
                            </div>
                        )}
                        <Button type="submit" className="w-full h-14 bg-primary hover:brightness-110 text-white font-black text-lg rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                            {loading ? "AUTHENTICATING..." : "CONFIRM LOGIN"}
                        </Button>
                    </form>
                </div>
            </div>
        )}

        <div className="space-y-4 animate-in fade-in duration-1000 delay-700 pt-10">
            <p className="text-base font-bold text-slate-600 font-black uppercase tracking-[0.2em]">
                © 2024 <span className="text-primary/60">LOGIS-PRO</span> COMMAND. ALL RIGHTS RESERVED.
            </p>
            <div className="flex justify-center gap-8 text-base font-bold text-slate-500 font-black uppercase tracking-widest">
                <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                <a href="#" className="hover:text-primary transition-colors">Terms</a>
            </div>
        </div>
      </div>
    </div>
  )
}

