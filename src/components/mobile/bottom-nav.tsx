"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Users, Truck, Map, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function BottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  if (!pathname.startsWith("/mobile")) return null

  // Security: Never show BottomNav on login or chat page
  if (pathname === "/mobile/login" || pathname === "/mobile/chat") return null

  const navItems = [
    { href: "/mobile/dashboard", icon: LayoutGrid, label: "หน้าแรก" },
    { href: "/mobile/jobs", icon: Truck, label: "งาน" },
    { href: "/mobile/profile", icon: Users, label: "โปรไฟล์" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[150] pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto px-4 pb-6">
        <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative overflow-hidden">
          {/* Inner Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          <div className="flex justify-around items-center h-20 relative z-10">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-20 h-full transition-all duration-300 active:scale-95 group",
                    isActive ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"
                  )}
                >
                  <div className={cn(
                      "p-2 rounded-xl transition-all duration-300",
                      isActive ? "bg-primary/10" : "group-hover:bg-white/5"
                  )}>
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest mt-1 transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-40"
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                      <motion.div 
                        layoutId="nav-dot"
                        className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(0,39,156,1)]" 
                      />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}


