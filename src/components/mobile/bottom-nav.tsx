"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ListChecks, MapPin, User, Camera } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  if (!pathname.startsWith("/mobile")) return null

  const navItems = [
    { href: "/mobile/dashboard", icon: Home, label: "หน้าแรก" },
    { href: "/mobile/jobs", icon: ListChecks, label: "งานของฉัน" },
    { href: "/mobile/scan", icon: Camera, label: "สแกน", isCenter: true },
    { href: "/mobile/map", icon: MapPin, label: "แผนที่งาน" },
    { href: "/mobile/profile", icon: User, label: "ข้อมูลพื้นฐาน" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-950/70 backdrop-blur-xl border-t border-white/5 pb-safe z-50 transition-colors duration-300 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          if (item.isCenter) {
            return (
              <Link key={item.href} href={item.href} className="relative -top-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30 border-4 border-slate-950 ring-2 ring-blue-500/20">
                  <item.icon className="text-white" size={24} />
                </div>
              </Link>
            )
          }

          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 space-y-1 transition-colors ${
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
