"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MaintenanceScheduleData } from "@/lib/supabase/maintenance-schedule"
import { Wrench, AlertTriangle, CheckCircle2, Truck } from "lucide-react"

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
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <span className="text-gray-500 text-sm font-medium">กำลังซ่อมบำรุง</span>
                <p className="text-[10px] text-muted-foreground font-medium">คำนวณจากใบแจ้งซ่อมที่ยังไม่เสร็จ (Repair Tickets)</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-full text-emerald-500">
                <Wrench size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{activeRepairs} คัน</div>
            <p className="text-xs text-gray-700 font-bold mt-1">อยู่ในอู่ซ่อม</p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">เกินกำหนด (Overdue)</span>
              <div className="p-2 bg-red-500/10 rounded-full text-red-400">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-400">{overdue.length} รายการ</div>
            <p className="text-xs text-gray-700 font-bold mt-1">ต้องดำเนินการทันที</p>
          </CardContent>
        </Card>

        {/* Completed This Month */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">ซ่อมเสร็จเดือนนี้</span>
              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{completedThisMonth} คัน</div>
            <p className="text-xs text-gray-700 font-bold mt-1">งานซ่อมบำรุงที่ปิดแล้ว</p>
          </CardContent>
        </Card>

        {/* Cost This Month */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <span className="text-gray-500 text-sm font-medium">ค่าซ่อมเดือนนี้</span>
                <p className="text-[10px] text-muted-foreground font-medium">ยอดรวมค่าใช้จ่ายจากใบแจ้งซ่อมในเดือนนี้</p>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-full text-rose-400">
                <Wrench size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">฿{totalCostThisMonth.toLocaleString()}</div>
            <p className="text-xs text-gray-700 font-bold mt-1">รวมค่าอะไหล่และค่าแรง</p>
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts List (Overdue + Due Soon) */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
           <CardHeader className="border-b border-gray-200 pb-4">
             <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-2">
               <AlertTriangle size={16} className="text-gray-500" />
               การแจ้งเตือนและการนัดหมาย
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
              <div className="divide-y divide-white/5">
                {[...overdue, ...dueSoon.slice(0, 5)].map((item, i) => (
                    <div key={`${item.vehicle_plate}-${item.service_type}-${i}`} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-black ${item.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {item.days_until <= 0 ? '!' : item.days_until}
                            </div>
                            <div>
                                <div className="text-gray-800 font-medium text-sm flex items-center gap-2">
                                  {item.vehicle_plate} 
                                  <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{item.vehicle_type}</span>
                                </div>
                                <div className="text-xs text-gray-700 font-bold mt-0.5">{item.service_type}</div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className={`text-sm font-bold ${item.status === 'overdue' ? 'text-red-400' : 'text-yellow-400'}`}>
                                {item.status === 'overdue' ? 'เลยกำหนด' : 'อีก ' + item.days_until + ' วัน'}
                             </div>
                             <div className="text-[10px] text-gray-700 font-bold mt-0.5">
                                {new Date(item.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                             </div>
                        </div>
                    </div>
                ))}
                {overdue.length === 0 && dueSoon.length === 0 && (
                     <div className="py-8 text-center text-gray-400 text-sm">ไม่มีรายการแจ้งเตือน</div>
                )}
              </div>
           </CardContent>
        </Card>

        {/* Vehicle Health (Most Repairs) */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
           <CardHeader className="border-b border-gray-200 pb-4">
             <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-2">
               <Truck size={16} className="text-gray-500" />
               Vehicle Health Issues (Top 5)
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {vehicleHealthSummary.slice(0, 5).map((v) => (
                    <div key={v.vehicle_plate} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-700">
                                {v.vehicle_plate.slice(0, 2)}
                            </div>
                            <div>
                                <div className="text-gray-800 font-medium text-sm">{v.vehicle_plate}</div>
                                <div className="text-xs text-gray-700 font-bold mt-0.5">{v.openTickets} tickets pending</div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-gray-700 font-bold text-sm">฿{v.totalCost.toLocaleString()}</div>
                             <div className="text-[10px] text-gray-700 font-bold mt-0.5">Total Repair Cost</div>
                        </div>
                    </div>
                ))}
                {vehicleHealthSummary.length === 0 && (
                    <div className="py-8 text-center text-gray-400 text-sm">สภาพรถปกติทุกคัน</div>
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
