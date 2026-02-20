import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Truck, 
  Plus,
  Wrench,
  Gauge,
  Calendar,
  FileSpreadsheet
} from "lucide-react"
import { getAllVehicles, getVehicleStats } from "@/lib/supabase/vehicles"
import { VehicleDialog } from "@/components/vehicles/vehicle-dialog"
import { VehicleActions } from "@/components/vehicles/vehicle-actions"
import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { createBulkVehicles } from "@/app/vehicles/actions"
import { ExcelImport } from "@/components/ui/excel-import"
import { isSuperAdmin } from "@/lib/permissions"
import { getAllBranches, Branch } from "@/lib/supabase/branches"
import { getAllSubcontractors } from "@/lib/supabase/subcontractors"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function VehiclesPage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 12

  const [{ data: vehicles, count }, stats, subcontractors] = await Promise.all([
    getAllVehicles(page, limit, query),
    getVehicleStats(),
    getAllSubcontractors()
  ])

  const isAdmin = await isSuperAdmin()
  const branches: Branch[] = isAdmin ? await getAllBranches() : []

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Truck className="text-purple-400" />
            จัดการรถขนส่ง
          </h1>
          <p className="text-slate-400">ข้อมูลรถและสถานะการซ่อมบำรุง</p>
        </div>
        <div className="flex gap-2">
            <ExcelImport 
                trigger={
                    <Button variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800">
                        <FileSpreadsheet size={16} /> 
                        นำเข้า Excel
                    </Button>
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
                    <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
                        <Plus size={20} />
                        เพิ่มรถใหม่
                    </Button>
                }
            />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-purple-500/10 border border-purple-500/20">
          <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
          <p className="text-xs text-slate-400">รถทั้งหมด</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-xs text-slate-400">พร้อมใช้งาน</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.maintenance}</p>
          <p className="text-xs text-slate-400">ซ่อมบำรุง</p>
        </div>
        <div className="rounded-xl p-4 bg-slate-500/10 border border-slate-500/20">
          <p className="text-2xl font-bold text-slate-400">{stats.total - stats.active - stats.maintenance}</p>
          <p className="text-xs text-slate-400">ไม่พร้อม/อื่นๆ</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหาทะเบียน, ยี่ห้อ..." />
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            ไม่พบข้อมูลรถ
          </div>
        ) : vehicles.map((vehicle) => (
          <Card key={vehicle.vehicle_plate} variant="glass" hover={true}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{vehicle.vehicle_plate}</h3>
                    <p className="text-xs text-slate-400">{vehicle.brand} {vehicle.model}</p>
                    {vehicle.sub_id && (
                        <p className="text-[10px] text-blue-400">
                            {subcontractors.find(s => s.Sub_ID === vehicle.sub_id)?.Sub_Name || vehicle.sub_id}
                        </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    vehicle.active_status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' :
                    vehicle.active_status === 'Maintenance' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                    }`}>
                    {vehicle.active_status}
                    </span>
                    {(vehicle.max_weight_kg || vehicle.max_volume_cbm) && (
                        <div className="text-[10px] text-slate-500 text-right">
                           {vehicle.max_weight_kg && <span>{vehicle.max_weight_kg}kg</span>}
                           {vehicle.max_weight_kg && vehicle.max_volume_cbm && <span className="mx-1">|</span>}
                           {vehicle.max_volume_cbm && <span>{vehicle.max_volume_cbm}m³</span>}
                        </div>
                    )}
                    <VehicleActions vehicle={vehicle} branches={branches} subcontractors={subcontractors} />
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Gauge size={14} className="text-slate-500" />
                  <span>Mileage: {vehicle.current_mileage ? vehicle.current_mileage.toLocaleString() : "-"} km</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Wrench size={14} className="text-slate-500" />
                  <span>Last Service: {vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString('th-TH') : "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar size={14} className="text-slate-500" />
                  <span>Next Service: {vehicle.next_service_mileage ? `${vehicle.next_service_mileage.toLocaleString()} km` : "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />
    </DashboardLayout>
  )
}
