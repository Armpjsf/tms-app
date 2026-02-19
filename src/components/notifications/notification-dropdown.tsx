"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, AlertTriangle, Truck, Wrench, X, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Notification {
  id: string
  type: 'sos' | 'job_status' | 'maintenance' | 'system'
  title: string
  message: string
  timestamp: string
  read: boolean
  href?: string
  severity: 'critical' | 'warning' | 'info'
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  
  if (diffMin < 1) return 'เมื่อสักครู่'
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
  
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`
  
  return `${Math.floor(diffHr / 24)} วันที่แล้ว`
}

const typeIcons = {
  sos: <AlertTriangle size={16} className="text-red-400" />,
  job_status: <Truck size={16} className="text-blue-400" />,
  maintenance: <Wrench size={16} className="text-amber-400" />,
  system: <Bell size={16} className="text-slate-400" />,
}

const severityStyles = {
  critical: 'border-l-red-500 bg-red-500/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  info: 'border-l-slate-600 bg-transparent',
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Fetch notifications when opened
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const fetchNotifications = async () => {
      try {
        const r = await fetch('/api/notifications')
        const data = await r.json()
        if (!cancelled) setNotifications(data.notifications || [])
      } catch {
        if (!cancelled) setNotifications([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    setLoading(true)
    fetchNotifications()
    return () => { cancelled = true }
  }, [open])

  // Auto-refresh every 60s if open
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      fetch('/api/notifications')
        .then(r => r.json())
        .then(data => setNotifications(data.notifications || []))
        .catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [open])

  const visibleNotifications = notifications.filter(n => !dismissed.has(n.id))
  const unreadCount = visibleNotifications.filter(n => !n.read).length

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDismissed(prev => new Set(prev).add(id))
  }

  const handleDismissAll = () => {
    setDismissed(new Set(notifications.map(n => n.id)))
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
      >
        <Bell size={20} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1 shadow-lg shadow-red-500/30"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl shadow-black/30 z-[100]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded-full">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
              {visibleNotifications.length > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ล้างทั้งหมด
                </button>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {visibleNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className={cn(
                        "group relative px-4 py-3 border-l-2 transition-colors",
                        severityStyles[notification.severity],
                        !notification.read && "bg-primary/5",
                        notification.href && "hover:bg-muted/50 cursor-pointer"
                      )}
                    >
                      {notification.href ? (
                        <Link href={notification.href} onClick={() => setOpen(false)} className="block">
                          <NotificationItem notification={notification} />
                        </Link>
                      ) : (
                        <NotificationItem notification={notification} />
                      )}
                      
                      {/* Dismiss button */}
                      <button
                        onClick={(e) => handleDismiss(notification.id, e)}
                        className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <Link
                href="/settings/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                ตั้งค่าการแจ้งเตือน <ExternalLink size={10} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">
        {typeIcons[notification.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {timeAgo(notification.timestamp)}
        </p>
      </div>
      {!notification.read && (
        <div className="mt-2 shrink-0">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        </div>
      )}
    </div>
  )
}
