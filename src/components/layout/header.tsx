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
        "bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 shadow-2xl transition-all duration-300",
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
                    <SelectTrigger className="bg-slate-900/50 border-slate-800 text-slate-300 h-10 w-full focus:ring-0 hover:bg-slate-900 transition-colors">
                            <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate font-bold">
                                {selectedBranch === 'All' ? 'ทุกสาขา' : branches.find(b => b.Branch_ID === selectedBranch)?.Branch_Name || selectedBranch}
                            </span>
                            </div>
                    </SelectTrigger>
                    <SelectContent className="z-[70] bg-slate-950 border border-slate-800 shadow-2xl rounded-2xl text-slate-300">
                        <SelectItem value="All" className="hover:bg-slate-900 focus:bg-slate-900 focus:text-white">ทุกสาขา</SelectItem>
                        {branches.map(b => (
                            <SelectItem key={b.Branch_ID} value={b.Branch_ID} className="hover:bg-slate-900 focus:bg-slate-900 focus:text-white">
                                {b.Branch_Name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}

        {/* Search */}
        <div 
          className="relative cursor-pointer group"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 group-hover:scale-110 transition-transform" size={18} />
          <div className="w-72 h-11 pl-12 pr-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 flex items-center text-sm font-bold hover:bg-slate-900 hover:border-emerald-500/30 transition-all shadow-inner">
             ค้นหางาน, ลูกค้า, คนขับ... <span className="ml-auto text-[10px] bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-slate-500">Ctrl + K</span>
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
