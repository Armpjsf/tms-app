"use client"


import { ThemeToggle } from "@/components/ui/theme-toggle"
import { MobileNotificationBadge } from "./notification-badge"

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
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 transition-colors duration-300 shadow-lg">
      <div className="flex items-baseline gap-2">
        <h1 className="font-black text-slate-950 text-xl tracking-tight leading-none">{title}</h1>
        <span 
          onClick={clearCache}
          className="text-[9px] text-slate-500 font-mono cursor-pointer hover:text-primary transition-colors px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100"
        >
          v1.2.0
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {rightElement ? (
          rightElement
        ) : (
          <MobileNotificationBadge />
        )}
      </div>
    </header>
  )
}
