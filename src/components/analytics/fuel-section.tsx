"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { Fuel, Droplets, GaugeCircle, TrendingUp, AlertTriangle } from "lucide-react"

export function FuelSection({ data }: { data: FuelAnalytics }) {
  const { totalLiters, totalCost, avgCostPerLiter, avgKmPerLiter, monthlyTrends, vehicleBreakdown, anomalies } = data

  // Max value for trend bars
  const maxTrendCost = Math.max(...monthlyTrends.map(m => m.totalCost), 1)

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 text-orange-400">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Fuel size={20} />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Fuel & Energy</h2>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">ค่าเชื้อเพลิงรวม</span>
              <div className="p-2 bg-orange-500/10 rounded-full text-orange-400">
                <Fuel size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">฿{totalCost.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">{totalLiters.toLocaleString()} ลิตร</p>
          </CardContent>
        </Card>

        {/* Avg Cost / Liter */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">ราคาเฉลี่ย / ลิตร</span>
              <div className="p-2 bg-yellow-500/10 rounded-full text-yellow-400">
                <Droplets size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">฿{avgCostPerLiter.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">บาท / ลิตร</p>
          </CardContent>
        </Card>

        {/* Efficiency */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">ประสิทธิภาพเฉลี่ย</span>
              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                <GaugeCircle size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{avgKmPerLiter.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">กม. / ลิตร</p>
          </CardContent>
        </Card>

        {/* Anomalies */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">ความผิดปกติ</span>
              <div className="p-2 bg-red-500/10 rounded-full text-red-400">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-400">{anomalies.length}</div>
            <p className="text-xs text-slate-500 mt-1">รายการต้องตรวจสอบ</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart (Simple Bar) */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <TrendingUp size={16} className="text-slate-400" />
               แนวโน้มค่าเชื้อเพลิง (6 เดือนย้อนหลัง)
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
              <div className="flex items-end justify-between gap-2 h-48">
                {monthlyTrends.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full bg-slate-800/50 rounded-t-sm relative flex items-end justify-center group-hover:bg-slate-800 transition-colors" style={{ height: '100%' }}>
                            <div 
                                className="w-full mx-1 bg-orange-500/80 hover:bg-orange-500 transition-all rounded-t-sm relative"
                                style={{ height: `${(m.totalCost / maxTrendCost) * 100}%` }}
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white bg-slate-900 px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-slate-700">
                                    ฿{m.totalCost.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] text-slate-500">{m.month}</span>
                    </div>
                ))}
                {monthlyTrends.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">ไม่มีข้อมูล</div>
                )}
              </div>
           </CardContent>
        </Card>

        {/* Top Vehicle Consumption */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <Fuel size={16} className="text-slate-400" />
               Top Consumption Vehicles
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {vehicleBreakdown.slice(0, 5).map((v) => (
                    <div key={v.vehicle_plate} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                {v.vehicle_plate.slice(0, 2)}
                            </div>
                            <div>
                                <div className="text-white font-medium text-sm">{v.vehicle_plate}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{v.logCount} transactions</div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-orange-400 font-bold text-sm">฿{v.totalCost.toLocaleString()}</div>
                             <div className="text-[10px] text-slate-500 mt-0.5">{v.avgEfficiency.toFixed(1)} km/L</div>
                        </div>
                    </div>
                ))}
                 {vehicleBreakdown.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-sm">ไม่มีข้อมูลรถ</div>
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
