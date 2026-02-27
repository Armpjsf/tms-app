export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { StatsGrid } from "@/components/ui/stats-grid"
import { 
  AlertTriangle, 
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  User,
  Truck,
} from "lucide-react"
import { getAllSOSAlerts, getSOSCount } from "@/lib/supabase/sos"

export default async function SOSPage() {
  const [alerts, activeCount] = await Promise.all([
    getAllSOSAlerts(),
    getSOSCount(),
  ])

  return (
    <DashboardLayout>
      <PageHeader
        icon={<AlertTriangle size={28} />}
        title="แจ้งเหตุฉุกเฉิน (SOS)"
        subtitle="ติดตามและจัดการเหตุฉุกเฉินทั้งหมด"
        badge={activeCount > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-medium text-sm">{activeCount} เหตุการณ์ที่ยังไม่แก้ไข</span>
          </div>
        ) : undefined}
      />

      <StatsGrid columns={3} stats={[
        { label: "SOS Active", value: activeCount, icon: <AlertTriangle size={20} />, color: "red" },
        { label: "งานล้มเหลว", value: alerts.filter(a => a.Job_Status === 'Failed').length, icon: <AlertTriangle size={20} />, color: "amber" },
        { label: "เคสทั้งหมด", value: alerts.length, icon: <CheckCircle2 size={20} />, color: "emerald" },
      ]} />

      {/* SOS Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <CheckCircle2 size={64} className="mx-auto mb-4 text-emerald-500 opacity-50" />
            <p className="text-emerald-400 text-lg">ไม่มีเหตุฉุกเฉินในขณะนี้</p>
            <p className="text-slate-500 text-sm">ระบบทำงานปกติ</p>
          </div>
        ) : alerts.map((alert) => (
          <Card 
            key={alert.Job_ID} 
            variant="glass" 
            hover={true}
            className={`rounded-2xl ${alert.Job_Status === 'SOS' ? 'border-red-500/50' : ''}`}
          >
            <CardContent className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    alert.Job_Status === 'SOS' 
                      ? 'bg-red-500/20 animate-pulse' 
                      : 'bg-amber-500/20'
                  }`}>
                    <AlertTriangle className={alert.Job_Status === 'SOS' ? 'text-red-400' : 'text-amber-400'} size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">#{alert.Job_ID}</p>
                    <h3 className="font-bold text-white">
                      {alert.Job_Status === 'SOS' ? 'SOS Active' : 'งานล้มเหลว'}
                    </h3>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  alert.Job_Status === 'SOS' 
                    ? 'text-red-400 bg-red-500/20' 
                    : 'text-amber-400 bg-amber-500/20'
                }`}>
                  {alert.Job_Status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <User size={14} />
                  <span>{alert.Driver_Name || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Truck size={14} />
                  <span>{alert.Vehicle_Plate || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin size={14} />
                  <span>{alert.Route_Name || "-"}</span>
                </div>
                {alert.Failed_Reason && (
                  <div className="flex items-start gap-2 text-red-400 bg-red-500/10 p-2 rounded-lg">
                    <AlertTriangle size={14} className="mt-0.5" />
                    <span className="text-xs">{alert.Failed_Reason}</span>
                  </div>
                )}
                {alert.Failed_Time && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={14} />
                    <span className="text-xs">{new Date(alert.Failed_Time).toLocaleString('th-TH')}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1 rounded-xl border-slate-800">
                  <Phone size={14} />
                  โทร
                </Button>
                <Button size="sm" className="flex-1 gap-1 rounded-xl">
                  <MapPin size={14} />
                  ดูตำแหน่ง
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
