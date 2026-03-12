export const dynamic = 'force-dynamic'
export const revalidate = 0

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Input } from "@/components/ui/input"
import { DataSection } from "@/components/ui/data-section"
import { 
  Fuel, 
  Plus,
  TrendingUp,
  Droplets,
  DollarSign,
  Hash,
} from "lucide-react"
import { getAllFuelLogs } from "@/lib/supabase/fuel"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { FuelDialog } from "@/components/fuel/fuel-dialog"
import { FuelActions } from "@/components/fuel/fuel-actions"
import { getFuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { FuelAnalyticsDashboard } from "@/components/fuel/fuel-analytics-dashboard"

import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"
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

  const [{ data: logs, count }, drivers, vehicles, analytics] = await Promise.all([
    getAllFuelLogs(page, limit, query, startDate, endDate),
    getAllDrivers(),
    getAllVehicles(),
    getFuelAnalytics(startDate || undefined, endDate || undefined),
  ])

  return (
    <DashboardLayout>
      {/* Bespoke Elite Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <Fuel size={32} />
            </div>
            Fuel COMMAND
          </h1>
          <p className="text-emerald-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Resource Consumption & Efficiency Control</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <FuelDialog 
              drivers={drivers.data}
              vehicles={vehicles.data}
              trigger={
                  <PremiumButton className="h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20">
                      <Plus size={24} className="mr-2" />
                      Log Fueling
                  </PremiumButton>
              }
          />
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: startDate || endDate ? "Period Expenditure" : "Total Fuel Spend", value: `฿${analytics.totalCost.toLocaleString()}`, icon: DollarSign, color: "emerald" },
          { label: "Total Volume (L)", value: `${analytics.totalLiters.toLocaleString()} L`, icon: Droplets, color: "blue" },
          { label: "Fleet Avg Km/L", value: analytics.avgKmPerLiter > 0 ? `${analytics.avgKmPerLiter} Km/L` : "-", icon: TrendingUp, color: "amber" },
          { label: "System Entry Logs", value: `${analytics.totalLogs}`, icon: Hash, color: "purple" },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className="p-8 group border-none bg-white/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className={cn(
                    "p-4 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 text-white",
                    stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                    stat.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" :
                    stat.color === 'amber' ? "bg-amber-500 shadow-amber-500/20" : "bg-purple-500 shadow-purple-500/20"
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

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1">
            <SearchInput placeholder="Search Plate Number, Driver..." />
        </div>
        <div className="flex gap-2 items-center relative z-20">
            <form className="flex gap-2 items-center flex-wrap">
                <Input 
                    type="date" 
                    name="startDate"
                    defaultValue={startDate}
                    className="h-14 bg-white/80 border-slate-200 text-slate-900 w-auto rounded-2xl shadow-sm px-6 font-bold"
                />
                <span className="text-slate-400 font-black">—</span>
                <Input 
                    type="date" 
                    name="endDate"
                    defaultValue={endDate}
                    className="h-14 bg-white/80 border-slate-200 text-slate-900 w-auto rounded-2xl shadow-sm px-6 font-bold"
                />
                <PremiumButton type="submit" variant="secondary" className="h-14 px-8 rounded-2xl">
                    Search
                </PremiumButton>
            </form>
        </div>
      </div>

      <PremiumCard className="overflow-hidden border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 bg-white rounded-br-[5rem] rounded-tl-[3rem]">
          {/* Table Header Section */}
          <div className="p-10 border-b border-slate-50 bg-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                    <Fuel size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Fuel Log Registry</h2>
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Historical Refueling Operations Feed</p>
                </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {logs.length === 0 ? (
                <div className="p-20 text-center">
                    <Droplets className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No refueling records found in the telemetry</p>
                </div>
            ) : (
                <table className="w-full">
                  <thead className="text-[9px] uppercase bg-slate-50 text-slate-500 border-b border-slate-100 font-black tracking-widest">
                    <tr>
                      <th className="text-left p-6">Timestamp / OP ID</th>
                      <th className="text-left p-6">Operator</th>
                      <th className="text-left p-6">Entity Plate</th>
                      <th className="text-left p-6">Terminal / Status</th>
                      <th className="text-center p-6">Artifact</th>
                      <th className="text-right p-6">Volume (L)</th>
                      <th className="text-right p-6">Unit Price</th>
                      <th className="text-right p-6">Gross Total</th>
                      <th className="text-right p-6">Odometer</th>
                      <th className="text-right p-6">Km/L Metric</th>
                      <th className="p-6 w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                  <tr 
                    key={log.Log_ID} 
                    className="border-b border-gray-200 hover:bg-white/[0.02] transition-colors"
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
                          <div className="relative w-10 h-10 mx-auto rounded-lg overflow-hidden border border-gray-200 bg-muted group cursor-pointer">
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
            )}
          </div>

          <div className="p-10 border-t border-slate-50 bg-slate-50/50">
             <Pagination totalItems={count || 0} limit={limit} />
          </div>
      </PremiumCard>

      {/* Fuel Analytics Dashboard */}
      <div className="mt-8">
        <DataSection title="วิเคราะห์การใช้น้ำมัน" icon={<TrendingUp size={18} />}>
          <FuelAnalyticsDashboard analytics={analytics} />
        </DataSection>
      </div>
    </DashboardLayout>
  )
}
