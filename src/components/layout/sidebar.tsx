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
  Receipt,
  Wallet,
  Building,
  History,
  Coins,
  CloudSync,
  CheckCircle2,
  Bell,
  BookOpen,
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
  // ... (existing navigation stays for Admin/Staff)
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
      { title: "ปฏิทินงาน", href: "/calendar", icon: <CalendarDays size={20} /> },
      { title: "ประวัติงาน", href: "/jobs/history", icon: <History size={20} /> },
      { title: "Control Centre", href: "/monitoring", icon: <Activity size={20} />, badge: "Live", badgeColor: "green" },
      { title: "จัดการ POD", href: "/pod", icon: <FileText size={20} /> },
      { title: "SOS Alerts", href: "/sos", icon: <AlertTriangle size={20} />, badgeColor: "red" },
      { title: "แจ้งเตือนระบบ", href: "/notifications", icon: <Bell size={20} />, badgeColor: "yellow" },
      { title: "แชท", href: "/chat", icon: <MessageSquare size={20} />, badgeColor: "blue" },
    ],
  },
  {
    title: "กองยาน",
    items: [
      { title: "คนขับ", href: "/drivers", icon: <Users size={20} /> },
      { title: "รถ", href: "/vehicles", icon: <Truck size={20} /> },
      { title: "แจ้งตรวจสภาพ", href: "/admin/vehicle-checks", icon: <CheckCircle2 size={20} /> },
      { title: "แจ้งซ่อม", href: "/maintenance", icon: <Wrench size={20} /> },
      { title: "เติมน้ำมัน", href: "/fuel", icon: <Fuel size={20} /> },
    ],
  },
  {
    title: "ผู้บริหารและรายงาน",
    items: [
      { title: "Executive Dashboard", href: "/admin/analytics", icon: <BarChart3 size={20} />, badgeColor: "blue" },
      { title: "รายงานรถและคนขับ", href: "/reports/fleet", icon: <Truck size={20} /> },
      { title: "ต้นทุนต่อเที่ยว", href: "/reports/cost-per-trip", icon: <Coins size={20} />, badgeColor: "yellow" },
      { title: "ปัญหาสินค้า/เคลม", href: "/admin/damage-reports", icon: <AlertTriangle size={20} />, badgeColor: "red" },
      { title: "ข้อเสนอแนะคนขับ", href: "/admin/user-feedback", icon: <MessageSquare size={20} /> },
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
    title: "ช่วยเหลือ",
    items: [
      { title: "คู่มือการใช้งาน", href: "/manual", icon: <BookOpen size={20} /> },
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
      { title: "System Logs", href: "/admin/logs", icon: <Activity size={20} /> },
    ],
  },
]

const customerNavigation: NavGroup[] = [
    {
      title: "ระบบสำหรับลูกค้า",
      items: [
        { title: "ภาพรวมขนส่ง", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { title: "ติดตามงาน", href: "/monitoring", icon: <Activity size={20} />, badge: "Live", badgeColor: "green" },
        { title: "ประวัติรายการ", href: "/jobs/history", icon: <History size={20} /> },
      ],
    },
    {
        title: "เอกสารและบัญชี",
        items: [
            { title: "จัดการ POD", href: "/pod", icon: <FileText size={20} /> },
        ]
    }
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

const navContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1
    }
  }
}


