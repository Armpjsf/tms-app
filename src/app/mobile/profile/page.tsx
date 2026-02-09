"use client"

import { User, Phone, Mail, ChevronRight, LogOut, Settings, Bell, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

export default function ProfilePage() {
  const user = {
    name: "สมชาย ใจดี",
    phone: "081-234-5678",
    email: "driver@logis-pro.com",
    role: "Driver",
  }

  const menuItems = [
    { icon: Bell, label: "การแจ้งเตือน", href: "#" },
    { icon: Settings, label: "ตั้งค่า", href: "#" },
    { icon: Shield, label: "ความปลอดภัย", href: "#" },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/20">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
              <AvatarFallback className="bg-blue-800 text-white text-xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-white">
              <h1 className="text-xl font-bold">{user.name}</h1>
              <p className="text-blue-200 text-sm">{user.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3 text-slate-300">
            <Phone className="w-4 h-4 text-slate-500" />
            <span>{user.phone}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <Mail className="w-4 h-4 text-slate-500" />
            <span>{user.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="py-2">
          {menuItems.map((item, index) => (
            <Link 
              key={index} 
              href={item.href}
              className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0"
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
    </div>
  )
}
