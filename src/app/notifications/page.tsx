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
        {/* Header */}
        <div>
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors mb-3 text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-500/20">
              <Bell size={28} />
            </div>
            ศูนย์การแจ้งเตือน
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">แจ้งเตือนเอกสารหมดอายุ, ตรวจรถไม่ผ่าน, แจ้งซ่อมค้าง</p>
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