export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [sidebarState, setSidebarState] = React.useState<{
    userRole: number | null
    isCustomerUser: boolean
    roleLoaded: boolean
  }>({
    userRole: null,
    isCustomerUser: false,
    roleLoaded: false
  })

  React.useEffect(() => {
    async function checkRole() {
        const role = await getUserRole()
        
        // Also check if customer
        const { isCustomer } = await import("@/lib/permissions")
        const customerFlag = await isCustomer()
        
        setSidebarState({
            userRole: role || null,
            isCustomerUser: customerFlag,
            roleLoaded: true
        })
    }
    checkRole()
  }, [])

  const { userRole, isCustomerUser, roleLoaded } = sidebarState

  // If customer, show customer-only menu
  const activeNavigation = isCustomerUser ? customerNavigation : navigation

  const filteredNavigation = activeNavigation.filter(group => {
    if (!roleLoaded || userRole === null) return true 
    
    // Customers skip internal logic
    if (isCustomerUser) return true

    if (group.title === "ผู้บริหาร & รายงาน") {
      return [1, 2].includes(userRole)
    }
    if (group.title === "การเงิน") {
      return [1, 2, 4].includes(userRole)
    }
    if (group.title === "ตั้งค่าระบบ") {
      return [1, 2].includes(userRole)
    }
    
    if (group.title === "ปฏิบัติการ" || group.title === "กองยาน") {
        if (userRole === 4) return false
    }

    return true
  })

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0, width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed top-0 left-0 h-screen z-[1000] flex flex-col",
        "bg-slate-950 border-r border-slate-800/50 text-slate-300 shadow-2xl transition-all duration-300"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-20 px-4 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 rounded-full"></div>
                <Image 
                    src="/logo.png" 
                    alt="LOGIS-PRO 360" 
                    width={40}
                    height={40}
                    className="relative h-10 w-auto object-contain brightness-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                />
              </div>
              <div>
                <h1 className="text-white font-black text-lg leading-tight tracking-tight">LOGIS-PRO</h1>
                <p className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">360 Enterprise</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onToggle}
          className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-500 hover:text-emerald-400"
        >
          <ChevronLeft
            size={20}
            className={cn("transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        {!roleLoaded ? (
          <SidebarSkeleton collapsed={collapsed} />
        ) : (
        <>
        <motion.div variants={navContainer} initial="hidden" animate="show">
        {filteredNavigation.map((group) => (
          <div key={group.title} className="mb-6">
            {!collapsed && (
              <h2 className="px-4 mb-3 text-[10px] font-black uppercase tracking-widest text-slate-300/80">
                {group.title}
              </h2>
            )}
            
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <div key={item.href}>
                    <Link href={item.href} prefetch={true} className="block mb-2">
                        <div
                          className={cn(
                               "relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group border shadow-sm",
                                isActive
                                ? "bg-emerald-600/20 text-white border-emerald-500/50 shadow-[0_4px_20px_rgba(16,185,129,0.15)]"
                                : "bg-slate-900/80 text-slate-300 border-slate-800/50 hover:bg-slate-800 hover:border-slate-700 hover:text-white"
                          )}
                        >
                          {/* Active Indicator Glow */}
                          {isActive && (
                              <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-emerald-400 rounded-r-full shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                              />
                          )}
                          
                          <span className={cn(
                              "flex-shrink-0 transition-all duration-300",
                               isActive ? "text-emerald-400 scale-110" : "text-slate-500 group-hover:text-emerald-400 group-hover:scale-110"
                          )}>
                              {item.icon}
                          </span>
                          
                          {!collapsed && (
                            <span className={cn(
                                "text-sm font-black whitespace-nowrap tracking-tight transition-colors",
                                isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                            )}>
                                {item.title}
                            </span>
                          )}
                          
                          {/* Badge */}
                          {item.badge && !collapsed && (
                              <span
                                  className={cn(
                                      "ml-auto px-2 py-0.5 text-[10px] font-black rounded-full",
                                      item.badgeColor === "red" && "bg-red-500/10 text-red-500 border border-red-500/20",
                                      item.badgeColor === "blue" && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
                                      item.badgeColor === "green" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                                      item.badgeColor === "yellow" && "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                  )}
                              >
                                {item.badge}
                              </span>
                          )}
                        </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        </motion.div>

        {/* Extra Settings Link - Hidden for customers */}
        {!isCustomerUser && (
            <div className="pb-2">
                <Link href="/settings">
                    <motion.div
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-900/50 transition-all group"
                    >
                        <Settings size={20} className="group-hover:text-emerald-400 transition-colors" />
                        {!collapsed && <span className="text-sm font-bold">ตั้งค่า</span>}
                    </motion.div>
                </Link>
            </div>
        )}
        </>
        )}
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-950/50">
        <SidebarProfile collapsed={collapsed} />
      </div>
    </motion.aside>
  )
}

function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="space-y-6 px-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          {!collapsed && (
            <div className="h-2 w-16 bg-slate-800/50 rounded animate-pulse ml-4" />
          )}
          {[1, 2].map((j) => (
            <div
              key={j}
              className={cn(
                "h-12 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800/30",
                collapsed ? "w-12 mx-auto" : "w-full"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
