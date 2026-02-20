"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, Info, CheckCircle2, AlertTriangle, XCircle, CheckCheck } from "lucide-react"
import { DriverNotification, markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notification-actions"

interface NotificationsContentProps {
  notifications: DriverNotification[]
  driverId: string
}

export function NotificationsContent({ notifications: initialNotifications, driverId }: NotificationsContentProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-400" />
      case 'warning': return <AlertTriangle size={16} className="text-amber-400" />
      case 'error': return <XCircle size={16} className="text-red-400" />
      default: return <Info size={16} className="text-blue-400" />
    }
  }

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(driverId)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "เมื่อสักครู่"
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
    if (days < 7) return `${days} วันที่แล้ว`
    return date.toLocaleDateString('th-TH')
  }

  return (
    <div className="space-y-4">
      {/* Header with mark all read */}
      {unreadCount > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">ยังไม่อ่าน {unreadCount} รายการ</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-400 hover:text-blue-300 h-7 text-xs"
            onClick={handleMarkAllRead}
          >
            <CheckCheck size={14} className="mr-1" />
            อ่านทั้งหมด
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="mx-auto text-slate-700 mb-3" size={48} />
          <p className="text-slate-500">ยังไม่มีการแจ้งเตือน</p>
        </div>
      ) : (
        notifications.map((notif) => (
          <div
            key={notif.id} 
            className="cursor-pointer active:scale-[0.98] transition-all"
            onClick={() => {
              if (!notif.is_read) handleMarkRead(notif.id)
              if (notif.link) router.push(notif.link)
            }}
          >
            <Card 
              className={`border-slate-800 ${
                notif.is_read 
                  ? 'bg-slate-900/50' 
                  : 'bg-slate-900 border-l-4 border-l-blue-500'
              }`}
            >
              <CardContent className="p-4 flex gap-3">
                <div className="mt-1 bg-slate-800 p-2 rounded-full h-fit">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                    {notif.title}
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">{notif.message}</p>
                  <p className="text-xs text-slate-500 mt-2">{formatTime(notif.created_at)}</p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                )}
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  )
}
