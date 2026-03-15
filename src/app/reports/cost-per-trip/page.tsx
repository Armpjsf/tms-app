export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getCostPerTrip } from "./actions"
import { DollarSign, TrendingUp, TrendingDown, Truck, MapPin, User, ArrowLeft } from "lucide-react"
import Link from "next/link"

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function CostPerTripPage() {
  const { trips, summary } = await getCostPerTrip()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Bespoke Strategic Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10 text-left">
            <Link href="/reports" className="flex items-center gap-2 text-violet-400 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em] w-fit">
              <ArrowLeft className="w-4 h-4" /> Reports Hub
            </Link>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
              <div className="p-3 bg-violet-500 rounded-3xl shadow-2xl shadow-violet-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                <DollarSign size={32} />
              </div>
              Trip PERFORMANCE
            </h1>
            <p className="text-violet-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Cost Efficiency & Profitability Analysis (Last 30 Days)</p>
          </div>

          <div className="flex flex-wrap gap-4 relative z-10">
            <div className="flex items-center gap-3 px-6 py-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Live Financial Audit</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">จำนวนเที่ยว</p>
            <p className="text-3xl font-black text-gray-900">{summary.totalTrips}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">รายได้รวม</p>
            <p className="text-2xl font-black text-blue-600">฿{formatMoney(summary.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ต้นทุนรวม</p>
            <p className="text-2xl font-black text-red-500">฿{formatMoney(summary.totalCost)}</p>
          </div>
          <div className={`rounded-2xl border p-5 shadow-sm ${summary.totalProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">กำไรรวม</p>
            <p className={`text-2xl font-black ${summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ฿{formatMoney(summary.totalProfit)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              เฉลี่ย ฿{formatMoney(summary.avgProfitPerTrip)}/เที่ยว ({Math.round(summary.avgProfitPct)}%)
            </p>
          </div>
        </div>

        {/* Cost Breakdown Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-white">
            <h2 className="font-black text-gray-900">รายละเอียดต้นทุนแต่ละเที่ยว</h2>
          </div>

          {trips.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <DollarSign size={48} strokeWidth={1.5} className="mx-auto mb-4" />
              <p className="font-bold">ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-black">วันที่</th>
                    <th className="text-left px-4 py-3 font-black">ลูกค้า</th>
                    <th className="text-left px-4 py-3 font-black">เส้นทาง</th>
                    <th className="text-left px-4 py-3 font-black">คนขับ / รถ</th>
                    <th className="text-right px-4 py-3 font-black">รายได้</th>
                    <th className="text-right px-4 py-3 font-black">ค่าคนขับ</th>
                    <th className="text-right px-4 py-3 font-black">น้ำมัน</th>
                    <th className="text-right px-4 py-3 font-black">ทางด่วน</th>
                    <th className="text-right px-4 py-3 font-black">ต้นทุนรวม</th>
                    <th className="text-right px-4 py-3 font-black">กำไร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {trips.map(trip => (
                    <tr key={trip.Job_ID} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {trip.Plan_Date ? new Date(trip.Plan_Date + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[150px] truncate">
                        {trip.Customer_Name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={12} /> {trip.Route_Name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <span className="flex items-center gap-1 text-gray-600">
                            <User size={10} /> {trip.Driver_Name || '-'}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400 mt-0.5">
                            <Truck size={10} /> {trip.Vehicle_Plate || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 whitespace-nowrap">
                        ฿{formatMoney(trip.Cost_Customer_Total || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                        ฿{formatMoney(trip.Cost_Driver_Total || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                        {trip.fuel_cost > 0 ? `฿${formatMoney(trip.fuel_cost)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                        {trip.toll_cost > 0 ? `฿${formatMoney(trip.toll_cost)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-500 whitespace-nowrap">
                        ฿{formatMoney(trip.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {trip.profit >= 0 ? (
                            <TrendingUp size={14} className="text-emerald-500" />
                          ) : (
                            <TrendingDown size={14} className="text-red-500" />
                          )}
                          <span className={`font-black ${trip.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ฿{formatMoney(trip.profit)}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">{trip.profit_pct}%</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
