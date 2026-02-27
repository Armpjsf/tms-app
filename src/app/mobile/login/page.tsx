"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, User, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginDriver } from "@/lib/actions/auth-actions"

export default function DriverLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")
    
    const result = await loginDriver(formData)
    
    if (result.error) {
      setError(result?.error === "Invalid credentials" ? "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" : result.error)
      setLoading(false)
    } else {
      router.push("/mobile/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Decor */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] translate-y-1/2 animate-pulse" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 relative">
        {/* Glass Card */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
        <div className="text-center space-y-2 relative">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/30 mb-4 ring-4 ring-blue-500/10">
             <Truck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">LOGIS Driver</h1>
          <p className="text-slate-400 font-medium">เข้าสู่ระบบพนักงานขับรถ</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="identifier" className="text-slate-200 text-sm">เบอร์โทรศัพท์ หรือ ชื่อผู้ใช้งาน</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <Input 
                id="identifier" 
                name="identifier" 
                type="text" 
                inputMode="text"
                placeholder="0XXXXXXXXX" 
                className="pl-12 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 h-14 text-lg rounded-xl focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="password" className="text-slate-200 text-sm">รหัสผ่าน</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••" 
                className="pl-12 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 h-14 text-lg rounded-xl focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/30 rounded-xl transition-all active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
        </div> {/* end glass card */}

        <div className="pt-4 text-center">
           <Button variant="link" className="text-slate-500 text-xs" onClick={() => router.push('/login')}>
             เข้าสู่ระบบสำหรับเจ้าหน้าที่?
           </Button>
        </div>

        <p className="text-center text-[10px] text-slate-600">
          © 2024 LOGIS-PRO TMS. สงวนลิขสิทธิ์
        </p>
      </div>
    </div>
  )
}
