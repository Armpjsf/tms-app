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
              className="object-cover opacity-[0.15] saturate-[1.2] contrast-[1.1] scale-105 blur-[2px]"
              priority
            />
            {/* Darker Overlay to make content pop */}
            <div className="absolute inset-0 bg-slate-950/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
        )}

        {/* Global Premium Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[130px] animate-pulse delay-700 pointer-events-none" />
        
        {/* Subtle Grid Pattern with mask */}
        <div 
            className="absolute inset-0 opacity-[0.05]"
            style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                backgroundSize: '60px 60px',
                maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
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
          {/* Content Glass Effect Container */}
          <div className="relative z-20 min-h-screen">
            <div className="p-6">
            {children}
            </div>
          </div>
      </motion.main>
    </div>
  )
}
