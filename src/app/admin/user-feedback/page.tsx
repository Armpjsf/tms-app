export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MessageSquare } from "lucide-react"

export default function UserFeedbackPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-purple-500 rounded-2xl text-white shadow-lg shadow-purple-500/20">
              <MessageSquare size={28} />
            </div>
            ข้อเสนอแนะคนขับ (User Feedback)
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">รวบรวมคำแนะนำและปัญหาการใช้งานแอปจากคนขับ</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-black text-gray-900">ยังไม่มีข้อเสนอแนะใหม่</h2>
          <p className="text-gray-500 mt-2">ประวัติข้อเสนอแนะจากคนขับจะแสดงที่นี่</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
