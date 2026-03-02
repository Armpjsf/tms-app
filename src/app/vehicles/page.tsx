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
  const branches: Branch[] = isAdmin ? await getAllBranches() : []

  return (
    <DashboardLayout>
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-white/40 p-10 rounded-[2.5rem] border border-white/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-2xl shadow-purple-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <Truck size={32} />
            </div>
            Fleet Master
          </h1>
          <p className="text-gray-500 font-bold ml-[4.5rem] uppercase tracking-[0.2em] text-[10px]">Asset Management • Maintenance Control</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <ExcelImport 
              trigger={
                  <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl">
                      <FileSpreadsheet size={20} className="mr-2" /> 
                      Import Excel
                  </PremiumButton>
              }
              title="นำเข้าข้อมูลรถ"
              onImport={createBulkVehicles}
              templateData={[
                  { vehicle_plate: "1กข-1234", vehicle_type: "4-Wheel", brand: "Toyota", model: "Revo", active_status: "Active", current_mileage: 50000, next_service_mileage: 60000 },
                  { vehicle_plate: "2กข-5678", vehicle_type: "6-Wheel", brand: "Isuzu", model: "Elf", active_status: "Maintenance", current_mileage: 120000, next_service_mileage: 125000 }
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
          { label: "รถทั้งหมด", value: stats.total, icon: Truck, color: "purple" },
          { label: "ความคุ้มค่า (Yield)", value: `${opStats.fleet.utilization.toFixed(1)}%`, icon: TrendingUp, color: "emerald" },
          { label: "Fuel Efficiency", value: `${opStats.fleet.fuelEfficiency.toFixed(1)} km/L`, icon: Gauge, color: "amber" },
          { label: "ซ่อมบำรุง", value: stats.maintenance, icon: Wrench, color: "red" },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className="p-8 group">
            <div className="flex items-center justify-between mb-8">
                <div className={cn(
                    "p-4 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 text-white",
                    stat.color === 'purple' ? "bg-purple-500 shadow-purple-500/20" :
                    stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                    stat.color === 'amber' ? "bg-amber-500 shadow-amber-500/20" : "bg-red-500 shadow-red-500/20"
                )}>
                    <stat.icon size={24} />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                    <TrendingUp size={12} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">REALTIME</span>
                </div>
            </div>
            <div>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
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
          <div className="col-span-full text-center py-24 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
             <Truck className="w-16 h-16 text-gray-200 mx-auto mb-4" />
             <p className="text-gray-400 font-black uppercase tracking-widest text-xs">ไม่พบข้อมูลรถในระบบ</p>
          </div>
        ) : vehicles.map((vehicle) => (
          <PremiumCard key={vehicle.vehicle_plate} className="p-0 overflow-hidden group">
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-2xl shadow-purple-500/20 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <Truck size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter group-hover:text-purple-600 transition-colors">{vehicle.vehicle_plate}</h3>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-0.5">{vehicle.brand} {vehicle.model}</p>
                    {vehicle.sub_id && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-wider">
                                {subcontractors.find(s => s.Sub_ID === vehicle.sub_id)?.Sub_Name || vehicle.sub_id}
                            </p>
                        </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <span className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500",
                        vehicle.active_status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/5' :
                        vehicle.active_status === 'Maintenance' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/5' :
                        'bg-gray-100 text-gray-500 border-gray-200'
                    )}>
                        {vehicle.active_status}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                        <VehicleActions vehicle={vehicle} branches={branches} subcontractors={subcontractors} />
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                    <div className="flex items-center gap-2 mb-2">
                        <Gauge size={14} className="text-purple-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mileage</span>
                    </div>
                    <p className="text-xl font-black text-gray-900 tracking-tighter">{vehicle.current_mileage ? vehicle.current_mileage.toLocaleString() : "0"}<span className="text-xs ml-1 text-gray-400">km</span></p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-pink-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Svc</span>
                    </div>
                    <p className="text-xl font-black text-gray-900 tracking-tighter">{vehicle.next_service_mileage ? (vehicle.next_service_mileage / 1000).toFixed(0) + "k" : "-"}<span className="text-xs ml-1 text-gray-400">km</span></p>
                </div>
              </div>
            </div>

            {/* Footer with Capabilities */}
            <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                <div className="flex gap-4">
                    {vehicle.max_weight_kg && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{vehicle.max_weight_kg}kg</span>
                        </div>
                    )}
                    {vehicle.max_volume_cbm && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{vehicle.max_volume_cbm}m³</span>
                        </div>
                    )}
                </div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] italic">
                    ID: {vehicle.vehicle_type}
                </div>
            </div>
          </PremiumCard>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />
    </DashboardLayout>
  )
}
