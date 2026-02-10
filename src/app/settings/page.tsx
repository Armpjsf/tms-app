"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
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

} from "lucide-react"

const settingsSections = [
  {
    title: "บัญชีผู้ใช้",
    icon: User,
    items: [
      { label: "ข้อมูลโปรไฟล์", desc: "ชื่อ, อีเมล, รูปภาพ" },
      { label: "เปลี่ยนรหัสผ่าน", desc: "อัพเดทรหัสผ่านของคุณ" },
    ]
  },
  {
    title: "การแจ้งเตือน",
    icon: Bell,
    items: [
      { label: "Push Notifications", desc: "รับการแจ้งเตือนบนอุปกรณ์" },
      { label: "แจ้งเตือน Email", desc: "รับสรุปรายวันทาง Email" },
      { label: "แจ้งเตือน SOS", desc: "รับแจ้งเมื่อมีเหตุฉุกเฉิน" },
    ]
  },
  {
    title: "ธีมและการแสดงผล",
    icon: Palette,
    items: [
      { label: "โหมดมืด/สว่าง", desc: "เปลี่ยนธีมการแสดงผล" },
      { label: "ขนาดตัวอักษร", desc: "ปรับขนาดตัวอักษร" },
    ]
  },
  {
    title: "ความปลอดภัย",
    icon: Shield,
    items: [
      { label: "การยืนยันตัวตน 2 ขั้น", desc: "เพิ่มความปลอดภัยบัญชี" },
      { label: "อุปกรณ์ที่เข้าสู่ระบบ", desc: "ดูอุปกรณ์ที่เชื่อมต่อ" },
    ]
  },
]

export default function SettingsPage() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Settings className="text-indigo-400" />
          ตั้งค่า
        </h1>
        <p className="text-slate-400">จัดการการตั้งค่าระบบและบัญชีผู้ใช้</p>
      </motion.div>

      {/* User Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card variant="gradient">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                A
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">Admin User</h2>
                <p className="text-slate-400">admin@company.com</p>
                <p className="text-xs text-indigo-400 mt-1">Super Admin</p>
              </div>
              <Button variant="outline" onClick={() => alert("Edit Profile Feature Coming Soon")}>แก้ไขโปรไฟล์</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + sectionIndex * 0.05 }}
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <section.icon className="text-indigo-400" size={20} />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {section.items.map((item) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                    onClick={() => alert(`Opening ${item.label}...`)}
                  >
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <ChevronRight className="text-slate-500 group-hover:text-indigo-400 transition-colors" size={18} />
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="text-indigo-400" size={20} />
              ระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/50 transition-all" onClick={() => alert("ระบบสำรองข้อมูลยังไม่เปิดใช้งาน")}>
                <Database size={24} />
                <span>สำรองข้อมูล</span>
              </Button>
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50 transition-all" onClick={() => alert("API Connection: Connected")}>
                <Globe size={24} />
                <span>เชื่อมต่อ API</span>
              </Button>
              <Button variant="destructive" className="gap-2 h-auto py-4 flex-col hover:bg-red-600 hover:text-white transition-all" onClick={() => window.location.href = "/"}>
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
        className="mt-8 text-center text-slate-500 text-sm"
      >
        <p>TMS ePOD v2.0.0</p>
        <p className="text-xs mt-1">© 2024 Your Company. All rights reserved.</p>
      </motion.div>
    </DashboardLayout>
  )
}
