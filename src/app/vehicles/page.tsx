import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { StatsGrid } from "@/components/ui/stats-grid"
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

  const branchId = searchParams.branch as string
  const [{ data: vehicles, count }, stats, subcontractors] = await Promise.all([
    getAllVehicles(page, limit, query, branchId),
    getVehicleStats(branchId),
    getAllSubcontractors()
  ])

  const isAdmin = await isSuperAdmin()
  const branches: Branch[] = isAdmin ? await getAllBranches() : []

  return (
    <DashboardLayout>
      <PageHeader
        icon={<Truck size={28} />}
        title="จัดการรถขนส่ง"
        subtitle="ข้อมูลรถและสถานะการซ่อมบำรุง"
        actions={
          <>
            <ExcelImport 
                trigger={
                    <Button variant="outline" className="h-11 px-5 rounded-xl border-slate-800 bg-slate-950/50 hover:bg-slate-900 text-slate-300 hover:text-white transition-all">
                        <FileSpreadsheet size={16} className="mr-2" /> 
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
                    <Button size="lg" className="h-11 px-6 rounded-xl gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg shadow-purple-500/20">
                        <Plus size={20} />
                        เพิ่มรถใหม่
                    </Button>
                }
            />
          </>
        }
      />

      <StatsGrid columns={4} stats={[
        { label: "รถทั้งหมด", value: stats.total, icon: <Truck size={20} />, color: "purple" },
        { label: "พร้อมใช้งาน", value: stats.active, icon: <Truck size={20} />, color: "emerald" },
        { label: "ซ่อมบำรุง", value: stats.maintenance, icon: <Wrench size={20} />, color: "amber" },
        { label: "ไม่พร้อม/อื่นๆ", value: stats.total - stats.active - stats.maintenance, icon: <Truck size={20} />, color: "red" },
      ]} />

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหาทะเบียน, ยี่ห้อ..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            ไม่พบข้อมูลรถ
          </div>
        ) : vehicles.map((vehicle) => (
          <Card key={vehicle.vehicle_plate} className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm hover:border-primary/50 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.01] rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{vehicle.vehicle_plate}</h3>
                    <p className="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
                    {vehicle.sub_id && (
                        <p className="text-[10px] text-blue-500 font-medium">
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
                        <div className="text-[10px] text-muted-foreground text-right">
                           {vehicle.max_weight_kg && <span>{vehicle.max_weight_kg}kg</span>}
                           {vehicle.max_weight_kg && vehicle.max_volume_cbm && <span className="mx-1">|</span>}
                           {vehicle.max_volume_cbm && <span>{vehicle.max_volume_cbm}m³</span>}
                        </div>
                    )}
                    <VehicleActions vehicle={vehicle} branches={branches} subcontractors={subcontractors} />
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-foreground/80">
                  <Gauge size={14} className="text-muted-foreground" />
                  <span>Mileage: {vehicle.current_mileage ? vehicle.current_mileage.toLocaleString() : "-"} km</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/80">
                  <Wrench size={14} className="text-muted-foreground" />
                  <span>Last Service: {vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString('th-TH') : "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/80">
                  <Calendar size={14} className="text-muted-foreground" />
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
