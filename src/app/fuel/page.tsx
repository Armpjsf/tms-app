export const dynamic = 'force-dynamic'
export const revalidate = 0

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { StatsGrid } from "@/components/ui/stats-grid"
import { DataSection } from "@/components/ui/data-section"
import { 
  Fuel, 
  Plus,
  TrendingUp,
  Droplets,
  DollarSign,
  Hash,
} from "lucide-react"
import { getAllFuelLogs, getTodayFuelStats } from "@/lib/supabase/fuel"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { FuelDialog } from "@/components/fuel/fuel-dialog"
import { FuelActions } from "@/components/fuel/fuel-actions"
import { getFuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { FuelAnalyticsDashboard } from "@/components/fuel/fuel-analytics-dashboard"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import NextImage from "next/image"

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

  const [{ data: logs, count }, stats, drivers, vehicles, analytics] = await Promise.all([
    getAllFuelLogs(page, limit, query, startDate, endDate),
    getTodayFuelStats(),
    getAllDrivers(),
    getAllVehicles(),
    getFuelAnalytics(startDate || undefined, endDate || undefined),
  ])

  return (
    <DashboardLayout>
      <PageHeader
        icon={<Fuel size={28} />}
        title="บันทึกการเติมน้ำมัน"
        subtitle="จัดการข้อมูลการใช้น้ำมันเชื้อเพลิง"
        actions={
          <FuelDialog 
              drivers={drivers.data}
              vehicles={vehicles.data}
              trigger={
                  <Button size="lg" className="h-11 px-6 rounded-xl gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20">
                      <Plus size={20} />
                      บันทึกการเติม
                  </Button>
              }
          />
        }
      />

      <StatsGrid columns={4} stats={[
        { label: "ค่าใช้จ่ายวันนี้", value: `฿${stats.totalAmount.toLocaleString()}`, icon: <DollarSign size={20} />, color: "emerald" },
        { label: "ปริมาณน้ำมัน", value: `${stats.totalLiters.toLocaleString()} L`, icon: <Droplets size={20} />, color: "blue" },
        { label: "Km/L เฉลี่ย", value: "-", icon: <TrendingUp size={20} />, color: "amber" },
        { label: "รายการวันนี้", value: logs.length, icon: <Hash size={20} />, color: "purple" },
      ]} />

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
                    className="bg-slate-900/60 border-slate-800 text-foreground w-auto rounded-xl"
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                    type="date" 
                    name="endDate"
                    defaultValue={endDate}
                    className="bg-slate-900/60 border-slate-800 text-foreground w-auto rounded-xl"
                />
                <Button type="submit" variant="secondary" className="rounded-xl">กรอง</Button>
            </form>
        </div>
      </div>

      <DataSection title="รายการเติมน้ำมัน" icon={<Fuel size={18} />} noPadding>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            ไม่พบข้อมูลการเติมน้ำมัน
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 border-b border-slate-800 font-bold">
                <tr>
                  <th className="text-left p-4">วันที่/เวลา</th>
                  <th className="text-left p-4">คนขับ</th>
                  <th className="text-left p-4">ทะเบียนรถ</th>
                  <th className="text-left p-4">สถานี/ปั๊ม</th>
                  <th className="text-center p-4">รูปถ่าย</th>
                  <th className="text-right p-4">จำนวน (L)</th>
                  <th className="text-right p-4">ราคา/L</th>
                  <th className="text-right p-4">รวมเงิน</th>
                  <th className="text-right p-4">เลขไมล์</th>
                  <th className="text-right p-4">ความประหยัด</th>
                  <th className="p-4 w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr 
                    key={log.Log_ID} 
                    className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <span className="text-foreground text-sm">
                        {log.Date_Time ? new Date(log.Date_Time).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : "-"}
                      </span>
                    </td>
                    <td className="p-4 text-foreground font-medium text-sm">{log.Driver_Name || "-"}</td>
                    <td className="p-4 text-muted-foreground text-sm">{log.Vehicle_Plate || "-"}</td>
                    <td className="p-4 text-muted-foreground text-sm">
                      <div className="flex flex-col">
                          <span className="text-foreground">{log.Station_Name || "-"}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit ${
                              log.Status === 'Approved' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                              log.Status === 'Rejected' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                              'bg-muted text-muted-foreground'
                          }`}>
                              {log.Status === 'Approved' ? 'อนุมัติแล้ว' : 
                               log.Status === 'Rejected' ? 'ไม่อนุมัติ' : 'รอตรวจสอบ'}
                          </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {log.Photo_Url ? (
                          <div className="relative w-10 h-10 mx-auto rounded-lg overflow-hidden border border-slate-800 bg-muted group cursor-pointer">
                              <NextImage 
                                  src={log.Photo_Url} 
                                  alt="Receipt" 
                                  fill 
                                  className="object-cover group-hover:scale-110 transition-transform" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a href={log.Photo_Url} target="_blank" rel="noreferrer">
                                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                          <span className="text-[10px]">🔍</span>
                                      </div>
                                  </a>
                              </div>
                          </div>
                      ) : (
                          <span className="text-muted-foreground/30 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex flex-col items-end">
                           <span className={`text-sm ${log.Capacity_Status === 'Overflow' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-foreground'}`}>
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
                      <span className="text-muted-foreground text-sm">
                        ฿{(log.Price_Total && log.Liters) ? (log.Price_Total / log.Liters).toFixed(2) : "-"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        ฿{log.Price_Total?.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-right text-muted-foreground font-mono text-sm">{log.Odometer?.toLocaleString() || "-"}</td>
                    <td className="p-4 text-right">
                       {log.Km_Per_Liter && log.Km_Per_Liter > 0 ? (
                           <div className="flex flex-col items-end">
                               <div className={`flex items-center justify-end gap-1 ${
                                   log.Efficiency_Status === 'Normal' ? 'text-emerald-600 dark:text-emerald-400' : 
                                   log.Efficiency_Status === 'Warning' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                               }`}>
                                   <span className="font-bold text-sm">{log.Km_Per_Liter.toFixed(1)}</span>
                                   <span className="text-xs text-muted-foreground">km/L</span>
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
                           <span className="text-muted-foreground/50 text-xs">-</span>
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

        <div className="p-4 border-t border-slate-800">
           <Pagination totalItems={count || 0} limit={limit} />
        </div>
      </DataSection>

      {/* Fuel Analytics Dashboard */}
      <div className="mt-8">
        <DataSection title="วิเคราะห์การใช้น้ำมัน" icon={<TrendingUp size={18} />}>
          <FuelAnalyticsDashboard analytics={analytics} />
        </DataSection>
      </div>
    </DashboardLayout>
  )
}
