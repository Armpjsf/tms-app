"use client"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, Info, CheckCircle2 } from "lucide-react"

export default function MobileNotificationsPage() {
  const notifications = [
    {
      id: 1,
      title: "งานใหม่!",
      message: "คุณได้รับมอบหมายงานใหม่ #JOB-9988",
      time: "10 นาทีที่แล้ว",
      type: "info",
      read: false
    },
    {
      id: 2,
      title: "แจ้งซ่อมอนุมัติแล้ว",
      message: "รายการแจ้งซ่อมเบรคได้รับการอนุมัติแล้ว",
      time: "2 ชั่วโมงที่แล้ว",
      type: "success",
      read: true
    },
    {
      id: 3,
      title: "ยืนยันการเติมน้ำมัน",
      message: "รายการเติมน้ำมัน 1,500 บาท ได้รับการยืนยัน",
      time: "เมื่อวาน",
      type: "success",
      read: true
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="การแจ้งเตือน" showBack />
      
      <div className="space-y-3">
        {notifications.map((notif) => (
            <Card key={notif.id} className={`border-slate-800 ${notif.read ? 'bg-slate-900/50' : 'bg-slate-900 border-l-4 border-l-blue-500'}`}>
                <CardContent className="p-4 flex gap-3">
                    <div className={`mt-1 bg-slate-800 p-2 rounded-full h-fit`}>
                        {notif.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Info size={16} className="text-blue-400" />}
                    </div>
                    <div>
                        <h4 className={`font-medium ${notif.read ? 'text-slate-300' : 'text-white'}`}>{notif.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">{notif.message}</p>
                        <p className="text-xs text-slate-500 mt-2">{notif.time}</p>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  )
}
