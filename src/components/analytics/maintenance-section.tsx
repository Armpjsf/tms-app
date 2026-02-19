"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MaintenanceScheduleData } from "@/lib/supabase/maintenance-schedule"
import { Wrench, AlertTriangle, Calendar, CheckCircle2, Truck } from "lucide-react"

export function MaintenanceSection({ data }: { data: MaintenanceScheduleData }) {
  const { overdue, dueSoon, activeRepairs, completedThisMonth, totalCostThisMonth, vehicleHealthSummary } = data

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 text-rose-400">
        <div className="p-2 bg-rose-500/10 rounded-lg">
          <Wrench size={20} />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Maintenance & Fleet Health</h2>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Repairs */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">กำลังซ่อมบำรุง</span>
              <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
                <Wrench size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{activeRepairs} คัน</div>
            <p className="text-xs text-slate-500 mt-1">อยู่ในอู่ซ่อม</p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">เกินกำหนด (Overdue)</span>
              <div className="p-2 bg-red-500/10 rounded-full text-red-400">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-400">{overdue.length} รายการ</div>
            <p className="text-xs text-slate-500 mt-1">ต้องดำเนินการทันที</p>
          </CardContent>
        </Card>

        {/* Completed This Month */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">ซ่อมเสร็จเดือนนี้</span>
              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{completedThisMonth} คัน</div>
            <p className="text-xs text-slate-500 mt-1">งานซ่อมบำรุงที่ปิดแล้ว</p>
          </CardContent>
        </Card>

        {/* Cost This Month */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">ค่าซ่อมเดือนนี้</span>
              <div className="p-2 bg-rose-500/10 rounded-full text-rose-400">
                <Wrench size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">฿{totalCostThisMonth.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">รวมค่าอะไหล่และค่าแรง</p>
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts List (Overdue + Due Soon) */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <AlertTriangle size={16} className="text-slate-400" />
               การแจ้งเตือนและการนัดหมาย
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
              <div className="divide-y divide-white/5">
                {[...overdue, ...dueSoon.slice(0, 5)].map((item, i) => (
                    <div key={`${item.vehicle_plate}-${item.service_type}-${i}`} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white ${item.status === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {item.days_until <= 0 ? '!' : item.days_until}
                            </div>
                            <div>
                                <div className="text-white font-medium text-sm flex items-center gap-2">
                                  {item.vehicle_plate} 
                                  <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-400">{item.vehicle_type}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">{item.service_type}</div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className={`text-sm font-bold ${item.status === 'overdue' ? 'text-red-400' : 'text-yellow-400'}`}>
                                {item.status === 'overdue' ? 'เลยกำหนด' : 'อีก ' + item.days_until + ' วัน'}
                             </div>
                             <div className="text-[10px] text-slate-500 mt-0.5">
                                {new Date(item.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                             </div>
                        </div>
                    </div>
                ))}
                {overdue.length === 0 && dueSoon.length === 0 && (
                     <div className="py-8 text-center text-slate-500 text-sm">ไม่มีรายการแจ้งเตือน</div>
                )}
              </div>
           </CardContent>
        </Card>

        {/* Vehicle Health (Most Repairs) */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <Truck size={16} className="text-slate-400" />
               Vehicle Health Issues (Top 5)
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {vehicleHealthSummary.slice(0, 5).map((v) => (
                    <div key={v.vehicle_plate} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                {v.vehicle_plate.slice(0, 2)}
                            </div>
                            <div>
                                <div className="text-white font-medium text-sm">{v.vehicle_plate}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{v.openTickets} tickets pending</div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-slate-300 font-bold text-sm">฿{v.totalCost.toLocaleString()}</div>
                             <div className="text-[10px] text-slate-500 mt-0.5">Total Repair Cost</div>
                        </div>
                    </div>
                ))}
                {vehicleHealthSummary.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-sm">สภาพรถปกติทุกคัน</div>
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
