"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, ArrowLeft, Key, Lock, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export default function SecuritySettingsPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน")
      return
    }
    if (password.length < 6) {
      alert("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: password })

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message)
    } else {
      alert("อัพเดทรหัสผ่านเรียบร้อยแล้ว")
      setPassword("")
      setConfirmPassword("")
    }
    setLoading(false)
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-white" onClick={() => router.back()}>
          <ArrowLeft className="mr-2" size={20} />
          กลับไปตั้งค่า
        </Button>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Shield className="text-emerald-400" />
          ความปลอดภัย
        </h1>
        <p className="text-slate-400">จัดการรหัสผ่านและความปลอดภัยของบัญชี</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Change Password */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Key size={20} className="text-indigo-400" />
              เปลี่ยนรหัสผ่าน
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">รหัสผ่านใหม่</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <Input 
                        type="password" 
                        className="pl-10" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <Input 
                        type="password" 
                        className="pl-10" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
              </div>
              <Button onClick={handleUpdatePassword} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500">
                {loading ? "กำลังอัพเดท..." : "อัพเดทรหัสผ่าน"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2FA (Placeholder) */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Smartphone size={20} className="text-indigo-400" />
                        การยืนยันตัวตน 2 ขั้นตอน (2FA)
                    </h3>
                    <p className="text-sm text-slate-500">เพิ่มความปลอดภัยด้วยการยืนยันผ่าน Authenticatior App</p>
                </div>
                <Button variant="outline" disabled>เร็วๆ นี้</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
