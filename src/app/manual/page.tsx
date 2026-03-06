export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BookOpen, HelpCircle, FileText, CheckCircle2 } from "lucide-react"

export default function ManualPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <BookOpen size={28} />
            </div>
            คู่มือการใช้งาน (User Manual)
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">คู่มือการใช้งานระบบ TMS-ePOD สำหรับผู้ดูแลระบบ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Fleet & Jobs */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <FileText size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-900">การจัดการงานขนส่ง</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">เพิ่มงานใหม่</p>
                  <p className="text-sm text-gray-500">ไปที่เมนู &quot;แผนงาน/จ่ายรถ&quot; เลือกวันที่และจุดหมาย แล้วกำหนดพนักงานขับรถ</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">ติดตามสถานะ</p>
                  <p className="text-sm text-gray-500">ติดตามงานผ่านเมนู &quot;แผนที่รถขนส่ง&quot; เพื่อดูตำแหน่งรถล่าสุดจาก GPS</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Section 2: Fleet Management */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <HelpCircle size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-900">จัดการยานพาหนะ</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">แจ้งเตือนเอกสารหมดอายุ</p>
                  <p className="text-sm text-gray-500">ระบบจะแจ้งเตือน ป้ายวงกลม ทะเบียน และประกัน ที่ศูนย์แจ้งเตือน</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">การเบิกค่าน้ำมัน</p>
                  <p className="text-sm text-gray-500">ตรวจสอบและอนุมัติใบเสร็จรับเงินที่ถ่ายผ่านแอปใน &quot;บันทึกค่าน้ำมัน&quot;</p>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
