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

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const { selectedBranch } = useBranch()
  const { t } = useLanguage()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    async function loadVehicles() {
      setLoading(true)
      const data = await getAllVehicles(1, 100, "", selectedBranch)
      setVehicles(data.data || [])
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
      <div className="space-y-8 pb-20">
        {/* Header Command Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-background/50 backdrop-blur-xl p-8 rounded-[3rem] border border-border/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
                        <Truck className="text-primary" size={20} />
                    </div>
                    <span className="text-primary font-bold uppercase tracking-[0.3em] text-base font-bold">{t('navigation.fleet')}</span>
                </div>
                <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3 italic">
                    {t('vehicles.title')}
                </h1>
            </div>

            <div className="relative z-10 flex items-center gap-4">
                <ExcelImport 
                    trigger={
                        <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-black text-xl gap-3">
                            <FileSpreadsheet size={20} />
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
                    <button className="flex items-center gap-2 bg-white text-foreground px-8 py-4 rounded-2xl font-black text-xl hover:bg-primary hover:text-foreground transition-all shadow-xl active:scale-95 group/btn">
                        <Plus size={20} className="group-hover/btn:rotate-90 transition-transform duration-300" />
                        {t('vehicles.add_vehicle')}
                    </button>
                } />
            </div>
        </div>

        {/* Tactical Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-[2rem] border border-border/5 backdrop-blur-md">
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder={t('common.search')}
                    className="w-full bg-muted/50 border border-border/5 rounded-2xl py-4 pl-12 pr-4 text-xl focus:outline-none focus:border-primary/50 focus:bg-muted/80 transition-all placeholder:text-muted-foreground font-bold"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-3">
                <button className="flex items-center gap-2 px-6 py-4 bg-muted/50 border border-border/5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all font-bold text-lg font-bold uppercase tracking-widest">
                    <Filter size={16} />
                    {t('common.filter')}
                </button>
            </div>
        </div>

        {/* Fleet Asset Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
                Array(6).fill(0).map((_, i) => (
                    <div key={i} className="h-64 bg-muted/50 rounded-[2.5rem] animate-pulse border border-border/5" />
                ))
            ) : filteredVehicles.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                    <AlertTriangle className="mx-auto text-muted-foreground mb-4" size={48} />
                    <p className="text-muted-foreground font-black uppercase tracking-widest">{t('common.no_data')}</p>
                </div>
            ) : (
                filteredVehicles.map((vehicle) => (
                    <div key={vehicle.Vehicle_Plate} className="group relative bg-background/40 backdrop-blur-xl border border-border/5 rounded-[2.5rem] p-8 hover:border-primary/30 transition-all duration-500 shadow-xl overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                            <Truck size={80} className="text-primary" />
                        </div>
                        
                        <div className="flex justify-between items-start relative z-10 mb-6">
                            <div>
                                <Badge className="bg-primary/10 text-primary border-primary/20 mb-3 px-3 py-1 rounded-lg font-black text-base font-bold uppercase tracking-widest">
                                    {vehicle.Vehicle_Type || "-"}
                                </Badge>
                                <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase">{vehicle.Vehicle_Plate}</h3>
                            </div>
                            <VehicleActions vehicle={vehicle} />
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between text-xl border-b border-border/5 pb-4">
                                <span className="text-muted-foreground font-bold uppercase tracking-widest text-base font-bold">{t('vehicles.driver')}</span>
                                <span className="text-foreground font-black">{vehicle.Primary_Driver_Name || "-"}</span>
                            </div>
                                <span className="text-muted-foreground font-bold uppercase tracking-widest text-base font-bold">{t('vehicles.mileage')}</span>
                                <span className="text-primary font-black italic tracking-tighter">
                                    {vehicle.Current_Mileage?.toLocaleString() || "0"} KM
                                </span>
                        </div>

                        <div className="mt-8 pt-6 border-t border-border/5 flex gap-3">
                            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted/50 rounded-xl text-base font-bold font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all">
                                <Wrench size={14} />
                                {t('navigation.maintenance')}
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted/50 rounded-xl text-base font-bold font-black uppercase tracking-widest text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400 transition-all">
                                <ShieldCheck size={14} />
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

