export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Truck } from "lucide-react"

export default function FleetStatusPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <Truck size={28} />
            </div>
            สถานะรถและคนขับ (Fleet Status)
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">ภาพรวมการใช้งานรถและสถานะประจำวัน</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <Truck size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-black text-gray-900">กำลังพัฒนาระบบนี้</h2>
          <p className="text-gray-500 mt-2">หน้ารายงานแยกรายละเอียดรถและคนขับกำลังอยู่ในช่วงปรับปรุงข้อมูล</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
