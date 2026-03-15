export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getAdminAlerts, AdminAlert } from "@/lib/supabase/admin-notifications"
import { Bell, AlertTriangle, ShieldAlert, Wrench, FileWarning, Truck, ArrowLeft } from "lucide-react"
import Link from "next/link"

const SEVERITY_STYLES = {
  critical: {
    bg: "bg-red-50 border-red-200",
    icon: "bg-red-500 text-white",
    badge: "bg-red-100 text-red-700",
    label: "วิกฤต"
  },
  warning: {
    bg: "bg-amber-50 border-amber-200",
    icon: "bg-amber-500 text-white",
    badge: "bg-amber-100 text-amber-700",
    label: "เตือน"
  },
  info: {
    bg: "bg-blue-50 border-blue-200",
    icon: "bg-blue-500 text-white",
    badge: "bg-blue-100 text-blue-700",
    label: "แจ้งเตือน"
  },
}

const TYPE_ICONS = {
  expiry: FileWarning,
  inspection_fail: ShieldAlert,
  maintenance: Wrench,
}

const TYPE_LABELS = {
  expiry: "เอกสารหมดอายุ",
  inspection_fail: "ตรวจรถไม่ผ่าน",
  maintenance: "แจ้งซ่อมค้าง",
}

export default async function AdminNotificationsPage() {
  const alerts = await getAdminAlerts()

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length
  const infoCount = alerts.filter(a => a.severity === 'info').length

  // Group by type
  const grouped: Record<string, AdminAlert[]> = {}
  alerts.forEach(a => {
    if (!grouped[a.type]) grouped[a.type] = []
    grouped[a.type].push(a)
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Strategic Header Container */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-10 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em]">
                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ (Back to Control)
            </Link>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-2xl shadow-amber-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                <Bell size={32} />
              </div>
              ศูนย์การแจ้งเตือน
            </h1>
            <p className="text-amber-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Strategic Alerts • Asset Compliance • Operational Safety</p>
          </div>

          <div className="flex gap-3 relative z-10">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{criticalCount} Critical</span>
              </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-red-500 rounded-xl text-white">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-3xl font-black text-red-700">{criticalCount}</p>
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest">วิกฤต</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500 rounded-xl text-white">
              <Bell size={24} />
            </div>
            <div>
              <p className="text-3xl font-black text-amber-700">{warningCount}</p>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">เตือน</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl text-white">
              <Bell size={24} />
            </div>
            <div>
              <p className="text-3xl font-black text-blue-700">{infoCount}</p>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">แจ้งเตือน</p>
            </div>
          </div>
        </div>

        {/* Alerts grouped by type */}
        {alerts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-400">
            <Bell size={48} strokeWidth={1.5} className="mx-auto mb-4" />
            <p className="font-bold text-lg">ไม่มีการแจ้งเตือน</p>
            <p className="text-sm mt-1">ทุกอย่างปกติ ✅</p>
          </div>
        ) : (
          Object.entries(grouped).map(([type, typeAlerts]) => {
            const TypeIcon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || Bell
            return (
              <div key={type} className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <TypeIcon size={20} className="text-gray-600" />
                  <h2 className="font-black text-gray-900">{TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type}</h2>
                  <span className="ml-auto text-sm font-bold text-gray-400">{typeAlerts.length} รายการ</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {typeAlerts.map(alert => {
                    const style = SEVERITY_STYLES[alert.severity]
                    return (
                      <div key={alert.id} className={`px-6 py-4 flex items-start gap-4 ${alert.severity === 'critical' ? 'bg-red-50/30' : ''}`}>
                        <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${
                          alert.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                          alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-gray-900 text-sm">{alert.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${style.badge}`}>
                              {style.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{alert.description}</p>
                          {alert.meta?.plate && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                              <Truck size={12} />
                              <span className="font-bold">{alert.meta.plate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </DashboardLayout>
  )
}
