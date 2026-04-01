"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Users, Truck, Map, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function BottomNav() {
  const pathname = usePathname()

  if (!pathname.startsWith("/mobile")) return null

  // Security: Never show BottomNav on login page
  if (pathname === "/mobile/login") return null

  const navItems = [
    { href: "/mobile/dashboard", icon: LayoutGrid, label: "หน้าแรก" },
    { href: "/mobile/jobs", icon: Truck, label: "งาน", isCenter: true },
    { href: "/mobile/map", icon: Map, label: "แผนที่" },
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
              
              if (item.isCenter) {
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className="relative -top-6 transition-all active:scale-90 group"
                  >
                    <div className={cn(
                        "w-20 h-20 rounded-[2rem] flex items-center justify-center border-4 border-background relative z-10 transition-all duration-500",
                        isActive 
                        ? "bg-accent shadow-[0_15px_30px_rgba(182,9,0,0.4)] rotate-0" 
                        : "bg-primary shadow-[0_15px_30px_rgba(0,39,156,0.3)] group-hover:rotate-6"
                    )}>
                      <item.icon className="text-white" size={32} strokeWidth={2.5} />
                    </div>
                    <span className={cn(
                        "absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                        isActive ? "text-accent opacity-100" : "text-muted-foreground opacity-0"
                    )}>
                        {item.label}
                    </span>
                  </Link>
                )
              }

              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-16 h-full transition-all duration-300 active:scale-90 group",
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
                    "text-[9px] font-black uppercase tracking-widest mt-1 transition-all duration-300",
                    isActive ? "opacity-100 translate-y-0" : "opacity-40 translate-y-1"
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                      <motion.div 
                        layoutId="nav-dot"
                        className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(0,39,156,1)]" 
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


