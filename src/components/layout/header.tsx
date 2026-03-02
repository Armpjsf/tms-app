"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Search, Building2 } from "lucide-react"
import { useBranch } from "@/components/providers/branch-provider"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

interface HeaderProps {
  sidebarCollapsed?: boolean
}

export function Header({ sidebarCollapsed = false }: HeaderProps) {
  const { selectedBranch, setSelectedBranch, branches, isAdmin } = useBranch()

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-16 z-50 flex items-center justify-between px-6",
        "bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-300",
        sidebarCollapsed ? "left-20" : "left-[280px]"
      )}
      style={{ transition: "left 0.3s ease-in-out" }}
    >
      {/* Central/Left Section */}
      <div className="flex items-center gap-4 flex-1">
         
         {/* Branch Selector (Global) - Only for Admins */}
         {isAdmin && (
            <div className="w-56 shrink-0 relative z-[60]">
                <Select 
                    value={selectedBranch} 
                    onValueChange={setSelectedBranch}
                >
                    <SelectTrigger className="bg-muted/50 border-input text-foreground h-10 w-full focus:ring-0">
                            <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-gray-600 shrink-0" />
                            <span className="truncate">
                                {selectedBranch === 'All' ? 'ทุกสาขา' : branches.find(b => b.Branch_ID === selectedBranch)?.Branch_Name || selectedBranch}
                            </span>
                            </div>
                    </SelectTrigger>
                    <SelectContent className="z-[70] bg-white border border-gray-200 shadow-xl rounded-2xl">
                        <SelectItem value="All">ทุกสาขา</SelectItem>
                        {branches.map(b => (
                            <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                                {b.Branch_Name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}

        {/* Search */}
        <div 
          className="relative cursor-pointer"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
          <div className="w-72 h-11 pl-12 pr-4 rounded-2xl bg-muted/30 border border-input text-foreground flex items-center text-sm font-bold text-gray-500 hover:bg-muted/50 hover:border-emerald-500/30 transition-all shadow-sm">
             ค้นหางาน, ลูกค้า, คนขับ... <span className="ml-auto text-[10px] bg-muted px-2 py-1 rounded-lg border border-border">Ctrl + K</span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationDropdown />

        {/* Profile */}

      </div>
    </header>
  )
}
