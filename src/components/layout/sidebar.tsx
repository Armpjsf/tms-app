"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
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
  ChevronLeft,
  Activity,
  Users,
  CalendarDays,
  Package,
  Receipt,
  Wallet,
  Building,
  History,
  Coins,
  PieChart,
  CloudSync,
} from "lucide-react"

import { SidebarProfile } from "./sidebar-profile"
import { getUserRole } from "@/lib/permissions"

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
      { title: "Dashboard ปฏิบัติการ", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
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
      { title: "คนขับ", href: "/drivers", icon: <Users size={20} /> },
      { title: "รถ", href: "/vehicles", icon: <Truck size={20} /> },
      { title: "แจ้งซ่อม", href: "/maintenance", icon: <Wrench size={20} /> },
      { title: "เติมน้ำมัน", href: "/fuel", icon: <Fuel size={20} /> },
    ],
  },
  {
    title: "ผู้บริหาร & รายงาน",
    items: [
      { title: "Executive Dashboard", href: "/admin/analytics", icon: <PieChart size={20} /> },
      { title: "Fleet & Efficiency", href: "/admin/vehicles", icon: <Activity size={20} /> },
      { title: "ติดตามรายสาขา", href: "/admin/analytics/regional", icon: <MapPin size={20} /> },
      { title: "รายงานทั่วไป", href: "/reports", icon: <BarChart3 size={20} /> },
    ],
  },
  {
    title: "การเงิน",
    items: [
      { title: "สรุปวางบิลลูกค้า", href: "/billing/customer", icon: <Receipt size={20} /> },
      { title: "ใบกำกับภาษี", href: "/billing/invoices", icon: <FileText size={20} /> },
      { title: "สรุปจ่ายรถ", href: "/billing/driver", icon: <Wallet size={20} /> },
    ],
  },
  {
    title: "ตั้งค่าระบบ",
    items: [
      { title: "ข้อมูลบริษัท", href: "/settings/company", icon: <Building size={20} /> },
      { title: "จัดการลูกค้า", href: "/settings/customers", icon: <Users size={20} /> },
      { title: "จัดการเส้นทาง", href: "/routes", icon: <MapPin size={20} /> },
      { title: "ประเภทค่าใช้จ่าย", href: "/settings/expense-types", icon: <Coins size={20} /> },
      { title: "ตั้งค่าระบบบัญชี", href: "/settings/accounting", icon: <CloudSync size={20} /> },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [isAdminUser, setIsAdminUser] = React.useState(false)

  React.useEffect(() => {
    async function checkAdmin() {
        const role = await getUserRole()
        setIsAdminUser(role === 1 || role === 2)
    }
    checkAdmin()
  }, [])

  const filteredNavigation = navigation.filter(group => {
    if (group.title === "ผู้บริหาร & รายงาน" && !isAdminUser) return false
    if (group.title === "ตั้งค่าระบบ" && !isAdminUser) return false
    return true
  })

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0, width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed top-0 left-0 h-screen z-50 flex flex-col",
        "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-white/10 text-white shadow-2xl"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-20 px-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-lg opacity-50 rounded-full"></div>
                <Image 
                    src="/logo.png" 
                    alt="LOGIS-PRO 360" 
                    width={40}
                    height={40}
                    className="relative h-10 w-auto object-contain drop-shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight tracking-tight">LOGIS-PRO</h1>
                <p className="text-[10px] text-indigo-400 font-medium tracking-widest">360 ENTERPRISE</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onToggle}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
        >
          <ChevronLeft
            size={20}
            className={cn("transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        {filteredNavigation.map((group) => (
          <div key={group.title} className="mb-6">
            <AnimatePresence>
              {!collapsed && (
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500"
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
                    <div className="relative group">
                        {isActive && (
                            <motion.div
                                layoutId="activeGlow"
                                className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-md"
                                transition={{ duration: 0.2 }}
                            />
                        )}
                        <motion.div
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                            "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                            isActive
                            ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                            : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                        )}
                        >
                        {/* Active Indicator Strip */}
                        {isActive && (
                            <motion.div
                            layoutId="activeStrip"
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_2px_rgba(99,102,241,0.5)]"
                            />
                        )}
                        
                        <span className={cn(
                            "flex-shrink-0 transition-colors duration-300",
                            isActive ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" : "group-hover:text-indigo-400"
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
                                "ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full shadow-sm",
                                item.badgeColor === "red" && "bg-red-500/20 text-red-400 border border-red-500/30",
                                item.badgeColor === "blue" && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                                item.badgeColor === "green" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                                item.badgeColor === "yellow" && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            )}
                            >
                            {item.badge}
                            </motion.span>
                        )}
                        </motion.div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Extra Settings Link */}
        <div className="pb-2">
            <Link href="/settings">
                <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                >
                    <Settings size={20} className="group-hover:text-indigo-400 transition-colors" />
                    {!collapsed && <span className="text-sm font-medium">ตั้งค่า</span>}
                </motion.div>
            </Link>
        </div>
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <SidebarProfile collapsed={collapsed} />
      </div>
    </motion.aside>
  )
}
