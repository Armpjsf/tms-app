export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BookOpen, FileText, CheckCircle2, LayoutDashboard, Truck, Wallet } from "lucide-react"

export default function ManualPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <BookOpen size={28} />
            </div>
            คู่มือการใช้งานแบบเต็ม (Full User Manual)
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">คู่มือแนะนำการใช้งานระบบ TMS-ePOD อย่างละเอียดสำหรับผู้ดูแลระบบ (Admin) และเจ้าหน้าที่ (Staff)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Dashboard & Monitoring */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <LayoutDashboard size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-900">1. ภาพรวมปฏิบัติการและการติดตาม</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">Dashboard ปฏิบัติการ</p>
                  <p className="text-sm text-gray-500">ดูสถิติงานขนส่งในแต่ละวัน แบบ Real-time รวมถึงสถานะ SOS และรายได้ประมาณการ</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">Control Centre (แผนที่รถ)</p>
                  <p className="text-sm text-gray-500">ติดตามตำแหน่งรถขนส่งที่กำลังวิ่ง แบบพิกัด GPS สดบนแผนที่</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">ศูนย์การแจ้งเตือน & แชท</p>
                  <p className="text-sm text-gray-500">ตรวจสอบการแจ้งเตือนงานและพูดคุยกับพนักงานขับรถได้ทันที พร้อมรับส่งรูปภาพได้ด้วย</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Section 2: Fleet & Jobs */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <FileText size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-900">2. การจัดการงาน (Jobs & POD)</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">วางแผนงาน (เพิ่มงานใหม่)</p>
                  <p className="text-sm text-gray-500">ไปที่ &quot;วางแผนงาน&quot; เลือกสร้างงานทีละรายการ หรือ อิมพอร์ตจาก Excel และจ่ายงานให้คนขับ ซึ่งคนขับจะได้รับแจ้งเตือนผ่าน App</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">ปฏิทินงาน & ประวัติงาน</p>
                  <p className="text-sm text-gray-500">ดูแผนงานรายเดือน หรือดูประวัติการเดินรถย้อนหลัง พร้อมฟังก์ชันค้นหาอย่างละเอียด</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">จัดการ POD</p>
                  <p className="text-sm text-gray-500">ตรวจสอบรูปลายเซ็นและหลักฐานการจัดส่งที่คนขับอัปโหลดมาจากมือถือหลังจาก &quot;ปิดงาน&quot;</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Section 3: Fleet Management */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Truck size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-900">3. บริหารกองยาน (Fleet)</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">สมุดรถ & ทะเบียน (แจ้งเตือนเอกสาร)</p>
                  <p className="text-sm text-gray-500">ระบบจะลิงก์วันหมดอายุของ พรบ., ประกันภัย, ทะเบียน และป้ายวงกลม เพื่อแจ้งเตือนอัตโนมัติก่อนหมดอายุ</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">แจ้งตรวจสภาพ & แจ้งซ่อม</p>
                  <p className="text-sm text-gray-500">คนขับจะกรอกฟอร์มตรวจสภาพรายวัน หากพบปัญหาจะเด้งเข้า &quot;แจ้งซ่อม&quot; ให้แอดมินพิจารณาอนุมัติ</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">บันทึกค่าน้ำมัน</p>
                  <p className="text-sm text-gray-500">คนขับเมื่อไปเติมน้ำมัน สามารถถ่ายรูปใบเสร็จเพื่อส่งเข้าสู่ระบบให้แอดมินยืนยันรายจ่ายค่าเชื้อเพลิงได้</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Section 4: Finance & Settings */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Wallet size={24} />
              </div>
              <h2 className="text-xl font-black text-gray-900">4. การเงิน & ตั้งค่าระบบ</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">สรุปวางบิลและจ่ายรถ</p>
                  <p className="text-sm text-gray-500">รวมบิลค่าขนส่งของลูกค้ารายเดือน และสรุปยอดค่าจ้างคนขับร่วม (Sub-contractor)</p>
                </div>
              </li>
              <li className="flex gap-3 text-gray-700">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">จัดการลูกค้าและสายวิ่ง</p>
                  <p className="text-sm text-gray-500">เมนูตั้งค่า เอาไว้สำหรับสร้างฐานข้อมูลลูกค้า, ค่าตอบแทนเริ่มต้น, และเส้นทางวิ่งประจำ</p>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
