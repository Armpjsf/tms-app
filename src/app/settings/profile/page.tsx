"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Save, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "Admin",
    lastName: "User",
    email: "admin@company.com",
    role: "Super Admin"
  })

  // TODO: Load real profile from Supabase Auth or Profile table
  // For now, we mock the initial state but allow editing

  const handleSave = async () => {
    setLoading(true)
    try {
        // Simulate API call
        await new Promise(r => setTimeout(r, 1000))
        
        // In reality:
        // const supabase = createClient()
        // await supabase.auth.updateUser({ ... })
        
        alert("บันทึกข้อมูลสำเร็จ (จำลอง)")
    } catch (e) {
        alert("เกิดข้อผิดพลาด")
    } finally {
        setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/settings" className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าตั้งค่า
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <User className="text-indigo-400" />
          ข้อมูลโปรไฟล์
        </h1>
        <p className="text-sm text-slate-400 mt-1">จัดการข้อมูลส่วนตัวของผู้ดูแลระบบ</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
        <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {formData.firstName.charAt(0)}
                </div>
                <div>
                   <Button variant="outline" className="border-slate-700 text-slate-300">
                      เปลี่ยนรูปโปรไฟล์
                   </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-slate-400">ชื่อจริง</Label>
                    <Input 
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-400">นามสกุล</Label>
                    <Input 
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-slate-400">อีเมล</Label>
                <Input 
                    value={formData.email}
                    disabled
                    className="bg-slate-800/50 border-slate-800 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">อีเมลไม่สามารถเปลี่ยนผ่านหน้านี้ได้</p>
            </div>

            <div className="space-y-2">
                <Label className="text-slate-400">บทบาท</Label>
                <Input 
                    value={formData.role}
                    disabled
                    className="bg-slate-800/50 border-slate-800 text-slate-500 cursor-not-allowed"
                />
            </div>

            <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    บันทึกการเปลี่ยนแปลง
                </Button>
            </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
