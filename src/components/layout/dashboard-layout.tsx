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
    <div className="min-h-screen bg-[#050110] text-foreground transition-colors duration-300 selection:bg-primary/30 font-sans">
      {/* Elite Background Infrastructure */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Dynamic Contextual Background */}
        {bgImage && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            <Image 
              src={bgImage} 
              alt="Context Background" 
              fill 
              className="object-cover opacity-[0.05] saturate-[1.2] contrast-[1.1] scale-105 blur-[8px]"
              priority
            />
            {/* Multi-layered Dark Overlays for depth */}
            <div className="absolute inset-0 bg-[#050110]/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050110] via-transparent to-[#050110]/20" />
          </div>
        )}

        {/* Elite Ambient Glows - MAGENTA THEME */}
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[100px] animate-pulse delay-700 pointer-events-none" />
        
        {/* Subtle Static Noise Overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Elite Scanning Line (Futuristic Touch) - MAGENTA */}
        <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,30,133,0.3)_50%,transparent_100%)] bg-[length:100%_12px] animate-[scan_15s_linear_infinite]" />

        {/* Subtle Grid with Radial Mask */}
        <div 
            className="absolute inset-0 opacity-[0.05]"
            style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: '120px 120px',
                maskImage: 'radial-gradient(circle at center, black, transparent 85%)'
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

      {/* Main Content Area */}
      <motion.main
          initial={{ opacity: 0 }}
          animate={isMounted ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "relative pt-16 min-h-screen transition-all duration-500 ease-in-out",
            sidebarCollapsed ? "pl-20" : "pl-[280px]"
          )}
      >
          {/* Elite Content Spacing */}
          <div className="relative z-20 min-h-[calc(100vh-64px)]">
            <div className="p-10 lg:p-14 max-w-[2000px] mx-auto">
                {children}
            </div>
          </div>
      </motion.main>
    </div>
  )
}
