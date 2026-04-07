"use client"

import { MobileNotificationBadge } from "./notification-badge"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

type Props = {
  title: string
  showBack?: boolean
  rightElement?: React.ReactNode
}

export function MobileHeader({ title, showBack, rightElement }: Props) {
  const router = useRouter()
  
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
    <header className="fixed top-0 left-0 right-0 h-[calc(56px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-background/80 backdrop-blur-2xl border-b border-border flex items-center justify-between px-6 z-[100] transition-colors duration-300">
      <div className="flex items-center gap-4">
        {showBack && (
            <button 
                onClick={() => router.back()}
                className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground active:scale-95"
            >
                <ChevronLeft size={20} />
            </button>
        )}
        <div className="flex flex-col min-w-0">
            <h1 className="font-black text-accent text-xl tracking-tighter uppercase leading-none italic truncate">{title}</h1>
            <span 
                onClick={clearCache}
                className="text-[8px] font-black text-primary italic cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-[0.2em] mt-0.5"
            >
                LOGIS-PRO v1.2.5
            </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {rightElement ? (
          rightElement
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-muted/50 border border-border/10 flex items-center justify-center">
            <MobileNotificationBadge />
          </div>
        )}
      </div>
    </header>
  )
}

