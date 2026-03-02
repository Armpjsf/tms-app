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
  PieChart,
  CloudSync,
  CheckCircle2,
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
      { title: "ประวัติงาน", href: "/jobs/history", icon: <History size={20} /> },
      { title: "Control Centre", href: "/monitoring", icon: <Activity size={20} />, badge: "Live", badgeColor: "green" },
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
      { title: "แจ้งตรวจสภาพ", href: "/admin/vehicle-checks", icon: <CheckCircle2 size={20} /> },
      { title: "แจ้งซ่อม", href: "/maintenance", icon: <Wrench size={20} /> },
      { title: "เติมน้ำมัน", href: "/fuel", icon: <Fuel size={20} /> },
    ],
  },
  {
    title: "ผู้บริหาร & รายงาน",
    items: [
      { title: "Executive Dashboard", href: "/admin/analytics", icon: <PieChart size={20} /> },
      { title: "Fleet & Efficiency", href: "/admin/vehicles", icon: <Activity size={20} /> },
      { title: "Customer Feedback", href: "/admin/analytics/feedback", icon: <MessageSquare size={20} /> },
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

const navItemVar = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [userRole, setUserRole] = React.useState<number | null>(null)
  const [isCustomerUser, setIsCustomerUser] = React.useState(false)

  React.useEffect(() => {
    async function checkRole() {
        const role = await getUserRole()
        setUserRole(role || null)
        
        // Also check if customer
        const { isCustomer } = await import("@/lib/permissions")
        const customerFlag = await isCustomer()
        setIsCustomerUser(customerFlag)
    }
    checkRole()
  }, [])

  // If customer, show customer-only menu
  const activeNavigation = isCustomerUser ? customerNavigation : navigation

  const filteredNavigation = activeNavigation.filter(group => {
    if (userRole === null) return true 
    
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
        "bg-white border-r border-gray-100 text-gray-700 shadow-xl transition-all duration-300"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-20 px-4 border-b border-gray-100 bg-emerald-50/10 backdrop-blur-sm">
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
                <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-30 rounded-full"></div>
                <Image 
                    src="/logo.png" 
                    alt="LOGIS-PRO 360" 
                    width={40}
                    height={40}
                    className="relative h-10 w-auto object-contain drop-shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-gray-900 font-black text-lg leading-tight tracking-tight">LOGIS-PRO</h1>
                <p className="text-[10px] text-emerald-600/80 font-black tracking-widest">360 ENTERPRISE</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onToggle}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-emerald-700"
        >
          <ChevronLeft
            size={20}
            className={cn("transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        <motion.div variants={navContainer} initial="hidden" animate="show">
        {filteredNavigation.map((group) => (
          <div key={group.title} className="mb-6">
            {!collapsed && (
              <h2 className="px-4 mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {group.title}
              </h2>
            )}
            
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <div key={item.href}>
                    <Link href={item.href} prefetch={false} className="block">
                        <div
                          className={cn(
                               "relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group",
                                isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm"
                                : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 border border-transparent"
                          )}
                        >
                          {/* Active Indicator Strip */}
                          {isActive && (
                              <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 bg-emerald-500 rounded-r-full"
                              />
                          )}
                          
                          <span className={cn(
                              "flex-shrink-0 transition-colors duration-200",
                               isActive ? "text-emerald-600" : "group-hover:text-emerald-600"
                          )}>
                              {item.icon}
                          </span>
                          
                          {!collapsed && (
                            <span className="text-sm font-bold whitespace-nowrap">
                                {item.title}
                            </span>
                          )}
                          
                          {/* Badge */}
                          {item.badge && !collapsed && (
                              <span
                                className={cn(
                                    "ml-auto px-2 py-0.5 text-[10px] font-black rounded-full",
                                    item.badgeColor === "red" && "bg-red-50 text-red-700 border border-red-100",
                                    item.badgeColor === "blue" && "bg-blue-50 text-blue-700 border border-blue-100",
                                    item.badgeColor === "green" && "bg-emerald-50 text-emerald-700 border border-emerald-100",
                                    item.badgeColor === "yellow" && "bg-yellow-50 text-yellow-700 border border-yellow-100"
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
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all group"
                    >
                        <Settings size={20} className="group-hover:text-emerald-600 transition-colors" />
                        {!collapsed && <span className="text-sm font-bold">ตั้งค่า</span>}
                    </motion.div>
                </Link>
            </div>
        )}
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <SidebarProfile collapsed={collapsed} />
      </div>
    </motion.aside>
  )
}
