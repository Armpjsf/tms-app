"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ListChecks, MapPin, User, Activity } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  if (!pathname.startsWith("/mobile")) return null

  const navItems = [
    { href: "/mobile/dashboard", icon: Home, label: "หน้าแรก" },
    { href: "/mobile/jobs", icon: ListChecks, label: "งาน" },
    { href: "/mobile/marketplace", icon: Activity, label: "หาเที่ยว", isCenter: true },
    { href: "/mobile/map", icon: MapPin, label: "แผนที่" },
    { href: "/mobile/profile", icon: User, label: "ข้อมูล" },
  ]

  return (
    <div className="fixed bottom-6 left-4 right-6 z-[100] pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-2 py-3">
          <div className="flex justify-around items-center h-14">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              
              if (item.isCenter) {
                return (
                  <Link key={item.href} href={item.href} className="relative -top-8 transition-transform active:scale-90">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.4)] border-4 border-slate-950 group overflow-hidden">
                      <item.icon className="text-white relative z-10" size={28} strokeWidth={2.5} />
                    </div>
                  </Link>
                )
              }

              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center w-12 transition-all duration-300 active:scale-90 ${
                    isActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {isActive && (
                      <div className="absolute -top-3 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse" />
                  )}
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[9px] mt-1 font-black uppercase tracking-widest transition-opacity ${isActive ? "opacity-100" : "opacity-60"}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
