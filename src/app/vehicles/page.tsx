"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { VehicleDialog } from "@/components/vehicles/vehicle-dialog"
import { 
    Plus, 
    Truck, 
    Search, 
    Filter, 
    MoreHorizontal, 
    FileText, 
    Settings2, 
    ShieldCheck, 
    Wrench, 
    AlertTriangle,
    FileSpreadsheet
} from "lucide-react"
import { getAllVehicles, createBulkVehicles } from "@/lib/supabase/vehicles"
import type { Vehicle } from "@/lib/supabase/vehicles"
import { Badge } from "@/components/ui/badge"
import { VehicleActions } from "@/components/vehicles/vehicle-actions"
import { useBranch } from "@/components/providers/branch-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { ExcelImport } from "@/components/ui/excel-import"
import { PremiumButton } from "@/components/ui/premium-button"
import { isAdmin } from "@/lib/permissions"

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdminUser, setIsAdminUser] = useState(false)
  const { selectedBranch } = useBranch()
  const { t } = useLanguage()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    async function loadVehicles() {
      setLoading(true)
      const [data, adminStatus] = await Promise.all([
        getAllVehicles(1, 100, "", selectedBranch),
        isAdmin()
      ])
      setVehicles(data.data || [])
      setIsAdminUser(adminStatus)
      setLoading(false)
    }
    loadVehicles()
  }, [selectedBranch, refreshTrigger])

  const filteredVehicles = vehicles.filter(v => 
    (v.Vehicle_Plate || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.Vehicle_Type || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header Command Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-background/50 backdrop-blur-xl p-6 rounded-3xl border border-border/5 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-primary/20 rounded-lg border border-primary/30">
                        <Truck className="text-primary" size={16} />
                    </div>
                    <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic">{t('navigation.fleet')}</span>
                </div>
                <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3 italic premium-text-gradient uppercase leading-none">
                    {t('vehicles.title')}
                </h1>
            </div>

            <div className="relative z-10 flex items-center gap-3">
                {isAdminUser && (
                  <>
                    <ExcelImport 
                        trigger={
                            <PremiumButton variant="outline" className="h-11 px-5 rounded-xl border-border/10 hover:bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest gap-2">
                                <FileSpreadsheet size={16} />
                                {t('common.tactical.bulk_import') || 'Import'}
                            </PremiumButton>
                        }
                        title={t('vehicles.import_title') || 'Import Vehicles'}
                        onImport={createBulkVehicles}
                        templateData={[{
                            Vehicle_Plate: "80-1234 กทม.",
                            Vehicle_Type: "4-Wheel",
                            Brand: "Toyota",
                            Model: "Hilux Revo",
                            Max_Weight_kg: 1500,
                            Max_Volume_cbm: 10,
                            Driver_ID: "DRV-001",
                            Sub_ID: "SUB-001",
                            Branch_ID: "HQ"
                        }]}
                        templateFilename="logispro_vehicles_template.xlsx"
                    />
                    <VehicleDialog 
                        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
                        trigger={
                        <button className="flex items-center h-11 gap-2 bg-primary text-foreground px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg active:scale-95 group/btn">
                            <Plus size={16} className="group-hover/btn:rotate-90 transition-transform duration-300" strokeWidth={3} />
                            {t('vehicles.add_vehicle')}
                        </button>
                    } />
                  </>
                )}
            </div>
        </div>

        {/* Tactical Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-muted/30 p-3 rounded-2xl border border-border/5 backdrop-blur-md">
            <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder={t('common.search')}
                    className="w-full h-11 bg-muted/50 border border-border/5 rounded-xl pl-11 pr-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 focus:bg-muted/80 transition-all placeholder:text-muted-foreground outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <button className="flex items-center h-11 gap-2 px-5 bg-muted/50 border border-border/5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all font-black text-[10px] uppercase tracking-widest">
                    <Filter size={14} />
                    {t('common.filter')}
                </button>
            </div>
        </div>

        {/* Fleet Asset Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
                Array(6).fill(0).map((_, i) => (
                    <div key={i} className="h-48 bg-muted/50 rounded-2xl animate-pulse border border-border/5" />
                ))
            ) : filteredVehicles.length === 0 ? (
                <div className="col-span-full py-16 text-center">
                    <AlertTriangle className="mx-auto text-muted-foreground mb-4 opacity-20" size={40} />
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">{t('common.no_data')}</p>
                </div>
            ) : (
                filteredVehicles.map((vehicle) => (
                    <div key={vehicle.Vehicle_Plate} className="group relative bg-background/40 backdrop-blur-xl border border-border/5 rounded-2xl p-6 hover:border-primary/30 transition-all duration-500 shadow-lg overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <Truck size={60} className="text-primary" />
                        </div>
                        
                        <div className="flex justify-between items-start relative z-10 mb-4">
                            <div>
                                <Badge className="bg-primary/10 text-primary border-primary/20 mb-2 px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-widest">
                                    {vehicle.Vehicle_Type || "-"}
                                </Badge>
                                <h3 className="text-xl font-black text-foreground tracking-tighter uppercase italic">{vehicle.Vehicle_Plate}</h3>
                            </div>
                            <VehicleActions vehicle={vehicle} />
                        </div>

                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center justify-between border-b border-border/5 pb-2">
                                <span className="text-muted-foreground font-black uppercase tracking-widest text-[9px] italic">{t('vehicles.driver')}</span>
                                <span className="text-foreground font-black text-xs uppercase">{vehicle.Primary_Driver_Name || "-"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground font-black uppercase tracking-widest text-[9px] italic">{t('vehicles.mileage')}</span>
                                <span className="text-primary font-black italic tracking-tighter text-base">
                                    {vehicle.Current_Mileage?.toLocaleString() || "0"} KM
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border/5 flex gap-2">
                            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted/50 rounded-lg text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all">
                                <Wrench size={12} />
                                {t('navigation.maintenance')}
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted/50 rounded-lg text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400 transition-all">
                                <ShieldCheck size={12} />
                                {t('navigation.checks')}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </DashboardLayout>
  )
}

