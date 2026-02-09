"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Map, 
  Truck, 
  Settings, 
  LogOut,
  Package,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard
  },
  {
    title: "Jobs",
    href: "/admin/jobs",
    icon: Package
  },
  {
    title: "Drivers",
    href: "/admin/drivers",
    icon: Users
  },
  {
    title: "Vehicles",
    href: "/admin/vehicles",
    icon: Truck
  },
  {
    title: "Map Tracking",
    href: "/admin/map",
    icon: Map
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings
  }
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full border-r border-slate-800 bg-slate-950 text-slate-200 w-64">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
          <Truck className="text-blue-500" />
          LOGIS Admin
        </h1>
      </div>

      <div className="flex-1 py-4 px-3 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                isActive 
                  ? "bg-blue-600/10 text-blue-400" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/20 gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
