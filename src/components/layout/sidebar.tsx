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
  Navigation,
  Users,
  Building,
  CalendarDays,
  Receipt,
  Wallet,
  History,
  CheckCircle2,
  Zap,
  Bot,
  Settings,
  ShieldCheck,
} from "lucide-react"

import { SidebarProfile } from "./sidebar-profile"
import { useLanguage } from "@/components/providers/language-provider"
import { getPermissionsByRole } from "@/lib/actions/permission-actions"

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
      { titleKey: "navigation.monitoring", href: "/monitoring", icon: <Activity size={20} />, badge: "common.live", badgeColor: "green" },
      { titleKey: "navigation.pod", href: "/pod", icon: <FileText size={20} /> },
      { titleKey: "navigation.notifications", href: "/notifications", icon: <AlertTriangle size={20} />, badgeColor: "red" },
      { titleKey: "navigation.chat", href: "/chat", icon: <MessageSquare size={20} />, badgeColor: "blue" },    
    ],
  },
  {
    titleKey: "nav_groups.asset_control",
    items: [
      { titleKey: "navigation.routes", href: "/routes", icon: <Navigation size={20} /> },
      { titleKey: "navigation.drivers", href: "/drivers", icon: <Users size={20} /> },
      { titleKey: "navigation.driver_leaves", href: "/admin/driver-leaves", icon: <CalendarDays size={20} /> }, 
      { titleKey: "navigation.customers", href: "/settings/customers", icon: <Building size={20} /> },
      { titleKey: "navigation.fleet", href: "/vehicles", icon: <Truck size={20} /> },
      { titleKey: "navigation.fleet_intelligence", href: "/vehicles/intelligence", icon: <Zap size={20} /> },   
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
      { titleKey: "navigation.reports", href: "/reports", icon: <BarChart3 size={20} /> },
    ],
  },
  {
    titleKey: "nav_groups.financial",
    items: [
      { titleKey: "navigation.billing_customer", href: "/billing/customer", icon: <Receipt size={20} /> },      
      { titleKey: "navigation.billing_automation", href: "/billing/automation", icon: <Zap size={20} />, badge: "common.new", badgeColor: "yellow" },
      { titleKey: "navigation.invoices", href: "/billing/invoices", icon: <FileText size={20} /> },
      { titleKey: "navigation.payouts", href: "/billing/driver", icon: <Wallet size={20} /> },
    ],
  },
  {
    titleKey: "nav_groups.settings",
    items: [
      { titleKey: "navigation.settings", href: "/settings", icon: <Settings size={20} /> },
      { titleKey: "navigation.fleet_standards", href: "/settings/fleet-standards", icon: <ShieldCheck size={20} /> },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [sidebarState, setSidebarState] = React.useState<{
    allowedMenus: string[] | null
    isLoaded: boolean
  }>({
    allowedMenus: null,
    isLoaded: false
  })

  React.useEffect(() => {
    async function loadPermissions() {
        try {
            const { getUserProfile } = await import("@/lib/supabase/users")
            const profile = await getUserProfile()

            if (profile?.Role) {
                const perms = await getPermissionsByRole(profile.Role)
                setSidebarState({
                    allowedMenus: perms,
                    isLoaded: true
                })
            } else {
                setSidebarState({ allowedMenus: [], isLoaded: true })
            }
        } catch (error) {
            console.error("Sidebar permission error:", error)
            setSidebarState({ allowedMenus: [], isLoaded: true })
        }
    }
    loadPermissions()
  }, [])

  const { allowedMenus, isLoaded } = sidebarState

  const filteredNavigation = navigation.map(group => ({
    ...group,
    items: group.items.filter(item => {
        if (!isLoaded) return true 
        if (!allowedMenus) return true 
        return allowedMenus.includes(item.titleKey)
    })
  })).filter(group => group.items.length > 0)

  // Waterfall animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2
      }
    }
  }

  return (
    <motion.aside
      initial={{ x: -240 }}
      animate={{ x: 0, width: collapsed ? 80 : 240 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "h-screen z-[1000] flex flex-col font-sans",
        "glass-elite" // Premium utility class from globals.css
      )}
    >
      {/* Header Container - Elite Version */}
      <div className={cn(
        "relative flex flex-col items-center justify-center border-b border-border bg-background/40 backdrop-blur-md overflow-hidden transition-all duration-500",
        collapsed ? "h-16" : "h-32"
      )}>
        {/* Elite Ambient Glow behind Logo */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_70%)] animate-pulse" />
        
        <button
          onClick={onToggle}
          className={cn(
            "absolute z-[1001] p-1.5 rounded-full bg-primary text-white shadow-xl transition-all duration-500 hover:scale-110 active:scale-95",
            collapsed ? "right-2 top-2" : "-right-3 top-6"
          )}
        >
          <ChevronLeft
            size={16}
            className={cn("transition-transform duration-500", collapsed && "rotate-180")}
          />
        </button>

        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className={cn(
                "relative flex items-center justify-center logo-container-pure transition-all duration-700",        
                "bg-muted/30 rounded-full shadow-lg border border-border/10 overflow-hidden",
                collapsed ? "w-10 h-10 p-1.5" : "w-24 h-24 p-3"
            )}
        >
          {/* Scanning line effect */}
          {!collapsed && <div className="absolute inset-0 w-full bg-gradient-to-b from-transparent via-primary/20 to-transparent h-1/2 animate-scan-line pointer-events-none" />}
          
          <div className="relative w-full h-full rounded-full overflow-hidden bg-background/10 flex items-center justify-center z-10">
            <Image
              src="/logo2.png"
              alt="LogisPro"
              fill
              sizes="(max-width: 768px) 40px, 96px"
              className={cn(
                "object-contain logo-pure transition-all duration-700 hover:scale-110",
                "mix-blend-multiply dark:mix-blend-normal dark:brightness-125"
              )}
            />
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 overflow-y-auto pt-6 pb-4 px-3 custom-scrollbar">
        <AnimatePresence mode="wait">
            {!isLoaded ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SidebarSkeleton collapsed={collapsed} />
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6"
              >
                {filteredNavigation.map((group, groupIdx) => (
                  <motion.div 
                    key={group.titleKey} 
                    variants={{
                        hidden: { opacity: 0, y: 30, scale: 0.95 },
                        show: { opacity: 1, y: 0, scale: 1 }
                    }}
                    whileHover={{ 
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 400, damping: 10 }
                    }}
                    className="glass-category-card glass-shine p-2 group/card"
                    transition={{ 
                        delay: 0.1 * groupIdx,
                        type: "spring",
                        stiffness: 100,
                        damping: 15
                    }}
                  >
                    {!collapsed && (
                        <h3 className="category-title transition-colors duration-500 group-hover/card:text-primary/60">
                            {t(group.titleKey)}
                        </h3>
                    )}
                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                         <SidebarItem 
                            key={item.href} 
                            item={item} 
                            collapsed={collapsed} 
                            pathname={pathname} 
                            t={t} 
                         />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
        </AnimatePresence>
      </nav>

      <div className="p-5 border-t border-border bg-background/20 backdrop-blur-sm">
        <SidebarProfile collapsed={collapsed} />
      </div>
    </motion.aside>
  )
}

function SidebarItem({ item, collapsed, pathname, t }: { item: NavItem, collapsed: boolean, pathname: string | null, t: any }) {
    const isActive = pathname === item.href
    
    return (
        <Link href={item.href} prefetch={true} className="block group">
            <motion.div 
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "relative flex items-center gap-3 px-3 h-11 rounded-xl transition-all duration-300 overflow-hidden",
                    isActive
                        ? "nav-item-active glow-active"
                        : "text-secondary-foreground/70 hover:bg-muted/50 hover:text-foreground"
                )}
            >
                {/* Active Indicator Layer */}
                {isActive && (
                <>
                    <motion.div
                        layoutId="active-nav-glow"
                        className="absolute inset-0 bg-primary/5 dark:bg-primary/10 pointer-events-none"
                    />
                    <motion.div
                        layoutId="active-indicator"
                        className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full shadow-[0_0_15px_rgba(var(--primary),0.8)]"
                    />
                </>
                )}

                <div className={cn(
                    "flex-shrink-0 transition-all duration-300 z-10",
                    isActive ? "text-primary scale-110" : "group-hover:scale-110 group-hover:text-primary/80"   
                )}>
                    {item.icon}
                </div>

                {!collapsed && (
                <span className={cn(
                    "text-lg font-bold tracking-normal z-10 transition-colors duration-300",
                    isActive ? "text-accent dark:text-foreground font-black" : "text-secondary-foreground/80 group-hover:text-foreground"
                )}>
                    {t(item.titleKey)}
                </span>
                )}

                {item.badge && !collapsed && (
                <motion.span 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={cn(
                        "ml-auto px-1.5 py-0.5 text-[9px] font-black rounded-md border z-10",
                        item.badgeColor === "red" && "bg-destructive/20 text-destructive border-destructive/30 shadow-[0_0_10px_rgba(182,9,0,0.2)]",    
                        item.badgeColor === "blue" && "bg-blue-500/20 text-blue-500 border-blue-500/30",
                        item.badgeColor === "green" && "bg-primary/20 text-primary border-primary/30",
                        item.badgeColor === "yellow" && "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"     
                    )}
                >
                    {typeof item.badge === 'string' ? t(item.badge).toUpperCase() : item.badge}
                </motion.span>
                )}
                
                {/* Glass shine hover effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </motion.div>
        </Link>
    )
}

function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="space-y-8 px-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          {!collapsed && <div className="h-2 w-20 bg-muted/40 rounded-full animate-pulse ml-4" />}
          {[1, 2].map((j) => (
            <div
              key={j}
              className={cn(
                "h-11 bg-muted/20 rounded-xl animate-pulse border border-border/5",
                collapsed ? "w-11 mx-auto" : "w-full"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
