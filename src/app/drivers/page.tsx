import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  Search,
  Plus,
  Phone,
  Truck,
  MoreVertical,
} from "lucide-react"
import { getAllDrivers, getDriverStats } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { DriverDialog } from "@/components/drivers/driver-dialog"
import { DriverActions } from "@/components/drivers/driver-actions"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DriversPage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 12

  const [{ data: drivers, count }, stats, vehicles] = await Promise.all([
    getAllDrivers(page, limit, query),
    getDriverStats(),
    getAllVehicles(),
  ])

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="text-blue-400" />
            จัดการคนขับ
          </h1>
          <p className="text-slate-400">รายชื่อและข้อมูลคนขับรถทั้งหมด</p>
        </div>
        <DriverDialog 
            mode="create" 
            vehicles={vehicles.data}
            trigger={
                <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                    <Plus size={20} />
                    เพิ่มคนขับ
                </Button>
            }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
          <p className="text-xs text-slate-400">ทั้งหมด</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-xs text-slate-400">พร้อมงาน</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.onJob}</p>
          <p className="text-xs text-slate-400">กำลังขับ</p>
        </div>
        <div className="rounded-xl p-4 bg-slate-500/10 border border-slate-500/20">
          <p className="text-2xl font-bold text-slate-400">{stats.total - stats.active}</p>
          <p className="text-xs text-slate-400">ไม่พร้อม/ลา</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหาชื่อ, เบอร์โทร..." />
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            ไม่พบข้อมูลคนขับ
          </div>
        ) : drivers.map((driver) => (
          <Card key={driver.Driver_ID} variant="glass" hover={true}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {driver.Image_Url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={driver.Image_Url} alt={driver.Driver_Name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      driver.Driver_Name?.charAt(0) || "?"
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{driver.Driver_Name}</h3>
                    <p className="text-xs text-slate-400">{driver.Driver_ID}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                        driver.Active_Status === 'Active' ? 'bg-emerald-400' : 'bg-slate-400'
                    }`} />
                    <DriverActions driver={driver} vehicles={vehicles.data} />
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone size={14} className="text-slate-500" />
                  <span>{driver.Mobile_No || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Truck size={14} className="text-slate-500" />
                  <span>{driver.Vehicle_Plate || "ไม่มีรถประจำ"}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1 text-xs">
                  ดูประวัติ
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  ติดต่อ
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />
    </DashboardLayout>
  )
}
