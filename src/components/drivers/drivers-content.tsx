"use client"

import { useState } from "react"
import { Driver } from "@/lib/supabase/drivers"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { 
    Users, Phone, Truck, ShieldCheck, Zap, Award, 
    Search, Plus, Filter, Download, Edit, Trash2
} from "lucide-react"
import { deleteDriver } from "@/app/drivers/actions"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { DriverDialog } from "./driver-dialog"
import { Pagination } from "@/components/ui/pagination"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type DriversContentProps = {
  drivers: Driver[]
  count: number
  branches: { Branch_ID: string; Branch_Name: string }[]
  vehicles?: { Vehicle_Plate: string; Brand?: string | null }[]
  subcontractors?: { Sub_ID: string; Sub_Name: string }[]
  userId?: string
  branchId?: string
}

export function DriversContent({ drivers, count, branches, vehicles = [], subcontractors = [], userId, branchId }: DriversContentProps) {
  const [isAdmin] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to decommission driver: ${name}?`)) return
    
    setDeletingId(id)
    try {
      const result = await deleteDriver(id)
      if (result.success) {
        toast.success(`Driver ${name} decommissioned successfully`)
      } else {
        toast.error(result.message)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Tactical deletion failed")
    } finally {
      setDeletingId(null)
    }
  }
  
  return (
    <div className="space-y-10 pb-20">
      {/* Brand Header */}
      <div className="relative group p-12 rounded-[4rem] bg-slate-950 border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 p-12 text-primary/5 pointer-events-none">
            <Users size={180} />
        </div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                  <Users className="text-white" size={24} />
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30 py-1 px-4 text-[10px] font-black tracking-widest uppercase">
                {isAdmin ? "COMMAND CENTER" : "BASE OPERATIONS"}
              </Badge>
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter">
            Driver<span className="text-primary font-black italic">ELITE</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">Human Capital & Tactical Performance Control</p>
        </div>
      </div>

      {/* Analytics Placeholder (Future Feature) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <PremiumCard className="glass-panel p-8 rounded-[3rem] border-white/5 opacity-50">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <Zap size={20} className="text-primary" />
                </div>
                <h4 className="text-white font-black text-xs uppercase tracking-widest">Performance Matrix</h4>
             </div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Analytics Layer Offline</p>
        </PremiumCard>
        <PremiumCard className="glass-panel p-8 rounded-[3rem] border-white/5 opacity-50">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-2 bg-accent/10 rounded-xl">
                    <ShieldCheck size={20} className="text-accent" />
                </div>
                <h4 className="text-white font-black text-xs uppercase tracking-widest">Compliance Status</h4>
             </div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Scanning Protocols Deferred</p>
        </PremiumCard>
        <PremiumCard className="glass-panel p-8 rounded-[3rem] border-white/5 opacity-50">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Award size={20} className="text-blue-400" />
                </div>
                <h4 className="text-white font-black text-xs uppercase tracking-widest">Merit System</h4>
             </div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Database Sync Required</p>
        </PremiumCard>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between glass-panel p-8 rounded-[3rem]">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by name, ID, or plate..." 
                    className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-700 focus:ring-primary/40 focus:border-primary/40 transition-all font-medium text-sm outline-none"
                />
            </div>
            <button className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-primary transition-colors">
                <Filter size={20} />
            </button>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
            <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest gap-2">
                <Download size={16} />
                Fleet Import
            </PremiumButton>
            <DriverDialog 
                mode="create"
                vehicles={vehicles}
                branches={branches}
                subcontractors={subcontractors}
                trigger={
                    <PremiumButton className="h-14 px-10 rounded-2xl bg-primary hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest gap-3 shadow-[0_10px_30px_rgba(255,30,133,0.3)]">
                        <Plus size={20} strokeWidth={3} />
                        Register Driver
                    </PremiumButton>
                }
            />
        </div>
      </div>

      {/* Driver Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(drivers || []).map((driver) => (
          <PremiumCard key={driver.Driver_ID} className="group glass-panel rounded-[3.5rem] border-white/5 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-2xl">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.Driver_Name}`} />
                      <AvatarFallback className="bg-secondary text-primary font-black uppercase">{driver.Driver_Name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-[#0a0518] rounded-full" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight group-hover:text-primary transition-colors line-clamp-1">{driver.Driver_Name || "UNNAMED"}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID: {driver.Driver_ID}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-primary font-black text-[9px] uppercase tracking-widest">ACTIVE ELITE</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                    <DriverDialog 
                        mode="edit"
                        driver={driver}
                        vehicles={vehicles}
                        branches={branches}
                        subcontractors={subcontractors}
                        trigger={
                            <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-primary transition-all hover:bg-primary/10">
                                <Edit size={16} />
                            </button>
                        }
                    />
                    <button 
                        onClick={() => handleDelete(driver.Driver_ID, driver.Driver_Name)}
                        disabled={deletingId === driver.Driver_ID}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 transition-all hover:bg-red-400/10 disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/5 transition-colors">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Asset Control</p>
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-primary" />
                        <span className="text-xs font-black text-slate-200">{driver.Vehicle_Plate || "UNASSIGNED"}</span>
                      </div>
                  </div>
                  <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/5 transition-colors">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Communication</p>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-primary" />
                        <span className="text-xs font-black text-slate-200">{driver.Mobile_No || "-"}</span>
                      </div>
                  </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-6">
                <div className="flex items-center gap-4">
                    {[
                        { icon: ShieldCheck, color: "text-primary" },
                        { icon: Zap, color: "text-accent" },
                        { icon: Award, color: "text-blue-400" }
                    ].map((m, i) => <m.icon key={i} size={16} className={m.color} />)}
                </div>
                <PremiumButton variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">
                  Performance DNA
                </PremiumButton>
              </div>
            </div>
          </PremiumCard>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={12} />
    </div>
  )
}
