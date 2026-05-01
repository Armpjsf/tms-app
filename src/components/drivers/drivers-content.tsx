"use client"

import { useState } from "react"
import { Driver } from "@/lib/supabase/drivers"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { 
    Search, Plus, Filter, Download, Edit, Trash2, FileSpreadsheet,
    Users, Zap, ShieldCheck, Award, Truck, Phone
} from "lucide-react"
import { deleteDriver } from "@/app/drivers/actions"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { DriverDialog } from "./driver-dialog"
import { Pagination } from "@/components/ui/pagination"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import { ExcelImport } from "../ui/excel-import"

type DriversContentProps = {
  drivers: Driver[]
  count: number
  branches: { Branch_ID: string; Branch_Name: string }[]
  vehicles?: { Vehicle_Plate: string; Brand?: string | null }[]
  subcontractors?: { Sub_ID: string; Sub_Name: string }[]
  userId?: string
  branchId?: string
  createBulkDrivers?: (data: Partial<Driver>[]) => Promise<{ success: boolean; message: string }>
  isAdminUser?: boolean
}

export function DriversContent({ 
    drivers, 
    count, 
    branches, 
    vehicles = [], 
    subcontractors = [], 
    userId, 
    branchId, 
    createBulkDrivers,
    isAdminUser = false 
}: DriversContentProps) {
  const { t } = useLanguage()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('common.error'))) return
    
    setDeletingId(id)
    try {
      const result = await deleteDriver(id)
      if (result.success) {
        toast.success(t('common.success'))
      } else {
        toast.error(result.message)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setDeletingId(null)
    }
  }
  
  return (
    <div className="space-y-8 pb-20">
      {/* Brand Header */}
      <div className="relative group p-8 rounded-3xl bg-background border border-border/5 overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 p-8 text-primary/5 pointer-events-none">
            <Users size={120} />
        </div>
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary rounded-xl shadow-lg">
                  <Users className="text-white" size={18} />
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30 py-0.5 px-3 text-[10px] font-black tracking-widest uppercase">
                {isAdminUser ? "COMMAND CENTER" : "BASE OPERATIONS"}
              </Badge>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tighter uppercase premium-text-gradient italic">
            {t('navigation.drivers')}<span className="text-primary font-black italic ml-2">ELITE</span>
          </h1>
          <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-[10px] italic">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      {/* Analytics Placeholder (Future Feature) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { icon: Zap, label: t('navigation.monitoring') + " Matrix", value: "Analytics Offline", color: "text-primary", bg: "bg-primary/10" },
          { icon: ShieldCheck, label: t('navigation.monitoring') + " Status", value: "Scanning Deferred", color: "text-accent", bg: "bg-accent/10" },
          { icon: Award, label: "Merit System", value: "Database Sync Required", color: "text-blue-400", bg: "bg-blue-500/10" }
        ].map((stat, i) => (
          <PremiumCard key={i} className="glass-panel p-5 rounded-2xl border-border/5 opacity-50">
             <div className="flex items-center gap-3 mb-2">
                <div className={cn("p-1.5 rounded-lg", stat.bg)}>
                    <stat.icon size={16} className={stat.color} />
                </div>
                <h4 className="text-foreground font-black text-xs uppercase tracking-widest">{stat.label}</h4>
             </div>
             <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic">{stat.value}</p>
          </PremiumCard>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-2xl border-border/5">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                    type="text" 
                    placeholder={t('common.search')}
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/50 border border-border/10 text-foreground placeholder:text-muted-foreground focus:ring-primary/40 focus:border-primary/40 transition-all font-black text-xs uppercase tracking-widest outline-none"
                />
            </div>
            <button className="p-3 rounded-xl bg-muted/50 border border-border/10 text-muted-foreground hover:text-primary transition-colors">
                <Filter size={16} />
            </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
            {isAdminUser && (
              <>
                {createBulkDrivers && (
                    <ExcelImport 
                        trigger={
                            <PremiumButton variant="outline" className="h-11 px-5 rounded-xl border-border/10 hover:bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest gap-2">
                                <FileSpreadsheet size={16} />
                                {t('common.tactical.bulk_import') || 'Import'}
                            </PremiumButton>
                        }
                        title={t('drivers.import_title') || 'Import Drivers'}
                        onImport={createBulkDrivers}
                        templateData={[{
                            Driver_ID: "DRV-001",
                            Driver_Name: "สมชาย เข็มกลัด",
                            Mobile_No: "0812345678",
                            Password: "pass-1234",
                            Vehicle_Plate: "80-1234 กทม.",
                            Expire_Date: "2025-12-31",
                            Branch_ID: "HQ",
                            Sub_ID: "SUB-001",
                            Bank_Name: "K-Bank",
                            Bank_Account_No: "123-4-56789-0",
                            Bank_Account_Name: "สมชาย เข็มกลัด"
                        }]}
                        templateFilename="logispro_drivers_template.xlsx"
                    />
                )}
                <DriverDialog 
                    mode="create"
                    vehicles={vehicles}
                    branches={branches}
                    subcontractors={subcontractors}
                    driver={{ Branch_ID: branchId }}
                    trigger={

                        <PremiumButton className="h-11 px-6 rounded-xl bg-primary hover:brightness-110 text-foreground font-black uppercase tracking-widest gap-2 shadow-lg text-[10px]">
                            <Plus size={16} strokeWidth={3} />
                            {t('common.success')}
                        </PremiumButton>
                    }
                />
              </>
            )}
        </div>
      </div>

      {/* Driver Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(drivers || []).map((driver) => (
          <PremiumCard key={driver.Driver_ID} className="group glass-panel rounded-2xl border-border/5 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 overflow-hidden shadow-lg">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xl">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.Driver_Name}`} />
                      <AvatarFallback className="bg-secondary text-primary font-black uppercase text-xs">{driver.Driver_Name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1 uppercase italic">{driver.Driver_Name || t('common.loading')}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic">ID: {driver.Driver_ID}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-primary font-black text-[9px] uppercase tracking-widest italic">ACTIVE ELITE</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                    <DriverDialog 
                        mode="edit"
                        driver={driver}
                        vehicles={vehicles}
                        branches={branches}
                        subcontractors={subcontractors}
                        trigger={
                            <button className="p-2 rounded-lg bg-muted/50 border border-border/10 text-muted-foreground hover:text-primary transition-all hover:bg-primary/10">
                                <Edit size={14} />
                            </button>
                        }
                    />
                    <button 
                        onClick={() => handleDelete(driver.Driver_ID, driver.Driver_Name || '')}
                        disabled={deletingId === driver.Driver_ID}
                        className="p-2 rounded-lg bg-muted/50 border border-border/10 text-muted-foreground hover:text-red-400 transition-all hover:bg-red-400/10 disabled:opacity-50"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/5 group-hover:bg-muted/50 transition-colors">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t('navigation.vehicles')}</p>
                      <div className="flex items-center gap-2">
                        <Truck size={12} className="text-primary" />
                        <span className="text-xs font-black text-foreground uppercase italic">{driver.Vehicle_Plate || t('common.pending')}</span>
                      </div>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/5 group-hover:bg-muted/50 transition-colors">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t('navigation.chat')}</p>
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-primary" />
                        <span className="text-xs font-black text-foreground italic">{driver.Mobile_No || "-"}</span>
                      </div>
                  </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/5 pt-4">
                <div className="flex items-center gap-3">
                    {[
                        { icon: ShieldCheck, color: "text-primary" },
                        { icon: Zap, color: "text-accent" },
                        { icon: Award, color: "text-blue-400" }
                    ].map((m, i) => <m.icon key={i} size={14} className={m.color} />)}
                </div>
                <button className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all italic">
                  Performance DNA
                </button>
              </div>
            </div>
          </PremiumCard>
        ))}
      </div>
      
      <div className="flex justify-center mt-8">
        <Pagination totalItems={count || 0} limit={12} />
      </div>
    </div>
  )
}

