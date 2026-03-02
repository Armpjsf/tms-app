"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Save, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getUserProfile, updateUserProfile, UserProfile } from "@/lib/supabase/users"
import { toast } from "sonner"

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    First_Name: "",
    Last_Name: "",
    Email: "",
    Username: "",
    Role: ""
  })

  useEffect(() => {
    async function loadProfile() {
      const profile = await getUserProfile()
      if (profile) {
        setFormData(profile)
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleSave = async () => {
    // Validation
    if (!formData.First_Name?.trim()) {
        toast.error("กรุณาระบุชื่อจริง")
        return
    }
    if (!formData.Last_Name?.trim()) {
        toast.error("กรุณาระบุนามสกุล")
        return
    }
    if (!formData.Email?.trim()) {
        toast.error("กรุณาระบุอีเมล")
        return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.Email)) {
        toast.error("รูปแบบอีเมลไม่ถูกต้อง")
        return
    }

    setSaving(true)
    try {
        const result = await updateUserProfile(formData)
        if (result.success) {
            toast.success("บันทึกข้อมูลสำเร็จ")
            // Re-load profile to get synced Name or other DB-side updates
            const updatedProfile = await getUserProfile()
            if (updatedProfile) {
                setFormData(updatedProfile)
            }
        } else {
            toast.error(result.error || "เกิดข้อผิดพลาดในการบันทึก")
        }
    } catch {
        toast.error("เกิดข้อผิดพลาด")
    } finally {
        setSaving(false)
    }
  }

  if (loading) {
      return (
          <DashboardLayout>
              <div className="flex items-center justify-center h-[50vh]">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
          </DashboardLayout>
      )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/settings" className="flex items-center text-gray-500 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าตั้งค่า
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <User className="text-emerald-600" />
          ข้อมูลโปรไฟล์
        </h1>
        <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลส่วนตัวของผู้ดูแลระบบ</p>
      </div>

      <Card className="bg-white/80 border-gray-200 max-w-2xl">
        <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {(formData.First_Name || "A").charAt(0)}
                </div>
                <div>
                   <Button variant="outline" className="border-gray-200 text-gray-700">
                      เปลี่ยนรูปโปรไฟล์
                   </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-gray-500">ชื่อจริง</Label>
                    <Input 
                        value={formData.First_Name || ""}
                        onChange={(e) => setFormData({...formData, First_Name: e.target.value})}
                        className="bg-gray-100 border-gray-200 text-white"
                        placeholder="ชื่อจริง"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-gray-500">นามสกุล</Label>
                    <Input 
                        value={formData.Last_Name || ""}
                        onChange={(e) => setFormData({...formData, Last_Name: e.target.value})}
                        className="bg-gray-100 border-gray-200 text-white"
                        placeholder="นามสกุล"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-gray-500">อีเมล (ติดต่อ)</Label>
                <Input 
                    value={formData.Email || ""}
                    onChange={(e) => setFormData({...formData, Email: e.target.value})}
                    className="bg-gray-100 border-gray-200 text-white"
                    placeholder="example@company.com"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-gray-500">Username (สำหรับเข้าสู่ระบบ)</Label>
                <Input 
                    value={formData.Username || ""}
                    disabled
                    className="bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-gray-500">บทบาท</Label>
                <Input 
                    value={formData.Role || "User"}
                    disabled
                    className="bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                />
            </div>

            <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    บันทึกการเปลี่ยนแปลง
                </Button>
            </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
