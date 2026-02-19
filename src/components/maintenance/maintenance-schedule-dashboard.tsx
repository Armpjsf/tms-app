"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Shield,
  Wrench,
  FileText,
} from "lucide-react"
import type { MaintenanceScheduleData, ScheduledService } from "@/lib/supabase/maintenance-schedule"

function ServiceCard({ service }: { service: ScheduledService }) {
  const statusConfig = {
    overdue: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: 'เกินกำหนด' },
    due_soon: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'ใกล้ถึงกำหนด' },
    upcoming: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', label: 'กำลังจะถึง' },
  }
  const config = statusConfig[service.status]

  const iconMap: Record<string, React.ReactNode> = {
    'ต่อประกันภัย': <Shield size={14} />,
    'ต่อทะเบียน': <FileText size={14} />,
    'เซอร์วิสตามระยะ': <Wrench size={14} />,
  }

  return (
    <div className={`p-3 rounded-xl ${config.bg} border ${config.border} flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`shrink-0 ${config.text}`}>
          {iconMap[service.service_type] || <Calendar size={14} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">{service.vehicle_plate}</span>
            <span className="text-[10px] text-muted-foreground">{service.vehicle_type}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{service.service_type}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-xs font-medium ${config.text}`}>
          {service.days_until <= 0 
            ? `${Math.abs(service.days_until)} วันที่แล้ว` 
            : `${service.days_until} วัน`}
        </span>
        <p className="text-[10px] text-muted-foreground">{service.due_date}</p>
      </div>
    </div>
  )
}

export function MaintenanceScheduleDashboard({ schedule }: { schedule: MaintenanceScheduleData }) {
  const totalScheduled = schedule.overdue.length + schedule.dueSoon.length + schedule.upcoming.length

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={16} className="text-blue-400" />
              <span className="text-xs text-muted-foreground">ซ่อมอยู่</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{schedule.activeRepairs}</p>
            <p className="text-[10px] text-muted-foreground mt-1">รายการ</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-xs text-muted-foreground">เสร็จเดือนนี้</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{schedule.completedThisMonth}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-amber-400" />
              <span className="text-xs text-muted-foreground">ค่าซ่อมเดือนนี้</span>
            </div>
            <p className="text-2xl font-bold text-foreground">฿{schedule.totalCostThisMonth.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-purple-400" />
              <span className="text-xs text-muted-foreground">นัดหมายรออยู่</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalScheduled}</p>
            {schedule.overdue.length > 0 && (
              <p className="text-[10px] text-red-400 mt-1">⚠️ {schedule.overdue.length} เกินกำหนด</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule Timeline */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <Calendar size={16} className="text-primary" />
              กำหนดการซ่อมบำรุง
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overdue */}
            {schedule.overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} className="text-red-400" />
                  <span className="text-xs font-medium text-red-400">เกินกำหนด ({schedule.overdue.length})</span>
                </div>
                <div className="space-y-2">
                  {schedule.overdue.map((s, i) => <ServiceCard key={`o-${i}`} service={s} />)}
                </div>
              </div>
            )}

            {/* Due Soon */}
            {schedule.dueSoon.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={12} className="text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">ภายใน 7 วัน ({schedule.dueSoon.length})</span>
                </div>
                <div className="space-y-2">
                  {schedule.dueSoon.map((s, i) => <ServiceCard key={`d-${i}`} service={s} />)}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {schedule.upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={12} className="text-blue-400" />
                  <span className="text-xs font-medium text-blue-400">ภายใน 30 วัน ({schedule.upcoming.length})</span>
                </div>
                <div className="space-y-2">
                  {schedule.upcoming.map((s, i) => <ServiceCard key={`u-${i}`} service={s} />)}
                </div>
              </div>
            )}

            {totalScheduled === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">ไม่มีกำหนดการในช่วง 30 วันข้างหน้า</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Health */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <Wrench size={16} className="text-amber-400" />
              สุขภาพรถ (Top 10 ซ่อมมากที่สุด)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedule.vehicleHealthSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-3">
                {schedule.vehicleHealthSummary.map((v, i) => (
                  <div key={v.vehicle_plate} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{v.vehicle_plate}</p>
                        {v.lastRepair && (
                          <p className="text-[10px] text-muted-foreground">ซ่อมล่าสุด: {v.lastRepair.slice(0, 10)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {v.openTickets > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
                          {v.openTickets} เปิดอยู่
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground">฿{v.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
