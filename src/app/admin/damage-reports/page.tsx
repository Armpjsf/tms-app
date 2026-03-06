export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getDamageReports } from "@/lib/supabase/damage-reports"
import { AlertOctagon, ArrowLeft, User, CheckCircle2, XCircle, Clock, Truck, FileText, Search, ShieldAlert } from "lucide-react"
import Link from "next/link"

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'รอตรวจสอบ' },
  Reviewing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'กำลังตรวจสอบ' },
  Resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'ปิดเรื่องแล้ว' },
  Rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'ปฏิเสธ/ยกเลิก' },
}

const CATEGORY_STYLES: Record<string, string> = {
  'อุบัติเหตุ': 'bg-red-50 text-red-600 border-red-200',
  'สินค้าชำรุด': 'bg-orange-50 text-orange-600 border-orange-200',
  'สินค้าสูญหาย': 'bg-purple-50 text-purple-600 border-purple-200',
  'อื่นๆ': 'bg-gray-50 text-gray-600 border-gray-200',
}

export default async function DamageReportsPage() {
  const reports = await getDamageReports()

  const pendingCount = reports.filter(r => r.Status === 'Pending').length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link href="/reports" className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors mb-3 text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/20">
              <AlertOctagon size={28} />
            </div>
            รายงานสินค้าเสียหาย / เคลม
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">จัดการข้อร้องเรียนเกี่ยวกับสินค้าเสียหายหรืออุบัติเหตุจากคนขับ</p>
        </div>

        {/* Summary */}
        {pendingCount > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
            <ShieldAlert size={20} className="text-rose-600 animate-pulse" />
            <p className="text-sm font-bold text-rose-700">มี {pendingCount} รายการรอการตรวจสอบด่วน!</p>
          </div>
        )}

        {/* Report List */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-white flex justify-between items-center">
            <h2 className="font-black text-gray-900">รายการแจ้งปัญหา/เคลมทั้งหมด</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="ค้นหา Job ID..." 
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                autoComplete="off"
              />
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <AlertOctagon size={48} strokeWidth={1.5} className="mx-auto mb-4" />
              <p className="font-bold text-lg">ไม่มีรายการแจ้งปัญหา</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reports.map(report => {
                const statusStyle = STATUS_STYLES[report.Status] || STATUS_STYLES.Pending
                const categoryStyle = CATEGORY_STYLES[report.Reason_Category] || 'bg-gray-50 text-gray-600 border-gray-200'
                const date = new Date(report.Created_At)

                return (
                  <div key={report.id} className="px-6 py-4 flex flex-col sm:flex-row gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {report.Status === 'Resolved' && <CheckCircle2 size={24} className="text-emerald-500" />}
                      {report.Status === 'Rejected' && <XCircle size={24} className="text-red-500" />}
                      {report.Status === 'Reviewing' && <Search size={24} className="text-blue-500" />}
                      {report.Status === 'Pending' && <Clock size={24} className="text-amber-500" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Link href={`/admin/jobs/${report.Job_ID}`} className="font-black text-rose-600 hover:underline text-sm flex items-center gap-1">
                          <FileText size={14} /> {report.Job_ID}
                        </Link>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${categoryStyle}`}>
                          {report.Reason_Category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {date.toLocaleString('th-TH')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-gray-400" /> {report.Driver_Name || report.Driver_ID}
                        </span>
                        {report.Vehicle_Plate && (
                          <span className="flex items-center gap-1">
                            <Truck size={12} className="text-gray-400" /> {report.Vehicle_Plate}
                          </span>
                        )}
                        <span className="text-gray-400">• วันเกิดเหตุ: {new Date(report.Incident_Date).toLocaleDateString('th-TH')}</span>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-sm text-gray-700">{report.Description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                      </div>

                      {/* Add action buttons here in the future: Review, Resolve, Reject */}
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
