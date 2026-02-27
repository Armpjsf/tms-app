"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"

type Props = {
  title: string
  showBack?: boolean
  rightElement?: React.ReactNode
}

export function MobileHeader({ title, rightElement }: Props) {
  const clearCache = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-slate-950/70 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 z-40 transition-colors duration-300 shadow-lg">
      <div className="flex items-baseline gap-2">
        <h1 className="font-black text-foreground text-lg tracking-tight">{title}</h1>
        <span 
          onClick={clearCache}
          className="text-[8px] text-slate-500 font-mono cursor-pointer hover:text-white"
        >
          v1.2.0
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {rightElement ? (
          rightElement
        ) : (
          <Link href="/mobile/notifications" className="text-slate-400 hover:text-white relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
          </Link>
        )}
      </div>
    </header>
  )
}
