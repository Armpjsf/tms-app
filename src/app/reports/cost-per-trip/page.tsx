export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getCostPerTrip } from "./actions"
import { DollarSign, TrendingUp, TrendingDown, Truck, MapPin, User, ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import React from "react"
import { getAllCustomers } from "@/lib/supabase/customers"
import { ProfitReportFilters } from "./profit-report-filters"
import { ExportCSVButton } from "./export-csv-button"

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface PageProps {
  searchParams: Promise<{ 
    start?: string; 
    end?: string;
    customers?: string;
  }>
}

export default async function CostPerTripPage(props: PageProps) {
  const params = await props.searchParams
  const start = params.start
  const end = params.end
  const customers = params.customers ? params.customers.split(',') : []

  const [{ trips, summary }, { data: allCustomers }] = await Promise.all([
    getCostPerTrip(start, end, customers),
    getAllCustomers(1, 1000)
  ])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Bespoke Strategic Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-background p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10 text-left">
            <Link href="/reports" className="flex items-center gap-2 text-violet-400 hover:text-foreground font-bold font-black uppercase tracking-[0.2em] w-fit">
              <ArrowLeft className="w-4 h-4" /> Reports Hub
            </Link>
            <h1 className="text-5xl font-black text-foreground mb-2 tracking-tighter flex items-center gap-4">
              <div className="p-3 bg-violet-500 rounded-3xl shadow-2xl shadow-violet-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                <DollarSign size={32} />
              </div>
              Trip PERFORMANCE
            </h1>
            <p className="text-violet-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-base font-bold">Cost Efficiency & Profitability Analysis {start || end ? `(${start} to ${end})` : '(Last 30 Days)'}</p>
          </div>

          <div className="flex flex-wrap gap-4 relative z-10">
            <ExportCSVButton data={trips} />
            <div className="flex items-center gap-3 px-6 py-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-base font-bold font-black text-violet-400 uppercase tracking-widest">Live Financial Audit</span>
            </div>
          </div>
        </div>

        <ProfitReportFilters 
            allCustomers={allCustomers} 
            initialCustomers={customers} 
            initialStart={start || ""} 
            initialEnd={end || ""} 
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest mb-1">จำนวนเที่ยว</p>
            <p className="text-3xl font-black text-gray-900">{summary.totalTrips}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest mb-1">ระยะทางรวม</p>
            <p className="text-2xl font-black text-slate-700">{(summary.totalDistance || 0).toLocaleString()} KM</p>
            <p className="text-sm font-bold text-muted-foreground mt-1">฿{summary.avgCostPerKm.toFixed(2)} / KM</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest mb-1">รายได้รวม</p>
            <p className="text-2xl font-black text-blue-600">฿{formatMoney(summary.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest mb-1">ต้นทุนรวม</p>
            <p className="text-2xl font-black text-red-500">฿{formatMoney(summary.totalCost)}</p>
          </div>
          <div className={`rounded-2xl border p-5 shadow-sm ${summary.totalProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest mb-1">กำไรรวม</p>
            <p className={`text-2xl font-black ${summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ฿{formatMoney(summary.totalProfit)}
            </p>
            <p className="text-lg font-bold text-muted-foreground mt-1">
              {Math.round(summary.avgProfitPct)}% Margin
            </p>
          </div>
        </div>

        {/* Cost Breakdown Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-white flex justify-between items-center">
            <h2 className="font-black text-gray-900">รายละเอียดกำไร-ขาดทุนรายเที่ยว (Dynamic Profitability)</h2>
            <div className="text-xs font-bold text-amber-600/80 bg-amber-50 px-3 py-1 rounded-full italic">
              * ต้นทุนคาดการณ์ (น้ำมัน/ซ่อมบำรุง) ใช้เป็นข้อมูลอ้างอิงเท่านั้น และไม่ถูกนำมาหักลบในกำไรจริง
            </div>
          </div>

          {trips.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <DollarSign size={48} strokeWidth={1.5} className="mx-auto mb-4" />
              <p className="font-bold">ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
            </div>
          ) : (
            <div className="max-h-[700px] overflow-auto relative">
              <table className="w-full text-xl border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-slate-50/95 backdrop-blur-md text-lg font-bold text-muted-foreground uppercase tracking-wider border-b border-gray-200">
                    <th className="text-left px-4 py-4 font-black">วันที่ / งาน</th>
                    <th className="text-left px-4 py-4 font-black">ลูกค้า / เส้นทาง</th>
                    <th className="text-right px-4 py-4 font-black">ระยะทาง</th>
                    <th className="text-right px-4 py-4 font-black text-blue-600">รายได้</th>
                    <th className="text-right px-4 py-4 font-black">ค่าคนขับ</th>
                    <th className="text-right px-4 py-4 font-black">น้ำมัน(จริง)</th>
                    <th className="text-right px-4 py-4 font-black text-amber-500/80 text-sm italic">น้ำมัน(อ้างอิง)</th>
                    <th className="text-right px-4 py-4 font-black">ซ่อมบำรุง(จริง)</th>
                    <th className="text-right px-4 py-4 font-black text-amber-500/80 text-sm italic">ซ่อมบำรุง(อ้างอิง)</th>
                    <th className="text-right px-4 py-4 font-black text-red-500">ต้นทุนรวม(จริง)</th>
                    <th className="text-right px-4 py-4 font-black">กำไร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {trips.map((trip, idx) => {
                    const prevTrip = trips[idx - 1]
                    const showDateHeader = !prevTrip || prevTrip.Plan_Date !== trip.Plan_Date

                    return (
                      <React.Fragment key={trip.Job_ID}>
                        {showDateHeader && (
                          <tr className="bg-slate-100/80 sticky top-[60px] z-20 backdrop-blur-sm">
                            <td colSpan={11} className="px-6 py-2.5">
                              <div className="flex items-center gap-2 text-slate-600 font-black text-xs uppercase tracking-[0.2em]">
                                <Calendar size={14} className="text-slate-400" />
                                {trip.Plan_Date ? new Date(trip.Plan_Date + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : 'ไม่ระบุวันที่'}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr className={`hover:bg-violet-50/30 transition-colors group ${trip.profit < 0 ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <p className="text-sm font-bold text-slate-400 leading-none mb-2">
                                {trip.Plan_Date ? new Date(trip.Plan_Date + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-violet-600 bg-violet-100/50 px-2 py-0.5 rounded-lg border border-violet-200 uppercase tracking-tighter shadow-sm group-hover:bg-violet-500 group-hover:text-white transition-colors">
                                  #{trip.Job_ID.slice(-8).toUpperCase()}
                                </span>
                                {trip.Vehicle_Plate && (
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                    {trip.Vehicle_Plate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-black text-slate-700 max-w-[200px] truncate">{trip.Customer_Name || '-'}</p>
                            <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground truncate opacity-70">
                              <MapPin size={10} /> {trip.Route_Name || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-slate-500">
                            {trip.distance_km.toLocaleString()} KM
                          </td>
                          <td className="px-4 py-4 text-right font-black text-blue-600 whitespace-nowrap">
                            ฿{formatMoney(trip.Cost_Customer_Total)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap font-bold">
                            ฿{formatMoney(trip.Cost_Driver_Total + trip.extra_cost)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            ฿{formatMoney(trip.fuel_real)}
                          </td>
                          <td className="px-4 py-4 text-right text-amber-500/70 italic whitespace-nowrap text-sm">
                            ฿{formatMoney(trip.fuel_est)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            ฿{formatMoney(trip.maint_real)}
                          </td>
                          <td className="px-4 py-4 text-right text-amber-500/70 italic whitespace-nowrap text-sm">
                            ฿{formatMoney(trip.maint_est)}
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-red-500 whitespace-nowrap bg-red-50/20">
                            ฿{formatMoney(trip.total_cost)}
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {trip.profit >= 0 ? (
                                <TrendingUp size={14} className="text-emerald-500" />
                              ) : (
                                <TrendingDown size={14} className="text-red-500" />
                              )}
                              <span className={`font-black text-2xl tracking-tighter ${trip.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                ฿{formatMoney(trip.profit)}
                              </span>
                            </div>
                            <p className={`text-sm font-black uppercase tracking-widest ${trip.profit >= 0 ? 'text-emerald-500/60' : 'text-red-400'}`}>{trip.profit_pct}% Margin</p>
                          </td>
                        </tr>
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Actionable Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Loss Makers */}
          <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100">
              <h3 className="font-black text-red-700 flex items-center gap-2">
                <TrendingDown size={18} /> เที่ยวรถที่ขาดทุนหรือกำไรต่ำ (Attention Required)
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {trips.filter(t => t.profit_pct < 10).slice(0, 5).map(trip => (
                <div key={trip.Job_ID} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-black text-gray-900 text-sm">{trip.Route_Name || 'Unknown Route'}</p>
                    <p className="text-xs font-bold text-muted-foreground">{trip.Customer_Name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${trip.profit < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {trip.profit_pct}% Margin
                    </p>
                    <p className="text-[10px] font-bold text-gray-400">Loss: ฿{formatMoney(Math.abs(trip.profit))}</p>
                  </div>
                </div>
              ))}
              {trips.filter(t => t.profit_pct < 10).length === 0 && (
                <p className="text-center py-6 text-gray-400 font-bold italic text-sm">Excellent! No loss-making trips found.</p>
              )}
            </div>
          </div>

          {/* Most Profitable Customers */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100">
              <h3 className="font-black text-emerald-700 flex items-center gap-2">
                <TrendingUp size={18} /> ลูกค้าที่ทำกำไรสูงสุด (Star Accounts)
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {(() => {
                const customerStats: Record<string, any> = {}
                trips.forEach(trip => {
                  const name = trip.Customer_Name || 'Unknown'
                  if (!customerStats[name]) customerStats[name] = { name, profit: 0, revenue: 0 }
                  customerStats[name].profit += trip.profit
                  customerStats[name].revenue += trip.Cost_Customer_Total
                })
                return Object.values(customerStats)
                  .sort((a: any, b: any) => b.profit - a.profit)
                  .slice(0, 5)
                  .map((cust: any) => (
                    <div key={cust.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                      <p className="font-black text-gray-900 text-sm">{cust.name}</p>
                      <div className="text-right">
                        <p className="font-black text-emerald-600">฿{formatMoney(cust.profit)}</p>
                        <p className="text-[10px] font-bold text-gray-400">{cust.revenue > 0 ? Math.round((cust.profit / cust.revenue) * 100) : 0}% Average Margin</p>
                      </div>
                    </div>
                  ))
              })()}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

