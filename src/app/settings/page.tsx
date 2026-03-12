"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  Settings, 
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  LogOut,
  ChevronRight,
  Building,
  Loader2,
} from "lucide-react"
import { getUserProfile, UserProfile } from "@/lib/supabase/users"

const settingsSections = [
  {
    title: "บัญชีผู้ใช้",
    icon: User,
    items: [
      { label: "ข้อมูลโปรไฟล์", desc: "ชื่อ, อีเมล, รูปภาพ", path: "/settings/profile" },
      { label: "เปลี่ยนรหัสผ่าน", desc: "อัพเดทรหัสผ่านของคุณ", path: "/settings/security" },
    ]
  },
  {
    title: "องค์กรและผู้ใช้งาน",
    icon: Building,
    items: [
        { label: "ข้อมูลบริษัท", desc: "โลโก้, ที่อยู่, เลขผู้เสียภาษี", path: "/settings/company" },
        { label: "บทบาทและสิทธิ์", desc: "กำหนดสิทธิ์การใช้งาน", path: "/settings/roles" },
        { label: "จัดการผู้ใช้งาน", desc: "เพิ่ม/ลบ พนักงาน", path: "/settings/users" },
        { label: "จัดการสาขาและอีเมล", desc: "ตั้งค่าอีเมลผู้ส่งแยกตามสาขา", path: "/settings/branches" },
        { label: "จัดการบริษัทรถร่วม", desc: "จัดการนิติบุคคลและบัญชีธนาคารส่วนกลาง", path: "/settings/subcontractors" },
        { label: "จัดการประเภทรถ", desc: "กำหนดประเภทรถ (4 ล้อ, 6 ล้อ, ฯลฯ)", path: "/settings/vehicle-types" },
    ]
  },
  {
    title: "การแจ้งเตือน",
    icon: Bell,
    items: [
      { label: "ตั้งค่าการแจ้งเตือน", desc: "Push, Email, SOS", path: "/settings/notifications" },
    ]
  },
  {
    title: "ระบบบัญชีและการเงิน",
    icon: Database,
    items: [
      { label: "การเชื่อมต่อ Akaunting", desc: "ตรวจสอบสถานะการเชื่อมต่อ และการส่งข้อมูล", path: "/settings/accounting" },
    ]
  },
  {
    title: "ธีมและการแสดงผล",
    icon: Palette,
    items: [
      { label: "ปรับแต่งธีม", desc: "โหมดมืด/สว่าง, ขนาดตัวอักษร", path: "/settings/theme" },
    ]
  },
  {
    title: "ความปลอดภัย",
    icon: Shield,
    items: [
      { label: "การตั้งค่าความปลอดภัย", desc: "2FA, อุปกรณ์ที่เข้าสู่ระบบ", path: "/settings/security" },
    ]
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadProfile() {
      const data = await getUserProfile()
      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                <Settings size={32} />
            </div>
            Terminal Configuration
            </h1>
            <p className="text-emerald-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">System Parameter & Account Management</p>
        </div>
      </motion.div>

      {/* User Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="bg-slate-950/80 backdrop-blur-xl border-slate-800 rounded-br-[4rem] rounded-tl-[2rem] shadow-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />
          <CardContent className="p-10 relative z-10">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white text-4xl font-black shadow-inner shadow-emerald-500/10 overflow-hidden relative">
                   <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                  {(profile?.First_Name || profile?.Username || "A").charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                      <h2 className="text-3xl font-black text-white tracking-tighter">
                        {profile ? `${profile.First_Name || ""} ${profile.Last_Name || ""}`.trim() || profile.Username : "Operator Alpha"}
                      </h2>
                      <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Verified ID</span>
                      </div>
                  </div>
                  <p className="text-slate-400 font-bold tracking-tight text-lg mb-4">{profile?.Email || "ops_command@tms.system"}</p>
                  
                  <div className="flex items-center justify-center md:justify-start gap-6">
                      <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap mb-1">Assigned Role</span>
                          <span className="text-xs font-black text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 uppercase tracking-[0.1em]">{profile?.Role || "Operational Staff"}</span>
                      </div>
                      <div className="h-10 w-px bg-slate-800 hidden md:block" />
                      <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap mb-1">Session Identity</span>
                          <span className="text-xs font-black text-slate-300">@{profile?.Username || "operator_001"}</span>
                      </div>
                  </div>
                </div>
                <Button 
                    className="h-14 px-8 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
                    onClick={() => handleNavigate("/settings/profile")}
                >
                    Edit Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsSections.map((section, sectionIndex) => {
            // Filter items based on role
            const filteredItems = section.items.filter(item => {
                if (item.path === '/settings/roles') {
                    // Allow Super Admin and Admin to see Roles
                    return ['Super Admin', 'Admin'].includes(profile?.Role || '')
                }
                return true
            })

            if (filteredItems.length === 0) return null

            return (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + sectionIndex * 0.05 }}
          >
            <Card className="bg-white/80 backdrop-blur-md border-white/50 h-full hover:border-emerald-500/50 transition-all rounded-br-[3rem] rounded-tl-[1.5rem] shadow-xl overflow-hidden group/section">
              <CardHeader className="bg-slate-950/5 border-b border-black/5 p-6">
                <CardTitle className="flex items-center gap-3 text-sm font-black text-slate-900 uppercase tracking-[0.2em]">
                  <div className="p-2 bg-slate-950 rounded-lg text-white group-hover/section:bg-emerald-500 transition-colors">
                    <section.icon size={18} />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ x: 6 }}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-950 hover:text-white cursor-pointer transition-all group"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <div>
                      <p className="font-black text-sm tracking-tight">{item.label}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">{item.desc}</p>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-emerald-400 transition-colors" size={18} />
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )})}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <Database className="text-primary" size={20} />
              ระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all border-border text-muted-foreground" onClick={() => handleNavigate("/settings/backup")}>
                <Database size={24} />
                <span>สำรองข้อมูล</span>
              </Button>
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50 transition-all border-border text-muted-foreground" onClick={() => handleNavigate("/settings/api")}>
                <Globe size={24} />
                <span>เชื่อมต่อ API</span>
              </Button>
              <Button variant="destructive" className="gap-2 h-auto py-4 flex-col hover:bg-red-600 hover:text-white transition-all w-full" onClick={() => window.location.href = "/api/auth/logout"}>
                <LogOut size={24} />
                <span>ออกจากระบบ</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Version Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-muted-foreground text-sm"
      >
        <p>TMS ePOD v2.0.0</p>
        <p className="text-xs mt-1">© 2024 Your Company. All rights reserved.</p>
      </motion.div>
    </DashboardLayout>
  )
}

