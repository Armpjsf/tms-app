"use client"

import { useState } from "react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { createDamageReport, getMyDamageReports, DamageReport } from "@/lib/supabase/damage-reports"
import { AlertOctagon, CheckCircle2, Send, Upload, FileText } from "lucide-react"

const CATEGORIES = [
  { value: 'อุบัติเหตุ', label: '💥 อุบัติเหตุ', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'สินค้าชำรุด', label: '📦 สินค้าชำรุด', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'สินค้าสูญหาย', label: '❓ สินค้าสูญหาย', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'อื่นๆ', label: '📝 อื่นๆ', color: 'bg-gray-100 text-gray-700 border-gray-300' },
]

interface RecentJob {
  Job_ID: string
  Plan_Date: string | null
  Customer_Name: string | null
  Vehicle_Plate: string | null
}

interface Props {
  driverId: string
  driverName: string
  initialReports: DamageReport[]
  recentJobs: RecentJob[]
}

export function MobileDamageClient({ driverId, driverName, initialReports, recentJobs }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [jobId, setJobId] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [category, setCategory] = useState('')
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0])
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [reports, setReports] = useState(initialReports)

  const handleJobSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const jId = e.target.value
    setJobId(jId)
    const job = recentJobs.find(j => j.Job_ID === jId)
    if (job?.Vehicle_Plate) {
      setVehiclePlate(job.Vehicle_Plate)
    }
  }

  const handleSubmit = async () => {
    if (!jobId || !category || !incidentDate) return
    setSubmitting(true)
    const result = await createDamageReport({
      Job_ID: jobId,
      Driver_ID: driverId,
      Driver_Name: driverName,
      Vehicle_Plate: vehiclePlate,
      Incident_Date: incidentDate,
      Reason_Category: category,
      Description: desc,
      // Image_Path would ideally be implemented with Supabase Storage here, skipping for UI demonstration
    })
    
    setSubmitting(false)
    if (result.success) {
      setSuccess(true)
      setShowForm(false)
      setJobId('')
      setCategory('')
      setDesc('')
      
      const updated = await getMyDamageReports(driverId)
      setReports(updated)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-16 px-4">
      <MobileHeader title="แจ้งปัญหา/เคลม" showBack />

      <div className="space-y-5 mt-2">

        {/* Success Toast */}
        {success && (
          <div className="bg-emerald-100 border-2 border-emerald-300 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 size={28} className="text-emerald-600" />
            <p className="text-lg font-black text-emerald-700">ส่งรายงานสำเร็จ!</p>
          </div>
        )}

        {/* Create Button */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-2xl p-5 text-center shadow-lg shadow-rose-500/20"
          >
            <AlertOctagon size={32} className="mx-auto mb-2" />
            <p className="text-xl font-black">ส่งรายงานปัญหา</p>
            <p className="text-xl opacity-80 mt-1">อุบัติเหตุ, สินค้าชำรุด หรือสูญหาย</p>
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 text-center">🚨 แจ้งปัญหาใหม่</h3>

            {/* Select Job */}
            <div>
              <p className="text-base font-black text-gray-700 mb-1">เลือกงานที่เกิดปัญหา</p>
              <select
                value={jobId}
                onChange={handleJobSelect}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-base font-black text-gray-900 focus:border-rose-500 focus:outline-none bg-white"
              >
                <option value="">-- เลือกงาน --</option>
                {recentJobs.map(j => (
                  <option key={j.Job_ID} value={j.Job_ID}>
                    {j.Job_ID} ({j.Customer_Name})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <p className="text-base font-black text-gray-700 mb-1">วันที่เกิดเหตุ</p>
              <input
                type="date"
                value={incidentDate}
                onChange={e => setIncidentDate(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-base font-black text-gray-900 focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <p className="text-base font-black text-gray-700 mb-2">ประเภทปัญหา</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setCategory(t.value)}
                    className={`p-3 rounded-xl border-2 text-center font-black transition-all text-base
                      ${category === t.value ? `${t.color} ring-2 ring-offset-1 scale-[0.98]` : 'bg-gray-100 text-gray-700 border-gray-300'}
                    `}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Upload Placeholder */}
            <div>
              <p className="text-base font-black text-gray-700 mb-1">ถ่ายรูปปัญหา (หลักฐาน)</p>
              <div className="w-full h-24 border-2 border-dashed border-gray-400 rounded-xl flex flex-col items-center justify-center text-gray-600 bg-gray-50">
                <Upload size={28} className="mb-2" />
                <p className="text-xl font-black">แตะเพื่อถ่ายรูป</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-base font-black text-gray-700 mb-1">รายละเอียด</p>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="อธิบายเหตุการณ์ หรือระบุป้ายทะเบียนที่ถูกชน..."
                rows={3}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-base font-medium text-gray-900 resize-none focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 p-4 rounded-xl text-gray-700 bg-gray-200 font-black text-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={!jobId || !category || !incidentDate || submitting}
                className="flex-1 p-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                <Send size={20} />
                {submitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-100">
            <p className="font-black text-gray-900 text-base">📋 ประวัติการแจ้งปัญหาของฉัน</p>
          </div>
          {reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-black">ยังไม่เคยมีรายงาน</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reports.map(report => {
                const isResolved = report.Status === 'Resolved'
                const isRejected = report.Status === 'Rejected'
                return (
                  <div key={report.id} className="px-5 py-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-base">{report.Reason_Category}</span>
                        <span className={`px-2 py-1 rounded-full text-lg font-bold font-black
                          ${isResolved ? 'bg-emerald-100 text-emerald-800' : ''}
                          ${isRejected ? 'bg-red-100 text-red-800' : ''}
                          ${(!isResolved && !isRejected) ? 'bg-amber-100 text-amber-800' : ''}
                        `}>
                          {isResolved ? 'ปิดแล้ว' : isRejected ? 'ยกเลิก' : 'รอตรวจสอบ'}
                        </span>
                      </div>
                      <span className="text-xl font-bold text-gray-500">
                        {new Date(report.Created_At).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    
                    <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-xl">
                       <FileText size={16} className="text-gray-500" /> 
                       <span className="font-mono font-bold text-gray-800 truncate">{report.Job_ID}</span>
                    </div>

                    <p className="text-base font-medium text-gray-800">{report.Description}</p>
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

