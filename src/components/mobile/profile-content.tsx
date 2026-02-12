"use client"

import { Fuel, Wrench, ClipboardCheck, Bell, Settings, ChevronRight, LogOut } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProfileContentProps {
  session: {
    driverId: string
    driverName: string
    role?: string
  }
}

export function ProfileContent({ session }: ProfileContentProps) {
  const menuItems = [
    { icon: Fuel, label: "แจ้งเติมน้ำมัน", href: "/mobile/fuel" },
    { icon: Wrench, label: "แจ้งซ่อมบำรุง", href: "/mobile/maintenance" },
    { icon: ClipboardCheck, label: "เช็คสภาพรถ", href: "/mobile/vehicle-check" },
    { icon: Bell, label: "การแจ้งเตือน", href: "#" },
    { icon: Settings, label: "ตั้งค่า", href: "#" },
  ]

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === "#") {
      e.preventDefault()
      // Use window.alert for immediate feedback on mobile
      window.alert("ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนาครับ")
    }
  }

  return (
    <>
      {/* Profile Header */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 mb-4">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/20">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.driverName}`} />
              <AvatarFallback className="bg-blue-800 text-white text-xl">
                {session?.driverName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-white">
              <h1 className="text-xl font-bold">{session.driverName}</h1>
              <p className="text-blue-200 text-sm">Driver ID: {session.driverId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card className="bg-slate-900 border-slate-800 mb-4">
        <CardContent className="py-2">
          {menuItems.map((item, index) => (
            <Link 
              key={index} 
              href={item.href}
              onClick={(e) => handleItemClick(e, item.href)}
              className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0 active:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-300">
                <item.icon className="w-5 h-5 text-slate-500" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Logout Button */}
      <Link href="/login">
        <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
          <LogOut className="w-4 h-4 mr-2" />
          ออกจากระบบ
        </Button>
      </Link>
    </>
  )
}
