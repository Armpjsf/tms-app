"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import Image from "next/image"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const ROUTE_BACKGROUNDS: Record<string, string> = {
  "/planning": "/images/backgrounds/planning-bg.png",
  "/calendar": "/images/backgrounds/calendar-bg.png",
  "/sos": "/images/backgrounds/sos-bg.png",
  "/notifications": "/images/backgrounds/notifications-bg.png",
  "/chat": "/images/backgrounds/chat-bg.png",
  "/vehicles": "/images/backgrounds/vehicles-bg.png",
  "/admin/vehicle-checks": "/images/backgrounds/inspection-bg.png",
  "/maintenance": "/images/backgrounds/maintenance-bg.png",
  "/fuel": "/images/backgrounds/fuel-bg.png",
  "/billing/customer": "/images/backgrounds/billing-bg.png",
  "/billing/invoices": "/images/backgrounds/invoice-bg.png",
  "/billing/driver": "/images/backgrounds/payment-bg.png",
  "/admin/analytics": "/images/backgrounds/executive-bg.png",
  "/jobs/history": "/images/backgrounds/planning-bg.png", // Using planning as fallback for history
  "/reports/fleet": "/images/backgrounds/vehicles-bg.png",  // Using vehicles as fallback for fleet report
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const pathname = usePathname()

  // Load state on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed")
    if (saved !== null) {
      setSidebarCollapsed(saved === "true")
    }
    setIsMounted(true)
  }, [])

  const handleToggle = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem("sidebar_collapsed", String(newState))
  }

  const bgImage = ROUTE_BACKGROUNDS[pathname]

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Dynamic Contextual Background */}
        {bgImage && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            <Image 
              src={bgImage} 
              alt="Context Background" 
              fill 
              className="object-cover opacity-[0.85]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/60 via-white/10 to-white/40" />
          </div>
        )}

        {/* Animated Gradient Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse delay-500" />
        
        {/* Subtle Grid Pattern with mask */}
        <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={handleToggle} 
      />

      {/* Header */}
      <Header sidebarCollapsed={sidebarCollapsed} />

      {/* Main Content */}
      <motion.main
          initial={{ opacity: 0 }}
          animate={isMounted ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
          "relative pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "pl-20" : "pl-[280px]"
          )}
      >
          <div className="p-6">
          {children}
          </div>
      </motion.main>
    </div>
  )
}
