"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ListChecks, MapPin, User, Camera } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  if (!pathname.startsWith("/mobile")) return null

  const navItems = [
    { href: "/mobile/dashboard", icon: Home, label: "Home" },
    { href: "/mobile/jobs", icon: ListChecks, label: "Jobs" },
    { href: "/mobile/scan", icon: Camera, label: "Scan", isCenter: true },
    { href: "/mobile/map", icon: MapPin, label: "Map" },
    { href: "/mobile/profile", icon: User, label: "Profile" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 pb-safe z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          if (item.isCenter) {
            return (
              <Link key={item.href} href={item.href} className="relative -top-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border-4 border-slate-900">
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
                isActive ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
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
