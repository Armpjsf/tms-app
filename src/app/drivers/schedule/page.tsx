export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getDriverLeaves } from "@/lib/supabase/driver-leaves"
import { CalendarDays, ArrowLeft, User, CheckCircle2, XCircle, Clock } from "lucide-react"
import Link from "next/link"

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'รออนุมัติ' },
  Approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'อนุมัติแล้ว' },
  Rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'ไม่อนุมัติ' },
}

const LEAVE_TYPE_STYLES: Record<string, string> = {
  'ลาป่วย': 'bg-red-50 text-red-600 border-red-200',
  'ลากิจ': 'bg-blue-50 text-blue-600 border-blue-200',
  'ลาพักร้อน': 'bg-emerald-50 text-emerald-600 border-emerald-200',
}

export default async function DriverSchedulePage() {
  const leaves = await getDriverLeaves()

  const pendingCount = leaves.filter(l => l.Status === 'Pending').length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link href="/drivers" className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors mb-3 text-xl font-bold">
            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500 rounded-2xl text-white shadow-lg shadow-cyan-500/20">
              <CalendarDays size={28} />
            </div>
            ตารางเวร / ใบลาคนขับ
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-xl">จัดการใบลาคนขับ — อนุมัติ / ปฏิเสธ</p>
        </div>

        {/* Summary */}
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <Clock size={20} className="text-amber-600" />
            <p className="text-xl font-bold text-amber-700">มี {pendingCount} ใบลารออนุมัติ</p>
          </div>
        )}

        {/* Leave List */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-white">
            <h2 className="font-black text-gray-900">รายการใบลาทั้งหมด</h2>
          </div>

          {leaves.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <CalendarDays size={48} strokeWidth={1.5} className="mx-auto mb-4" />
              <p className="font-bold text-lg">ไม่มีใบลาในเดือนนี้</p>
              <p className="text-xl mt-1">คนขับสามารถแจ้งลาจากแอปมือถือได้</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leaves.map(leave => {
                const statusStyle = STATUS_STYLES[leave.Status] || STATUS_STYLES.Pending
                const leaveStyle = LEAVE_TYPE_STYLES[leave.Leave_Type] || 'bg-gray-50 text-gray-600 border-gray-200'
                const startDate = new Date(leave.Start_Date + 'T00:00:00')
                const endDate = new Date(leave.End_Date + 'T00:00:00')
                const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1

                return (
                  <div key={leave.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {leave.Status === 'Approved' && <CheckCircle2 size={24} className="text-emerald-500" />}
                      {leave.Status === 'Rejected' && <XCircle size={24} className="text-red-500" />}
                      {leave.Status === 'Pending' && <Clock size={24} className="text-amber-500 animate-pulse" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="flex items-center gap-1.5 font-bold text-gray-900">
                          <User size={14} /> {leave.Driver_Name || leave.Driver_ID}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-base font-bold font-black border ${leaveStyle}`}>
                          {leave.Leave_Type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-base font-bold font-black ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-500">
                        📅 {startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        {days > 1 ? ` — ${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}` : ''}
                        {' '}({days} วัน)
                      </p>
                      {leave.Reason && (
                        <p className="text-lg font-bold text-gray-400 mt-0.5">💬 {leave.Reason}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

