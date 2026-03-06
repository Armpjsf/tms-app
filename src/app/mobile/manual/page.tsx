import { MobileHeader } from "@/components/mobile/mobile-header"
import { BookOpen, Pickaxe, MapPin, SearchCheck } from "lucide-react"

export default function MobileManualPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <MobileHeader title="คู่มือการใช้งาน" />

      <div className="px-4 py-6 space-y-6">
        
        {/* Intro */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
             <BookOpen size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-1">ยินดีต้อนรับ</h2>
          <p className="text-sm text-gray-600 font-medium">นี่คือคู่มือฉบับย่อสำหรับการใช้งานแอปพลิเคชันสำหรับคนขับรถ</p>
        </div>

        {/* Section: How to pick up jobs */}
        <div className="space-y-4">
          <p className="text-lg font-black text-gray-900 px-1">🚘 ขั้นตอนการทำงาน</p>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 items-start">
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl">
              <Pickaxe size={24} />
            </div>
            <div>
              <p className="text-base font-black text-gray-900">1. ดูงานวันนี้</p>
              <p className="text-sm text-gray-600 mt-1">กดเมนู <span className="font-bold text-gray-900">&quot;งานปัจจุบัน&quot;</span> หรือ <span className="font-bold text-gray-900">&quot;กระดานงาน&quot;</span> เพื่อดูรายละเอียดจุดรับ-ส่งสินค้า</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 items-start">
            <div className="bg-amber-100 text-amber-600 p-3 rounded-xl">
              <SearchCheck size={24} />
            </div>
            <div>
              <p className="text-base font-black text-gray-900">2. เช็ครถก่อนวิ่ง</p>
              <p className="text-sm text-gray-600 mt-1">ไปที่ตั้งค่า แล้วกดเมนู <span className="font-bold text-gray-900">&quot;เช็คสภาพรถ&quot;</span> เพื่อถ่ายรูปรถและยางเพื่อความปลอดภัย</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 items-start">
            <div className="bg-rose-100 text-rose-600 p-3 rounded-xl">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-base font-black text-gray-900">3. ปิดงานและถ่ายรูป</p>
              <p className="text-sm text-gray-600 mt-1">เมื่อส่งของเสร็จ กดเข้าไปในงาน แจ้งปิดงานและ <span className="font-bold text-gray-900">ถ่ายรูปบิลล์/ลายเซ็น</span> ของลูกค้า</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
