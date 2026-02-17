"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Bell, Search, Moon, Sun } from "lucide-react"


interface HeaderProps {
  sidebarCollapsed?: boolean
}

export function Header({ sidebarCollapsed = false }: HeaderProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme')
        return stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return true
  })


  useEffect(() => {
    // Sync theme class
    if (isDark) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }


  }, [isDark])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    const newTheme = newIsDark ? 'dark' : 'light'
    localStorage.setItem('theme', newTheme)
    
    if (newIsDark) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed top-0 right-0 h-16 z-40 flex items-center justify-between px-6",
        "bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-300",
        sidebarCollapsed ? "left-20" : "left-[280px]"
      )}
      style={{ transition: "left 0.3s ease-in-out" }}
    >
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="ค้นหา..."
            className="w-80 h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => alert("ยังไม่มีการแจ้งเตือนใหม่")}
          className="relative p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </motion.button>

        {/* Profile */}

      </div>
    </motion.header>
  )
}
