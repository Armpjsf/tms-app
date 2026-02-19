"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkforceAnalytics } from "@/lib/supabase/workforce-analytics"
import { Users, UserCheck, AlertOctagon, Trophy, FileWarning } from "lucide-react"

export function WorkforceSection({ data }: { data: WorkforceAnalytics }) {
  const { kpis, topPerformers, driversWithIssues } = data

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 text-cyan-400">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Users size={20} />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Workforce & Drivers</h2>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Drivers */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">พนักงานขับรถทั้งหมด</span>
              <div className="p-2 bg-slate-700/50 rounded-full text-slate-400">
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{kpis.totalBox} คน</div>
            <p className="text-xs text-slate-500 mt-1">ในระบบ</p>
          </CardContent>
        </Card>

        {/* Active Today */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">ปฏิบัติงานวันนี้ (Active)</span>
              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{kpis.activeToday} คน</div>
            <p className="text-xs text-slate-500 mt-1">มีงานขนส่งวันนี้</p>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">เอกสารใกล้หมดอายุ</span>
              <div className="p-2 bg-yellow-500/10 rounded-full text-yellow-400">
                <FileWarning size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{kpis.licenseExpiring} คน</div>
            <p className="text-xs text-slate-500 mt-1">ต้องต่ออายุภายใน 30 วัน</p>
          </CardContent>
        </Card>

        {/* Expired */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">เอกสารหมดอายุแล้ว</span>
              <div className="p-2 bg-red-500/10 rounded-full text-red-400">
                <AlertOctagon size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-500">{kpis.licenseExpired} คน</div>
            <p className="text-xs text-slate-500 mt-1">ห้ามปฏิบัติงาน</p>
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <Trophy size={16} className="text-yellow-500" />
               Top Performers (Revenue)
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {topPerformers.map((d, i) => (
                    <div key={i} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                             <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${i === 0 ? 'bg-yellow-500' : 'bg-slate-700'}`}>
                                {i + 1}
                            </div>
                            <div>
                                <div className="text-white font-medium text-sm">{d.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{d.jobCount} Jobs • {d.successRate.toFixed(0)}% Success</div>
                            </div>
                        </div>
                        <div className="text-emerald-400 font-bold text-sm">฿{d.revenue.toLocaleString()}</div>
                    </div>
                ))}
                {topPerformers.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-sm">ไม่มีข้อมูลผลงาน</div>
                )}
             </div>
           </CardContent>
        </Card>

        {/* Compliance Issues */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <AlertOctagon size={16} className="text-slate-400" />
               Compliance Alerts
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {driversWithIssues.map((d) => (
                    <div key={d.id} className="py-4 flex items-center justify-between">
                        <div>
                            <div className="text-white font-medium text-sm">{d.name}</div>
                            <div className={`text-xs mt-1 ${d.issue === 'ใบขับขี่หมดอายุ' ? 'text-red-400' : 'text-yellow-400'}`}>
                                {d.issue}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-slate-400 text-xs font-bold">
                                {d.issue === 'ใบขับขี่หมดอายุ' ? `เกินกำหนด ${d.daysAuth} วัน` : `อีก ${d.daysAuth} วัน`}
                             </div>
                        </div>
                    </div>
                ))}
                {driversWithIssues.length === 0 && (
                     <div className="py-8 text-center text-slate-500 text-sm">เอกสารครบถ้วนสมบูรณ์</div>
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
