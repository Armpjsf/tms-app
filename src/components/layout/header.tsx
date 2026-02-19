"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Search, Moon, Sun, Building2 } from "lucide-react"
import { useBranch } from "@/components/providers/branch-provider"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

interface HeaderProps {
  sidebarCollapsed?: boolean
}

export function Header({ sidebarCollapsed = false }: HeaderProps) {
  const { selectedBranch, setSelectedBranch, branches, isAdmin } = useBranch()
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
    <header
      className={cn(
        "fixed top-0 right-0 h-16 z-50 flex items-center justify-between px-6",
        "bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-300",
        sidebarCollapsed ? "left-20" : "left-[280px]"
      )}
      style={{ transition: "left 0.3s ease-in-out" }}
    >
      {/* Central/Left Section */}
      <div className="flex items-center gap-4 flex-1">
         
         {/* Branch Selector (Global) - Only for Admins */}
         {isAdmin && (
            <div className="w-56 shrink-0 relative z-[60]">
                <Select 
                    value={selectedBranch} 
                    onValueChange={setSelectedBranch}
                >
                    <SelectTrigger className="bg-muted/50 border-input text-foreground h-10 w-full focus:ring-0">
                            <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate">
                                {selectedBranch === 'All' ? 'ทุกสาขา' : branches.find(b => b.Branch_ID === selectedBranch)?.Branch_Name || selectedBranch}
                            </span>
                            </div>
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                        <SelectItem value="All">ทุกสาขา</SelectItem>
                        {branches.map(b => (
                            <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                                {b.Branch_Name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="ค้นหา..."
            className="w-64 h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
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
        <NotificationDropdown />

        {/* Profile */}

      </div>
    </header>
  )
}
