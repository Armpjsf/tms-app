"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Search, Building2 } from "lucide-react"
import { useBranch } from "@/components/providers/branch-provider"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { LanguageSwitcher } from "@/components/ui/language-switcher"

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
        "fixed top-0 right-0 h-24 z-50 flex items-center justify-between px-10 font-sans",
        "bg-[#050110]/80 backdrop-blur-3xl border-b border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-300",
        sidebarCollapsed ? "left-24" : "left-[280px]"
      )}
      style={{ transition: "left 0.5s ease-in-out" }}
    >
      {/* Central/Left Section */}
      <div className="flex items-center gap-6 flex-1">
         
         {/* Branch Selector (Global) - Only for Admins */}
         {isAdmin && (
            <div className="w-64 shrink-0 relative z-[60]">
                <Select 
                    value={selectedBranch} 
                    onValueChange={setSelectedBranch}
                >
                    <SelectTrigger className="bg-white/5 border-white/10 text-slate-300 h-14 w-full focus:ring-1 focus:ring-primary/40 hover:bg-white/[0.08] transition-all rounded-2xl group">
                            <div className="flex items-center gap-3 truncate">
                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <Building2 className="w-4 h-4 text-primary shrink-0" />
                            </div>
                            <span className="truncate font-black text-white text-lg font-bold uppercase tracking-widest">
                                {selectedBranch === 'All' ? 'ALL BRANCHES' : branches.find(b => b.Branch_ID === selectedBranch)?.Branch_Name || selectedBranch}
                            </span>
                            </div>
                    </SelectTrigger>
                    <SelectContent className="z-[70] bg-[#0a0518] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-[2rem] text-slate-300 p-2">
                        <SelectItem value="All" className="rounded-xl hover:bg-primary/10 focus:bg-primary/10 focus:text-white transition-colors cursor-pointer py-3 h-12">ALL BRANCHES</SelectItem>
                        {branches.map(b => (
                            <SelectItem key={b.Branch_ID} value={b.Branch_ID} className="rounded-xl hover:bg-primary/10 focus:bg-primary/10 focus:text-white transition-colors cursor-pointer py-3 h-12">
                                {b.Branch_Name?.toUpperCase()}
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
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary group-hover:scale-110 transition-transform" size={20} strokeWidth={2.5} />
          <div className="w-96 h-14 pl-14 pr-6 rounded-2xl bg-white/5 border border-white/5 text-slate-400 flex items-center text-lg font-bold font-black uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:border-primary/30 transition-all shadow-inner group-hover:text-slate-200">
             Quick Cmd... <span className="ml-auto text-base font-bold bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10 text-slate-500 font-black">Ctrl + K</span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Language Selection */}
        <LanguageSwitcher />

        {/* Notifications */}
        <NotificationDropdown />
      </div>
    </header>
  )
}

