"use client"

import { useState } from "react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { createLeaveRequest, getMyLeaves, DriverLeave } from "@/lib/supabase/driver-leaves"
import { CalendarDays, CheckCircle2, XCircle, Clock, Send } from "lucide-react"

const LEAVE_TYPES = [
  { value: 'ลาป่วย', label: '🤒 ลาป่วย', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'ลากิจ', label: '📋 ลากิจ', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'ลาพักร้อน', label: '🏖️ ลาพักร้อน', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
]

interface Props {
  driverId: string
  driverName: string
  initialLeaves: DriverLeave[]
}

export function MobileLeaveClient({ driverId, driverName, initialLeaves }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [leaveType, setLeaveType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [leaves, setLeaves] = useState(initialLeaves)

  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate) return
    setSubmitting(true)
    const result = await createLeaveRequest({
      Driver_ID: driverId,
      Driver_Name: driverName,
      Leave_Type: leaveType,
      Start_Date: startDate,
      End_Date: endDate,
      Reason: reason,
    })
    setSubmitting(false)
    if (result.success) {
      setSuccess(true)
      setShowForm(false)
      setLeaveType('')
      setStartDate('')
      setEndDate('')
      setReason('')
      // Refresh leaves
      const updated = await getMyLeaves(driverId)
      setLeaves(updated)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-16 px-4">
      <MobileHeader title="แจ้งลา" showBack />

      <div className="space-y-5 mt-2">

        {/* Success Toast */}
        {success && (
          <div className="bg-emerald-100 border-2 border-emerald-300 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 size={28} className="text-emerald-600" />
            <p className="text-lg font-black text-emerald-700">ส่งใบลาสำเร็จ!</p>
          </div>
        )}

        {/* Create Button or Form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl p-5 text-center shadow-lg shadow-cyan-500/20"
          >
            <CalendarDays size={32} className="mx-auto mb-2" />
            <p className="text-xl font-black">แจ้งลา</p>
            <p className="text-xl opacity-80 mt-1">กดเพื่อสร้างใบลาใหม่</p>
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 text-center">📝 สร้างใบลา</h3>

            {/* Leave Type — BIG BUTTONS */}
            <div>
              <p className="text-base font-black text-gray-700 mb-2">ประเภทการลา</p>
              <div className="grid grid-cols-1 gap-3">
                {LEAVE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setLeaveType(t.value)}
                    className={`p-4 rounded-xl border-2 text-left text-xl font-black transition-all
                      ${leaveType === t.value ? `${t.color} ring-2 ring-offset-1 scale-[0.98]` : 'bg-gray-100 text-gray-700 border-gray-300'}
                    `}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates — LARGE */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <p className="text-xl font-black text-gray-700 mb-1">วันที่เริ่ม</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl text-lg font-black text-gray-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-xl font-black text-gray-700 mb-1">ถึงวันที่</p>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl text-lg font-black text-gray-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="mt-4">
              <p className="text-base font-black text-gray-700 mb-1">เหตุผล (ไม่บังคับ)</p>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="ระบุเหตุผล..."
                rows={2}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-lg font-medium text-gray-900 resize-none focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Actions — BIG BUTTONS */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 p-4 rounded-xl text-gray-700 bg-gray-200 font-black text-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={!leaveType || !startDate || !endDate || submitting}
                className="flex-1 p-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                <Send size={20} />
                {submitting ? 'กำลังส่ง...' : 'ส่งใบลา'}
              </button>
            </div>
          </div>
        )}

        {/* My Leaves History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-100">
            <p className="font-black text-gray-900 text-base">📋 ประวัติใบลาของฉัน</p>
          </div>
          {leaves.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-black">ยังไม่มีใบลา</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaves.map(leave => {
                const startD = new Date(leave.Start_Date + 'T00:00:00')
                const endD = new Date(leave.End_Date + 'T00:00:00')
                const days = Math.ceil((endD.getTime() - startD.getTime()) / 86400000) + 1

                return (
                  <div key={leave.id} className="px-5 py-5 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {leave.Status === 'Approved' && <CheckCircle2 size={28} className="text-emerald-500" />}
                      {leave.Status === 'Rejected' && <XCircle size={28} className="text-red-500" />}
                      {leave.Status === 'Pending' && <Clock size={28} className="text-amber-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-900 text-lg">{leave.Leave_Type}</p>
                      <p className="text-xl font-bold text-gray-600">
                        {startD.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        {days > 1 ? ` — ${endD.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}` : ''}
                        {' '}({days} วัน)
                      </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xl font-black
                      ${leave.Status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : ''}
                      ${leave.Status === 'Rejected' ? 'bg-red-100 text-red-800' : ''}
                      ${leave.Status === 'Pending' ? 'bg-amber-100 text-amber-800' : ''}
                    `}>
                      {leave.Status === 'Approved' ? 'อนุมัติ' : leave.Status === 'Rejected' ? 'ไม่อนุมัติ' : 'รอ'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

