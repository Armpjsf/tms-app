import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { 
  Truck, 
  Plus,
  Wrench,
  Gauge,
  Calendar,
  FileSpreadsheet,
  TrendingUp
} from "lucide-react"
import { getAllVehicles, getVehicleStats } from "@/lib/supabase/vehicles"
import { getOperationalStats } from "@/lib/supabase/analytics"
import { VehicleDialog } from "@/components/vehicles/vehicle-dialog"
import { VehicleActions } from "@/components/vehicles/vehicle-actions"
import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { createBulkVehicles } from "@/app/vehicles/actions"
import { ExcelImport } from "@/components/ui/excel-import"
import { isSuperAdmin } from "@/lib/permissions"
import { getAllBranches, Branch } from "@/lib/supabase/branches"
import { getAllSubcontractors } from "@/lib/supabase/subcontractors"
import { cn } from "@/lib/utils"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function VehiclesPage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 12

  const branchId = searchParams.branch as string
  const [{ data: vehicles, count }, stats, subcontractors, opStats] = await Promise.all([
    getAllVehicles(page, limit, query, branchId),
    getVehicleStats(branchId),
    getAllSubcontractors(),
    getOperationalStats(branchId)
  ])

  const isAdmin = await isSuperAdmin()
  const branchList = isAdmin ? await getAllBranches() : []
  const branches = branchList || []

  return (
    <DashboardLayout>
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-2xl shadow-purple-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <Truck size={32} />
            </div>
            Fleet Master
          </h1>
          <p className="text-purple-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Asset Management • Maintenance Command Control</p>
          <div className="absolute top-2 right-2 text-white/5 text-[8px] uppercase tracking-tighter select-none pointer-events-none">
            A:{String(isAdmin)} | B:{branches.length} | S:{subcontractors.length}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <ExcelImport 
              trigger={
                  <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900">
                      <FileSpreadsheet size={20} className="mr-2" /> 
                      Import Excel
                  </PremiumButton>
              }
              title="นำเข้าข้อมูลรถ"
              onImport={createBulkVehicles as any}
              templateData={[
                  { 
                      Vehicle_Plate: "1กข-1234", 
                      Vehicle_Type: "4-Wheel", 
                      Brand: "Toyota", 
                      Model: "Revo", 
                      Active_Status: "Active", 
                      Current_Mileage: 50000, 
                      Next_Service_Mileage: 60000,
                      Max_Weight_kg: 1500,
                      Max_Volume_cbm: 2.5,
                      Tax_Expiry: "2025-12-31",
                      Insurance_Expiry: "2025-12-31",
                      Act_Expiry: "2025-12-31",
                      Sub_ID: "" // ใส่ ID ผู้รับเหมาถ้ามี
                  },
                  { 
                      Vehicle_Plate: "2กข-5678", 
                      Vehicle_Type: "6-Wheel", 
                      Brand: "Isuzu", 
                      Model: "Elf", 
                      Active_Status: "Maintenance", 
                      Current_Mileage: 120000, 
                      Next_Service_Mileage: 125000,
                      Max_Weight_kg: 4500,
                      Max_Volume_cbm: 12.0,
                      Tax_Expiry: "2025-06-30",
                      Insurance_Expiry: "2025-06-30",
                      Act_Expiry: "2025-06-30",
                      Sub_ID: "SUB-001"
                  }
              ]}
              templateFilename="template_vehicles.xlsx"
          />
          <VehicleDialog 
              mode="create" 
              branches={branches}
              subcontractors={subcontractors}
              trigger={
                  <PremiumButton className="h-14 px-8 rounded-2xl shadow-purple-500/20">
                      <Plus size={24} className="mr-2" />
                      เพิ่มรถใหม่
                  </PremiumButton>
              }
          />
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Asset Count", value: stats.total, icon: Truck, color: "purple" },
          { label: "Fleet Yield Yield", value: `${opStats.fleet.utilization.toFixed(1)}%`, icon: TrendingUp, color: "emerald" },
          { label: "Fuel Efficiency", value: `${opStats.fleet.fuelEfficiency.toFixed(1)} km/L`, icon: Gauge, color: "amber" },
          { label: "In Maintenance", value: stats.maintenance, icon: Wrench, color: "red" },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className="p-8 group border-none bg-white/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className={cn(
                    "p-4 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 text-white",
                    stat.color === 'purple' ? "bg-purple-500 shadow-purple-500/20" :
                    stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                    stat.color === 'amber' ? "bg-amber-500 shadow-amber-500/20" : "bg-red-500 shadow-red-500/20"
                )}>
                    <stat.icon size={24} />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/5 rounded-full border border-black/5">
                    <TrendingUp size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">REALTIME</span>
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{stat.value}</p>
            </div>
            {/* High-end numeric glow */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 text-7xl font-black text-slate-100/50 pointer-events-none select-none">
                0{idx + 1}
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหาทะเบียน, ยี่ห้อ..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vehicles.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-slate-950/5 rounded-br-[5rem] rounded-tl-[3rem] border border-dashed border-slate-200">
             <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">ไม่พบข้อมูลรถในระบบ</p>
          </div>
        ) : vehicles.map((vehicle) => (
          <PremiumCard key={vehicle.Vehicle_Plate} className="p-0 overflow-hidden group border-white/20 bg-white/[0.85] backdrop-blur-xl rounded-br-[5rem] rounded-tl-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] relative hover:shadow-[0_45px_100px_-20px_rgba(168,85,247,0.15)] transition-all duration-700">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-[0.5px]" />
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 flex items-center justify-center text-white font-bold shadow-2xl shadow-purple-500/30 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-transparent animate-pulse" />
                    <Truck size={28} className="relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-purple-600 transition-colors duration-500 uppercase">{vehicle.Vehicle_Plate}</h3>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-1 italic">{vehicle.Brand} {vehicle.Model}</p>
                    {vehicle.Sub_ID && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">
                                {subcontractors.find(s => s.Sub_ID === vehicle.Sub_ID)?.Sub_Name || vehicle.Sub_ID}
                            </p>
                        </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <span className={cn(
                        "px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all duration-700 shadow-sm",
                        vehicle.Active_Status === 'Active' ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30' :
                        vehicle.Active_Status === 'Maintenance' ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/30' :
                        'bg-slate-100 text-slate-400 border-slate-200'
                    )}>
                        {vehicle.Active_Status}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-700 translate-x-4 group-hover:translate-x-0">
                        <VehicleActions vehicle={vehicle} branches={branches} subcontractors={subcontractors} />
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-2xl rounded-full" />
                    <div className="flex items-center gap-2 mb-3">
                        <Gauge size={14} className="text-purple-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Mileage</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">{vehicle.Current_Mileage ? vehicle.Current_Mileage.toLocaleString() : "0"}<span className="text-xs ml-1 text-slate-400 font-bold uppercase tracking-widest">km</span></p>
                </div>
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 blur-2xl rounded-full" />
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-pink-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Next Svc</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">{vehicle.Next_Service_Mileage ? (vehicle.Next_Service_Mileage / 1000).toFixed(0) + "k" : "-"}<span className="text-xs ml-1 text-slate-400 font-bold uppercase tracking-widest">km</span></p>
                </div>
              </div>
            </div>

            {/* Footer with Capabilities */}
            <div className="px-8 py-5 bg-slate-50/30 border-t border-slate-100/50 flex items-center justify-between">
                <div className="flex gap-6">
                    {vehicle.Max_Weight_kg && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{vehicle.Max_Weight_kg}kg</span>
                        </div>
                    )}
                    {vehicle.Max_Volume_cbm && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{vehicle.Max_Volume_cbm}m³</span>
                        </div>
                    )}
                </div>
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic">
                    {vehicle.Vehicle_Type}
                </div>
            </div>
          </PremiumCard>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />
    </DashboardLayout>
  )
}
