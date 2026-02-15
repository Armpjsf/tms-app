"use client"

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
} from "lucide-react"

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
  
  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Settings className="text-primary" />
          ตั้งค่า
        </h1>
        <p className="text-muted-foreground">จัดการการตั้งค่าระบบและบัญชีผู้ใช้</p>
      </motion.div>

      {/* User Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg">
                A
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">Admin User</h2>
                <p className="text-muted-foreground">admin@company.com</p>
                <p className="text-xs text-primary mt-1">Super Admin</p>
              </div>
              <Button variant="outline" onClick={() => handleNavigate("/settings/profile")}>แก้ไขโปรไฟล์</Button>
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
            <Card className="bg-card border-border h-full hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <section.icon className="text-primary" size={20} />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {section.items.map((item) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted cursor-pointer transition-colors group"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" size={18} />
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
        className="mt-8 text-center text-muted-foreground text-sm"
      >
        <p>TMS ePOD v2.0.0</p>
        <p className="text-xs mt-1">© 2024 Your Company. All rights reserved.</p>
      </motion.div>
    </DashboardLayout>
  )
}

