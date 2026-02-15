import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Fuel, 
  Plus,
  TrendingUp,
} from "lucide-react"
import { getAllFuelLogs, getTodayFuelStats } from "@/lib/supabase/fuel"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { FuelDialog } from "@/components/fuel/fuel-dialog"
import { FuelActions } from "@/components/fuel/fuel-actions"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FuelPage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const startDate = (searchParams.startDate as string) || ''
  const endDate = (searchParams.endDate as string) || ''
  const limit = 20

  const [{ data: logs, count }, stats, drivers, vehicles] = await Promise.all([
    getAllFuelLogs(page, limit, query, startDate, endDate),
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

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
            <SearchInput placeholder="ค้นหาทะเบียน, คนขับ..." />
        </div>
        <div className="flex gap-2">
            <form className="flex gap-2 items-center">
                <Input 
                    type="date" 
                    name="startDate"
                    defaultValue={startDate}
                    className="bg-slate-900 border-slate-700 text-white w-auto"
                />
                <span className="text-slate-500">-</span>
                <Input 
                    type="date" 
                    name="endDate"
                    defaultValue={endDate}
                    className="bg-slate-900 border-slate-700 text-white w-auto"
                />
                <Button type="submit" variant="secondary">กรอง</Button>
            </form>
        </div>
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
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">สถานี/ปั๊ม</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">จำนวน (L)</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">ราคา/L</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">รวมเงิน</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">เลขไมล์</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">ความประหยัด</th>
                    <th className="p-4 w-[50px]"></th>
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
                      <td className="p-4 text-slate-300 text-sm">
                        <div className="flex flex-col">
                            <span>{log.Station_Name || "-"}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit ${
                                log.Status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                log.Status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                                'bg-slate-500/20 text-slate-400'
                            }`}>
                                {log.Status === 'Approved' ? 'อนุมัติแล้ว' : 
                                 log.Status === 'Rejected' ? 'ไม่อนุมัติ' : 'รอตรวจสอบ'}
                            </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                         {/* Capacity Alert */}
                         <div className="flex flex-col items-end">
                            <span className={`text-sm ${log.Capacity_Status === 'Overflow' ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                                {log.Liters?.toFixed(2)}
                            </span>
                            {log.Capacity_Status === 'Overflow' && (
                                <span className="text-[10px] text-red-400 bg-red-400/10 px-1 rounded">
                                    Over ({log.Tank_Capacity}L)
                                </span>
                            )}
                         </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-emerald-400 font-bold text-sm">
                          ฿{log.Price_Total?.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400 text-sm">{log.Odometer?.toLocaleString()}</td>
                      <td className="p-4 text-right">
                         {log.Km_Per_Liter && log.Km_Per_Liter > 0 ? (
                            <div className="flex flex-col items-end">
                                <div className={`flex items-center justify-end gap-1 ${
                                    log.Efficiency_Status === 'Normal' ? 'text-emerald-400' : 
                                    log.Efficiency_Status === 'Warning' ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                    <span className="font-bold text-sm">{log.Km_Per_Liter.toFixed(1)}</span>
                                    <span className="text-xs text-slate-500">km/L</span>
                                </div>
                                {log.Efficiency_Status !== 'Normal' && (
                                    <span className={`text-[10px] px-1 rounded ${
                                        log.Efficiency_Status === 'Warning' ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10'
                                    }`}>
                                        {log.Efficiency_Status === 'Warning' ? 'Low' : 'Critical'}
                                    </span>
                                )}
                            </div>
                         ) : (
                            <span className="text-slate-600 text-xs">-</span>
                         )}
                      </td>
                      <td className="p-4">
                        <FuelActions 
                            log={log} 
                            drivers={drivers.data || []}
                            vehicles={vehicles.data || []}
                        />
                      </td>
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
