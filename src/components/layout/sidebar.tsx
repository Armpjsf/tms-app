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
  FileText,
  AlertTriangle,
  MessageSquare,
  Wrench,
  Fuel,
  BarChart3,
  ChevronLeft,
  Activity,
  Users,
  CalendarDays,
  Receipt,
  Wallet,
  History,
  CheckCircle2,
  Bell,
  Bot,
  Settings,
} from "lucide-react"

import { SidebarProfile } from "./sidebar-profile"
import { getUserRole } from "@/lib/permissions"
import { useLanguage } from "@/components/providers/language-provider"

interface NavItem {
  titleKey: string
  href: string
  icon: React.ReactNode
  badge?: number | string
  badgeColor?: "red" | "blue" | "green" | "yellow"
}

interface NavGroup {
  titleKey: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    titleKey: "nav_groups.ops_command",
    items: [
      { titleKey: "navigation.dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    ],
  },
  {
    titleKey: "nav_groups.operations",
    items: [
      { titleKey: "navigation.planning", href: "/planning", icon: <CalendarDays size={20} /> },
      { titleKey: "navigation.calendar", href: "/calendar", icon: <CalendarDays size={20} /> },
      { titleKey: "navigation.history", href: "/jobs/history", icon: <History size={20} /> },
      { titleKey: "navigation.monitoring", href: "/monitoring", icon: <Activity size={20} />, badge: "Live", badgeColor: "green" },
      { titleKey: "navigation.pod", href: "/pod", icon: <FileText size={20} /> },
      { titleKey: "navigation.sos", href: "/sos", icon: <AlertTriangle size={20} />, badgeColor: "red" },
      { titleKey: "navigation.notifications", href: "/notifications", icon: <Bell size={20} />, badgeColor: "yellow" },
      { titleKey: "navigation.chat", href: "/chat", icon: <MessageSquare size={20} />, badgeColor: "blue" },
    ],
  },
  {
    titleKey: "nav_groups.asset_control",
    items: [
      { titleKey: "navigation.drivers", href: "/drivers", icon: <Users size={20} /> },
      { titleKey: "navigation.fleet", href: "/vehicles", icon: <Truck size={20} /> },
      { titleKey: "navigation.checks", href: "/admin/vehicle-checks", icon: <CheckCircle2 size={20} /> },
      { titleKey: "navigation.maintenance", href: "/maintenance", icon: <Wrench size={20} /> },
      { titleKey: "navigation.fuel", href: "/fuel", icon: <Fuel size={20} /> },
    ],
  },
  {
    titleKey: "nav_groups.intelligence",
    items: [
      { titleKey: "navigation.analytics", href: "/admin/analytics", icon: <BarChart3 size={20} />, badgeColor: "blue" },
      { titleKey: "navigation.ai", href: "/intelligence", icon: <Bot size={20} />, badgeColor: "green" },
      { titleKey: "navigation.billing", href: "/reports", icon: <BarChart3 size={20} /> },
    ],
  },
  {
    titleKey: "nav_groups.financial",
    items: [
      { titleKey: "navigation.billing", href: "/billing/customer", icon: <Receipt size={20} /> },
      { titleKey: "navigation.invoices", href: "/billing/invoices", icon: <FileText size={20} /> },
      { titleKey: "navigation.payouts", href: "/billing/driver", icon: <Wallet size={20} /> },
    ],
  },
  {
    titleKey: "nav_groups.settings",
    items: [
      { titleKey: "navigation.settings", href: "/settings", icon: <Settings size={20} /> },
    ],
  },
]

const customerNavigation: NavGroup[] = [
    {
      titleKey: "nav_groups.client_portal",
      items: [
        { titleKey: "navigation.dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { titleKey: "navigation.monitoring", href: "/monitoring", icon: <Activity size={20} />, badge: "Live", badgeColor: "green" },
        { titleKey: "navigation.history", href: "/jobs/history", icon: <History size={20} /> },
      ],
    },
    {
        titleKey: "nav_groups.documents",
        items: [
            { titleKey: "navigation.pod", href: "/pod", icon: <FileText size={20} /> },
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
  const { t } = useLanguage()
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
        try {
            const role = await getUserRole()
            const { isCustomer } = await import("@/lib/permissions")
            const customerFlag = await isCustomer()
            
            setSidebarState({
                userRole: role || null,
                isCustomerUser: customerFlag,
                roleLoaded: true
            })
        } catch {
            setSidebarState(prev => ({ ...prev, roleLoaded: true }))
        }
    }
    checkRole()
  }, [])

  const { userRole, isCustomerUser, roleLoaded } = sidebarState
  const activeNavigation = isCustomerUser ? customerNavigation : navigation

  const filteredNavigation = activeNavigation.filter(group => {
    if (!roleLoaded || userRole === null) return true 
    if (isCustomerUser) return true

    if (group.titleKey === "nav_groups.intelligence") return [1, 2].includes(userRole)
    if (group.titleKey === "nav_groups.financial") return [1, 2, 4].includes(userRole)
    if (group.titleKey === "nav_groups.settings") return [1, 2].includes(userRole)
    
    if (group.titleKey === "nav_groups.operations" || group.titleKey === "nav_groups.asset_control") {
        if (userRole === 4) return false
    }

    return true
  })

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0, width: collapsed ? 100 : 320 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "fixed top-0 left-0 h-screen z-[1000] flex flex-col font-sans",
        "bg-[#0a0518] border-r border-white/5 text-slate-400 shadow-[20px_0_60px_rgba(0,0,0,0.4)] transition-all duration-500"
      )}
    >
      {/* Brand Signature */}
      <div className="flex items-center justify-between h-36 px-6 border-b border-white/5 bg-[#050110]/50 backdrop-blur-3xl">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-5"
            >
              <div className="relative group/logo">
                <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-0 group-hover/logo:opacity-100 transition-all duration-700 rounded-full"></div>
                <div className="relative w-28 h-28 flex items-center justify-center transition-all duration-500 group-hover/logo:scale-110 overflow-hidden">
                    <Image src="/logo-tactical.png" alt="LogisPro Logo" fill className="object-contain" priority />
                </div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-white font-black text-2xl leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] uppercase">LOGIS<span className="text-primary italic">PRO</span></h1>
                <p className="text-[10px] text-primary font-black tracking-[0.4em] uppercase opacity-90 leading-tight mt-1">COMMAND<br/>CENTRE</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex flex-col gap-3 items-center">
            <button
              onClick={onToggle}
              className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 text-slate-500 hover:text-primary transition-all active:scale-95 shadow-lg"
            >
              <ChevronLeft
                size={20}
                className={cn("transition-transform duration-500", collapsed && "rotate-180")}
              />
            </button>
        </div>
      </div>

      {/* Navigation Matrix */}
      <nav className="flex-1 overflow-y-auto pt-8 pb-4 px-4 custom-scrollbar">
        {!roleLoaded ? (
          <SidebarSkeleton collapsed={collapsed} />
        ) : (
          <motion.div variants={navContainer} initial="hidden" animate="show" className="space-y-8">
            {filteredNavigation.map((group) => (
              <div key={group.titleKey} className="space-y-4">
                {!collapsed && (
                  <h2 className="px-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500/80">
                    {t(group.titleKey)}
                  </h2>
                )}
                
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link key={item.href} href={item.href} prefetch={true} className="block group">
                        <div className={cn(
                            "relative flex items-center gap-4 px-4 h-14 rounded-2xl transition-all duration-300 overflow-hidden",
                             isActive
                             ? "bg-primary/10 text-white shadow-[inset_0_0_20px_rgba(255,30,133,0.05)]"
                             : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200"
                        )}>
                          {/* Active Neon Line */}
                          {isActive && (
                            <motion.div 
                                layoutId="active-nav"
                                className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full shadow-[0_0_15px_rgba(255,30,133,1)]"
                            />
                          )}
                          
                          <div className={cn(
                              "flex-shrink-0 transition-transform duration-300",
                              isActive ? "text-primary scale-110" : "group-hover:scale-110 group-hover:text-primary/70"
                          )}>
                             {item.icon}
                          </div>
                          
                          {!collapsed && (
                            <span className={cn(
                                "text-sm font-black tracking-tight",
                                isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                            )}>
                                {t(item.titleKey)}
                            </span>
                          )}
                          
                          {item.badge && !collapsed && (
                            <span className={cn(
                                "ml-auto px-2 py-0.5 text-[8px] font-black rounded-lg border",
                                item.badgeColor === "red" && "bg-red-500/10 text-red-500 border-red-500/20",
                                item.badgeColor === "blue" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                item.badgeColor === "green" && "bg-primary/10 text-primary border-primary/20",
                                item.badgeColor === "yellow" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            )}>
                                {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </nav>

      {/* User Core */}
      <div className="p-6 border-t border-white/5 bg-[#050110]/50">
        <SidebarProfile collapsed={collapsed} />
      </div>
    </motion.aside>
  )
}

function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="space-y-8 px-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          {!collapsed && (
            <div className="h-2 w-20 bg-white/5 rounded-full animate-pulse ml-4" />
          )}
          {[1, 2].map((j) => (
            <div
              key={j}
              className={cn(
                "h-14 bg-white/[0.02] rounded-2xl animate-pulse border border-white/5",
                collapsed ? "w-14 mx-auto" : "w-full"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
