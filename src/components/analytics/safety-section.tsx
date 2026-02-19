"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SafetyAnalytics } from "@/lib/supabase/safety-analytics"
import { ShieldAlert, FileCheck, AlertOctagon, CheckCircle } from "lucide-react"

export function SafetySection({ data }: { data: SafetyAnalytics }) {
  const { sos, pod } = data

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 text-red-400">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <ShieldAlert size={20} />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Safety & Compliance</h2>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SOS */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">SOS Incidents</span>
              <div className="p-2 bg-red-500/10 rounded-full text-red-400">
                <AlertOctagon size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{sos.total} ครั้ง</div>
            <p className="text-xs text-slate-500 mt-1">{sos.active} รายการที่ต้องดูแล</p>
          </CardContent>
        </Card>

        {/* SOS Resolved */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">แก้ไขปัญหาแล้ว</span>
              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                <CheckCircle size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{sos.resolved} ครั้ง</div>
            <p className="text-xs text-slate-500 mt-1">จากทั้งหมด {sos.total}</p>
          </CardContent>
        </Card>

        {/* POD Compliance */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">POD Compliance</span>
              <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
                <FileCheck size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{pod.complianceRate.toFixed(1)}%</div>
            <p className="text-xs text-slate-500 mt-1">งานที่มีหลักฐานรูปถ่าย</p>
          </CardContent>
        </Card>

        {/* Completed Jobs */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">งานเสร็จสมบูรณ์</span>
              <div className="p-2 bg-slate-700/50 rounded-full text-slate-400">
                <CheckCircle size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{pod.totalCompleted} งาน</div>
            <p className="text-xs text-slate-500 mt-1">ในช่วงเวลานี้</p>
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOS Breakdown */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <AlertOctagon size={16} className="text-slate-400" />
               ปัญหาที่พบบ่อย (By Type)
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {sos.byReason.slice(0, 5).map((item, i) => (
                    <div key={i} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                                {i.count}
                            </div>
                            <div className="text-white font-medium text-sm">{item.reason}</div>
                        </div>
                        <div className="w-32">
                           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500/70 rounded-full" style={{ width: `${(item.count / Math.max(sos.total, 1)) * 100}%` }} />
                           </div>
                        </div>
                    </div>
                ))}
                 {sos.byReason.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-sm">ไม่พบประวัติปัญหา</div>
                )}
             </div>
           </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <ShieldAlert size={16} className="text-slate-400" />
               เหตุการณ์ล่าสุด (Recent Alerts)
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {sos.recentAlerts.map((alert) => (
                    <div key={alert.id} className="py-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-medium text-sm">{alert.driver}</span>
                                <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-400">{alert.vehicle}</span>
                            </div>
                            <div className="text-xs text-red-400 mt-1">{alert.reason}</div>
                        </div>
                        <div className="text-right text-[10px] text-slate-500">
                            {new Date(alert.time).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}<br/>
                            {new Date(alert.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ))}
                {sos.recentAlerts.length === 0 && (
                     <div className="py-8 text-center text-slate-500 text-sm">ไม่มีเหตุการณ์ล่าสุด</div>
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
