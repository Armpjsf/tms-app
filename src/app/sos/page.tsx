import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <AlertTriangle className="text-red-400" />
            แจ้งเหตุฉุกเฉิน (SOS)
          </h1>
          <p className="text-slate-400">ติดตามและจัดการเหตุฉุกเฉินทั้งหมด</p>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-medium">{activeCount} เหตุการณ์ที่ยังไม่แก้ไข</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20">
          <p className="text-2xl font-bold text-red-400">{activeCount}</p>
          <p className="text-xs text-slate-400">SOS Active</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{alerts.filter(a => a.Job_Status === 'Failed').length}</p>
          <p className="text-xs text-slate-400">งานล้มเหลว</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{alerts.length}</p>
          <p className="text-xs text-slate-400">เคสทั้งหมด</p>
        </div>
      </div>

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
            className={alert.Job_Status === 'SOS' ? 'border-red-500/50' : ''}
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
                <Button variant="outline" size="sm" className="flex-1 gap-1">
                  <Phone size={14} />
                  โทร
                </Button>
                <Button size="sm" className="flex-1 gap-1">
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
