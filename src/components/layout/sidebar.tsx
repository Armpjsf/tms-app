"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Truck,
  MapPin,
  FileText,
  AlertTriangle,
  MessageSquare,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Users,
  CalendarDays,
  Package,
  Receipt,
  Wallet,
  Building,
  History,
  Coins,
  PieChart,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  badge?: number | string
  badgeColor?: "red" | "blue" | "green" | "yellow"
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    title: "หลัก",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    ],
  },
  {
    title: "ปฏิบัติการ",
    items: [
      { title: "วางแผนงาน", href: "/planning", icon: <CalendarDays size={20} /> },
      { title: "ประวัติงาน", href: "/jobs/history", icon: <History size={20} /> },
      { title: "ติดตาม", href: "/monitoring", icon: <Package size={20} /> },
      { title: "GPS ติดตามรถ", href: "/gps", icon: <MapPin size={20} /> },
      { title: "จัดการ POD", href: "/pod", icon: <FileText size={20} /> },
      { title: "SOS Alerts", href: "/sos", icon: <AlertTriangle size={20} />, badgeColor: "red" },
      { title: "แชท", href: "/chat", icon: <MessageSquare size={20} />, badgeColor: "blue" },
    ],
  },
  {
    title: "กองยาน",
    items: [
      { title: "แจ้งซ่อม", href: "/maintenance", icon: <Wrench size={20} /> },
      { title: "เติมน้ำมัน", href: "/fuel", icon: <Fuel size={20} /> },
      { title: "คนขับ", href: "/drivers", icon: <Users size={20} /> },
      { title: "รถ", href: "/vehicles", icon: <Truck size={20} /> },
    ],
  },
  {
    title: "รายงาน",
    items: [
      { title: "Dashboard ผู้บริหาร", href: "/admin/analytics", icon: <PieChart size={20} /> },
      { title: "รายงานทั่วไป", href: "/reports", icon: <BarChart3 size={20} /> },
    ],
  },
  {
    title: "การเงิน",
    items: [
      { title: "สรุปวางบิลลูกค้า", href: "/billing/customer", icon: <Receipt size={20} /> },
      { title: "สรุปจ่ายรถ", href: "/billing/driver", icon: <Wallet size={20} /> },
    ],
  },
  {
    title: "ตั้งค่าระบบ",
    items: [
      { title: "ข้อมูลบริษัท", href: "/settings/company", icon: <Building size={20} /> },
      { title: "จัดการลูกค้า", href: "/settings/customers", icon: <Users size={20} /> },
      { title: "ประเภทค่าใช้จ่าย", href: "/settings/expense-types", icon: <Coins size={20} /> },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0, width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed top-0 left-0 h-screen z-50 flex flex-col",
        "bg-sidebar border-r border-border transition-colors duration-300"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <img 
                src="/logo.png" 
                alt="LOGIS-PRO 360" 
                className="h-10 w-auto object-contain"
              />
              <div>
                <h1 className="text-sidebar-foreground font-bold text-lg leading-tight">LOGIS-PRO</h1>
                <p className="text-[10px] text-indigo-400 font-medium">360</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <ChevronLeft
            size={20}
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navigation.map((group) => (
          <div key={group.title} className="mb-6">
            <AnimatePresence>
              {!collapsed && (
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {group.title}
                </motion.h2>
              )}
            </AnimatePresence>
            
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                
                return (
                  <Link key={item.href} href={item.href} prefetch={false}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      {/* Active Indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-r-full"
                        />
                      )}
                      
                      <span className={cn(
                        "flex-shrink-0",
                        isActive && "text-indigo-400"
                      )}>
                        {item.icon}
                      </span>
                      
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="text-sm font-medium whitespace-nowrap"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      
                      {/* Badge */}
                      {item.badge && !collapsed && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full",
                            item.badgeColor === "red" && "bg-red-500/20 text-red-400",
                            item.badgeColor === "blue" && "bg-blue-500/20 text-blue-400",
                            item.badgeColor === "green" && "bg-emerald-500/20 text-emerald-400",
                            item.badgeColor === "yellow" && "bg-yellow-500/20 text-yellow-400"
                          )}
                        >
                          {item.badge}
                        </motion.span>
                      )}
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-2 border-t border-sidebar-border">
        <Link href="/settings">
          <motion.div
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
          >
            <Settings size={20} />
            {!collapsed && <span className="text-sm font-medium">ตั้งค่า</span>}
          </motion.div>
        </Link>
        
        <button
          onClick={() => window.location.href = '/api/auth/logout'}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors group",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
          {!collapsed && <span className="text-sm font-medium">ออกจากระบบ</span>}
        </button>
      </div>
    </motion.aside>
  )
}
