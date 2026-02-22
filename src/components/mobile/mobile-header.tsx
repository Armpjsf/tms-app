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
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-slate-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-40">
      <h1 className="font-bold text-white text-lg">{title}</h1>
      
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
