"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

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

  return (
    <div className="h-screen w-full bg-background text-foreground transition-colors duration-300 selection:bg-primary/30 font-sans overflow-hidden flex flex-col">
      {/* Elite Background Infrastructure (Fixed behind everything) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Elite Ambient Glows - BRAND BLUE/NAVY THEME */}
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-primary/10 dark:bg-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-secondary/20 dark:bg-secondary/20 rounded-full blur-[100px] animate-pulse delay-700 pointer-events-none" />
        
        {/* Subtle Static Noise Overlay (Hidden due to external asset failure) */}
        {/* <div className="absolute inset-0 opacity-[0.01] dark:opacity-[0.01] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" /> */}

        {/* Elite Scanning Line (Futuristic Touch) - BRAND BLUE */}
        <div className="absolute inset-0 opacity-[0.008] bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,39,156,0.2)_50%,transparent_100%)] bg-[length:100%_12px] animate-[scan_15s_linear_infinite]" />

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

      {/* Header (Top Level) */}
      <Header sidebarCollapsed={sidebarCollapsed} />

      <div className="relative flex flex-1 h-full overflow-hidden">
        {/* Sidebar Space Controller (This pushes the content) */}
        <div 
            className="h-full shrink-0 transition-all duration-500 ease-in-out relative z-30"
            style={{ width: sidebarCollapsed ? '80px' : '240px' }}
        >
            <Sidebar 
                collapsed={sidebarCollapsed} 
                onToggle={handleToggle} 
            />
        </div>

        {/* Main Content Area (Independent Scroll) */}
        <motion.main
            initial={{ opacity: 0 }}
            animate={isMounted ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1 h-full overflow-y-auto custom-scrollbar pt-20 relative z-20"
        >
            <div className="relative">
                <div className="p-4 lg:p-6 max-w-[2000px] min-h-full">
                    {children}
                </div>
            </div>
        </motion.main>
      </div>
      {/* <GlobalAIAssistant /> */}
    </div>
  )
}
