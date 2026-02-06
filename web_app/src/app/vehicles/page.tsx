import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Truck, 
  Search,
  Plus,
  Wrench,
  Gauge,
  Calendar,
} from "lucide-react"
import { getAllVehicles, getVehicleStats } from "@/lib/supabase/vehicles"
import { VehicleDialog } from "@/components/vehicles/vehicle-dialog"
import { VehicleActions } from "@/components/vehicles/vehicle-actions"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function VehiclesPage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 12

  const [{ data: vehicles, count }, stats] = await Promise.all([
    getAllVehicles(page, limit, query),
    getVehicleStats(),
  ])

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
        <VehicleDialog 
            mode="create" 
            trigger={
                <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
                    <Plus size={20} />
                    เพิ่มรถใหม่
                </Button>
            }
        />
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
          <Card key={vehicle.Vehicle_Plate} variant="glass" hover={true}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{vehicle.Vehicle_Plate}</h3>
                    <p className="text-xs text-slate-400">{vehicle.Brand} {vehicle.Model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    vehicle.Active_Status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' :
                    vehicle.Active_Status === 'Maintenance' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                    }`}>
                    {vehicle.Active_Status}
                    </span>
                    <VehicleActions vehicle={vehicle} />
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Gauge size={14} className="text-slate-500" />
                  <span>Mileage: {vehicle.Current_Mileage ? vehicle.Current_Mileage.toLocaleString() : "-"} km</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Wrench size={14} className="text-slate-500" />
                  <span>Last Service: {vehicle.Last_Service_Date ? new Date(vehicle.Last_Service_Date).toLocaleDateString('th-TH') : "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar size={14} className="text-slate-500" />
                  <span>Next Service: {vehicle.Next_Service_Mileage ? `${vehicle.Next_Service_Mileage.toLocaleString()} km` : "-"}</span>
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
