"use client"

import { Fuel, Wrench, ClipboardCheck, Bell, Settings, ChevronRight, LogOut, AlertTriangle, User, Banknote } from "lucide-react"
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
  score?: {
    totalScore: number
    onTimeScore: number
    safetyScore: number
    acceptanceScore: number
  }
  unreadChatCount?: number
}

export function ProfileContent({ session, score, unreadChatCount = 0 }: ProfileContentProps) {
  const menuItems = [
    { icon: Banknote, label: "สรุปรายได้", href: "/mobile/income-summary" },
    { icon: Fuel, label: "แจ้งเติมน้ำมัน", href: "/mobile/fuel" },
    { icon: Wrench, label: "แจ้งซ่อมบำรุง", href: "/mobile/maintenance" },
    { icon: ClipboardCheck, label: "เช็คสภาพรถ", href: "/mobile/vehicle-check" },
    { icon: Bell, label: "การแจ้งเตือน", href: "/mobile/notifications" },
    { icon: User, label: "ติดต่อแอดมิน", href: "/mobile/chat", badge: unreadChatCount },
    { icon: AlertTriangle, label: "แจ้งเหตุฉุกเฉิน (SOS)", href: "/mobile/sos" },
    { icon: Settings, label: "ตั้งค่า", href: "/mobile/settings" },
  ]

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // If we have any remaining placeholders
    if (href === "#") {
      e.preventDefault()
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

      {/* Performance Scorecard */}
      <Card className="bg-slate-900 border-slate-800 mb-4 overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
            <ClipboardCheck size={100} className="text-white transform rotate-12" />
        </div>
        <CardContent className="pt-6 relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-bold text-white mb-1">คะแนนการทำงาน</h2>
                    <p className="text-slate-400 text-xs">อัปเดตล่าสุด: วันนี้</p>
                </div>
                <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 ${
                    (score?.totalScore || 0) >= 80 ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' :
                    (score?.totalScore || 0) >= 60 ? 'border-amber-500 text-amber-400 bg-amber-500/10' :
                    'border-red-500 text-red-400 bg-red-500/10'
                }`}>
                    <span className="text-xl font-bold">{score?.totalScore || 0}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-800">
                <div>
                   <span className="text-[10px] text-slate-500 uppercase tracking-wider">ตรงเวลา</span>
                   <p className={`text-lg font-bold mt-1 ${
                       (score?.onTimeScore || 0) >= 90 ? 'text-emerald-400' : 'text-slate-300'
                   }`}>{score?.onTimeScore || 0}%</p>
                </div>
                <div>
                   <span className="text-[10px] text-slate-500 uppercase tracking-wider">ปลอดภัย</span>
                   <p className="text-lg font-bold mt-1 text-slate-300">{score?.safetyScore || 0}%</p>
                </div>
                <div>
                   <span className="text-[10px] text-slate-500 uppercase tracking-wider">รับงาน</span>
                   <p className={`text-lg font-bold mt-1 ${
                       (score?.acceptanceScore || 0) >= 90 ? 'text-emerald-400' : 'text-slate-300'
                   }`}>{score?.acceptanceScore || 0}%</p>
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
              <div className="flex items-center gap-2">
                {item.badge && item.badge > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
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
