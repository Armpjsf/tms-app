"use client"

import { Fuel, Wrench, ClipboardCheck, Bell, Settings, ChevronRight, LogOut, AlertTriangle, User, Banknote, BookOpen, LayoutGrid, Star, Calendar, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { logoutDriver } from "@/lib/actions/auth-actions"

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


  const handleSubscribePush = async () => {
    try {
      if (!("Notification" in window)) {
        toast.error("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน")
        return
      }

      const result = await Notification.requestPermission()
      if (result !== "granted") {
        toast.error("คุณต้องอนุญาตการแจ้งเตือนก่อนใช้งาน")
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        toast.error("ระบบขัดข้อง: VAPID Key Missing")
        return
      }

      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: session.driverId,
          subscription: subscription.toJSON()
        })
      })

      if (res.ok) {
        toast.success("เปิดการแจ้งเตือนเรียบร้อยแล้ว!")
      } else {
        toast.error("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
      }
    } catch (error: unknown) {
      const err = error as Error
      console.error(err)
      toast.error(err.message || "เกิดข้อผิดพลาดในการเปิดแจ้งเตือน")
    }
  }

  const handleTestPush = async () => {
    try {
      const { sendPushToDriver } = await import("@/lib/actions/push-actions")
      const result = await sendPushToDriver(session.driverId, {
        title: "🔔 ทดสอบแจ้งเตือน",
        body: "หากคุณเห็นข้อความนี้ แสดงว่าระบบแจ้งเตือนของคุณทำงานปกติครับ",
        url: "/mobile/dashboard"
      })
      if (result.success) {
        toast.success("ส่งข้อความทดสอบแล้ว กรุณารอสักครู่...")
      } else {
        toast.error("ส่งไม่สำเร็จ: " + (result.reason || "ไม่พบข้อมูลเครื่องของคุณ"))
      }
    } catch (err) {
      console.error(err)
      toast.error("เกิดข้อผิดพลาดในการส่ง")
    }
  }

  const menuItems = [
    { icon: Bell, label: "เปิดรับการแจ้งเตือนงาน", action: handleSubscribePush, color: 'text-blue-500' },
    {icon: Bell, label: "ทดสอบการแจ้งเตือน (ทดสอบ)", action: handleTestPush, color: 'text-orange-500' },
    { icon: LayoutGrid, label: "รับงานกลาง (ประมูล)", href: "/mobile/marketplace" },
    { icon: Star, label: "คะแนนและผลงาน", href: "/mobile/kpi" },
    { icon: Banknote, label: "รายได้และเบี้ยเลี้ยง", href: "/mobile/income-summary" },
    { icon: Fuel, label: "แจ้งเติมน้ำมัน", href: "/mobile/fuel" },
    { icon: Wrench, label: "แจ้งซ่อม/แจ้งเสีย", href: "/mobile/maintenance" },
    { icon: ClipboardCheck, label: "ตรวจเช็คสภาพรถ", href: "/mobile/vehicle-check" },
    { icon: ShieldAlert, label: "แจ้งสินค้าเสียหาย", href: "/mobile/damage-report" },
    { icon: Calendar, label: "แจ้งลางาน", href: "/mobile/leave" },
    { icon: Bell, label: "การแจ้งเตือน", href: "/mobile/notifications" },
    { icon: User, label: "แชทกับแอดมิน", href: "/mobile/chat", badge: unreadChatCount },
    { icon: AlertTriangle, label: "แจ้งเหตุฉุกเฉิน (SOS)", href: "/mobile/sos" },
    { icon: BookOpen, label: "คู่มือการใช้งาน", href: "/mobile/manual" },
    { icon: Settings, label: "ตั้งค่าระบบ", href: "/mobile/settings" },
  ]

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === "#") {
      e.preventDefault()
      toast.info("ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนาครับ")
    }
  }

  const handleLogout = async () => {
    // Clear session recovery data
    localStorage.removeItem("logis_driver_session_v1")
    await logoutDriver()
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 mb-4">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border/20">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.driverName}`} />
              <AvatarFallback className="bg-blue-800 text-white text-xl">
                {session?.driverName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-foreground">
              <h1 className="text-xl font-bold">{session.driverName}</h1>
              <p className="text-blue-200 text-xl italic font-black uppercase tracking-tighter">รหัสพนักงาน: {session.driverId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/5 mb-4 overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
            <ClipboardCheck size={100} className="text-foreground transform rotate-12" />
        </div>
        <CardContent className="pt-6 relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-bold text-foreground mb-1">ผลการทำงาน</h2>
                    <p className="text-muted-foreground text-lg font-bold">สรุปในรอบ 30 วันที่ผ่านมา</p>
                </div>
                <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 ${
                    (score?.totalScore || 0) >= 80 ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' :
                    (score?.totalScore || 0) >= 60 ? 'border-amber-500 text-amber-400 bg-amber-500/10' :
                    'border-red-500 text-red-400 bg-red-500/10'
                }`}>
                    <span className="text-xl font-bold">{score?.totalScore || 0}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border/10">
                <div>
                   <span className="text-base font-bold text-muted-foreground uppercase tracking-wider">ส่งตรงเวลา</span>
                   <p className={`text-lg font-bold mt-1 ${
                       (score?.onTimeScore || 0) >= 90 ? 'text-emerald-400' : 'text-foreground'
                   }`}>{score?.onTimeScore || 0}%</p>
                </div>
                <div>
                   <span className="text-base font-bold text-muted-foreground uppercase tracking-wider">ขับขี่ปลอดภัย</span>
                   <p className="text-foreground">{score?.safetyScore || 0}%</p>
                </div>
                <div>
                   <span className="text-base font-bold text-muted-foreground uppercase tracking-wider">อัตราการรับงาน</span>
                   <p className={`text-lg font-bold mt-1 ${
                       (score?.acceptanceScore || 0) >= 90 ? 'text-emerald-400' : 'text-foreground'
                   }`}>{score?.acceptanceScore || 0}%</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/5 mb-4">
        <CardContent className="py-2">
          {menuItems.map((item, index) => {
            const Content = (
              <div className="flex items-center justify-between py-4 border-b border-border/5 last:border-0 active:bg-muted/50 transition-colors w-full text-left">
                <div className="flex items-center gap-3 text-foreground">
                  <item.icon className={`w-5 h-5 ${item.color || 'text-muted-foreground'}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && item.badge > 0 && (
                    <span className="bg-primary text-foreground font-bold font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-primary/20">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            )

            if (item.action) {
              return (
                <button 
                  key={index} 
                  onClick={item.action}
                  className="w-full disabled:opacity-50"
                >
                  {Content}
                </button>
              )
            }

            return (
              <Link 
                key={index} 
                href={item.href || "#"}
                onClick={(e) => handleItemClick(e, item.href || "#")}
              >
                {Content}
              </Link>
            )
          })}
        </CardContent>
      </Card>

      <div className="pb-8">
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          ออกจากระบบ
        </Button>
      </div>
    </>
  )
}

