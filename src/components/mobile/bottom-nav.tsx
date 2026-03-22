"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Users, Truck, Map, Activity } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  if (!pathname.startsWith("/mobile")) return null

  const navItems = [
    { href: "/mobile/dashboard", icon: LayoutGrid, label: "หน้าแรก" },
    { href: "/mobile/jobs", icon: Truck, label: "งานขนส่ง", isCenter: true },
    { href: "/mobile/map", icon: Map, label: "แผนที่" },
    { href: "/mobile/profile", icon: Users, label: "โปรไฟล์" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-[#0a0518]/95 backdrop-blur-2xl border-t border-white/5 px-2 py-4 pb-8">
          <div className="flex justify-around items-end h-16">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              
              if (item.isCenter) {
                return (
                  <Link key={item.href} href={item.href} className="relative -top-6 transition-all active:scale-90 group">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary flex items-center justify-center shadow-[0_10px_30px_rgba(255,30,133,0.4)] border-4 border-[#0a0518] relative z-10 transition-transform group-hover:scale-110">
                      <item.icon className="text-white" size={28} strokeWidth={2.5} />
                    </div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-primary tracking-widest opacity-100 uppercase">
                        {item.label}
                    </span>
                  </Link>
                )
              }

              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center w-14 transition-all duration-300 active:scale-90 h-full ${
                    isActive ? "text-primary" : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} className="transition-transform group-hover:translate-y-[-2px]" />
                  <span className={`text-[9px] mt-2 font-black uppercase tracking-[0.2em] transition-opacity ${isActive ? "opacity-100" : "opacity-60"}`}>
                    {item.label}
                  </span>
                  {isActive && (
                      <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(255,30,133,1)]" />
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
