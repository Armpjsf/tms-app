"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginDriver } from "@/lib/actions/auth-actions"
import Image from "next/image"

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Decor */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] translate-y-1/2 animate-pulse" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 relative">
        {/* Glass Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
        <div className="text-center space-y-2 relative">
          <div className="w-24 h-24 mx-auto flex items-center justify-center mb-2">
             <Image src="/logo.png" alt="LOGIS Driver Logo" width={80} height={80} className="w-full h-full object-contain" priority />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">LOGIS Driver</h1>
          <p className="text-gray-500 font-medium">เข้าสู่ระบบพนักงานขับรถ</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="identifier" className="text-gray-800 text-sm font-semibold">เบอร์โทรศัพท์ หรือ ชื่อผู้ใช้งาน</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
              <Input 
                id="identifier" 
                name="identifier" 
                type="text" 
                inputMode="text"
                placeholder="0XXXXXXXXX" 
                className="pl-12 bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-400 h-14 text-lg rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="password" className="text-gray-800 text-sm font-semibold">รหัสผ่าน</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••" 
                className="pl-12 bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-400 h-14 text-lg rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
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

        <div className="flex flex-col items-center gap-4 mt-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/login?type=staff')}
            className="text-gray-400 hover:text-blue-500 hover:bg-blue-50/50 text-xs font-medium"
          >
            เข้าสู่ระบบเจ้าหน้าที่ (Staff/Admin)
          </Button>
          <p className="text-center text-[10px] text-gray-500">
            © 2024 LOGIS-PRO TMS. สงวนลิขสิทธิ์
          </p>
        </div>
      </div>
    </div>
  )
}
