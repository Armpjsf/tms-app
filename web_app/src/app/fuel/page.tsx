import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Fuel, 
  Search,
  Plus,
  TrendingUp,
  Droplets,
  Wallet,
} from "lucide-react"
import { getAllFuelLogs, getTodayFuelStats } from "@/lib/supabase/fuel"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { FuelDialog } from "@/components/fuel/fuel-dialog"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FuelPage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 20

  const [{ data: logs, count }, stats, drivers, vehicles] = await Promise.all([
    getAllFuelLogs(page, limit, query),
    getTodayFuelStats(),
    getAllDrivers(),
    getAllVehicles(),
  ])

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Fuel className="text-emerald-400" />
            บันทึกการเติมน้ำมัน
          </h1>
          <p className="text-slate-400">จัดการข้อมูลการใช้น้ำมันเชื้อเพลิง</p>
        </div>
        <FuelDialog 
            drivers={drivers.data}
            vehicles={vehicles.data}
            trigger={
                <Button size="lg" className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                    <Plus size={20} />
                    บันทึกการเติม
                </Button>
            }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">฿{stats.totalAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-400">ค่าใช้จ่ายวันนี้</p>
        </div>
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.totalLiters.toLocaleString()} L</p>
          <p className="text-xs text-slate-400">ปริมาณน้ำมัน</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-400" />
            <p className="text-2xl font-bold text-amber-400">-</p>
          </div>
          <p className="text-xs text-slate-400">Km/L เฉลี่ย</p>
        </div>
        <div className="rounded-xl p-4 bg-purple-500/10 border border-purple-500/20">
          <p className="text-2xl font-bold text-purple-400">{logs.length}</p>
          <p className="text-xs text-slate-400">รายการวันนี้</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหาทะเบียน, คนขับ..." />
      </div>

      {/* Fuel Logs Table */}
      <Card variant="glass">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              ไม่พบข้อมูลการเติมน้ำมัน
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* ... (keep table structure) ... */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">วันที่/เวลา</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">คนขับ</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ทะเบียนรถ</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ประเภท</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">จำนวน (L)</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">ราคา/L</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">รวมเงิน</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">เลขไมล์</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr 
                      key={log.Log_ID} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-slate-300 text-sm">
                          {log.Date_Time ? new Date(log.Date_Time).toLocaleString('th-TH') : "-"}
                        </span>
                      </td>
                      <td className="p-4 text-white font-medium text-sm">{log.Driver_Name || "-"}</td>
                      <td className="p-4 text-slate-300 text-sm">{log.Vehicle_Plate || "-"}</td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 w-fit">
                          <Droplets size={12} />
                          {log.Fuel_Type}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-300 text-sm">{log.Liters?.toFixed(2)}</td>
                      <td className="p-4 text-right text-slate-300 text-sm">{(log.Price_Total / log.Liters)?.toFixed(2) || "-"}</td>
                      <td className="p-4 text-right">
                        <span className="text-emerald-400 font-bold text-sm">
                          ฿{log.Price_Total?.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400 text-sm">{log.Odometer?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-white/10">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
