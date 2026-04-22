import { MobileHeader } from "@/components/mobile/mobile-header"
import { 
  BookOpen, 
  Bell, 
  CheckSquare, 
  MapPin, 
  Camera, 
  Signature, 
  Truck,
  ArrowRight,
  ShieldCheck,
  SearchCheck,
  Package
} from "lucide-react"

export default function MobileManualPage() {
  const steps = [
    {
      title: "1. รับมอบหมายงาน",
      description: "เมื่อแอดมินจ่ายงาน คุณจะได้รับแจ้งเตือน (Notification) ทันที ให้ไปที่หน้า 'หน้าแรก' เพื่อดูงานที่ได้รับมอบหมาย",
      icon: <Bell size={24} />,
      color: "bg-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "2. ตรวจสอบข้อมูลและกดรับงาน",
      description: "กดเข้าไปในงานเพื่อดูรายละเอียดจุดรับ-ส่งสินค้า แล้วกดปุ่มสีเขียว 'กดรับงาน' เพื่อยืนยันการปฏิบัติหน้าที่",
      icon: <CheckSquare size={24} />,
      color: "bg-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      title: "3. เช็คสภาพรถ (Vehicle Check)",
      description: "ไปที่เมนู 'โปรไฟล์' หรือ 'ตั้งค่า' แล้วเลือก 'เช็คสภาพรถ' ถ่ายรูปตัวรถและยางก่อนออกเดินทางทุกครั้ง",
      icon: <SearchCheck size={24} />,
      color: "bg-amber-500",
      bg: "bg-amber-50"
    },
    {
      title: "4. เดินทางไปจุดรับสินค้า",
      description: "เมื่อถึงจุดรับของ ให้กดปุ่ม 'ถึงจุดรับของ' ระบบจะบันทึกพิกัดและเวลาเข้าของคุณโดยอัตโนมัติ",
      icon: <MapPin size={24} />,
      color: "bg-teal-500",
      bg: "bg-teal-50"
    },
    {
      title: "5. ถ่ายรูปรับของ / ออกเดินทาง",
      description: "กดปุ่ม 'ถ่ายรูปรับสินค้า' ถ่ายรูปสินค้าขณะขึ้นรถ และกดบันทึกเพื่อเปลี่ยนสถานะเป็น 'อยู่ระหว่างขนส่ง'",
      icon: <Camera size={24} />,
      color: "bg-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "6. นำส่งสินค้า",
      description: "คุณสามารถกดปุ่ม 'นำทาง' (ไอคอนลูกศร) เพื่อเปิด Google Maps นำทางไปยังจุดส่งของได้ทันที",
      icon: <Truck size={24} />,
      color: "bg-indigo-500",
      bg: "bg-indigo-50"
    },
    {
      title: "7. ถึงจุดส่งของ / ปิดงาน (POD)",
      description: "เมื่อถึงจุดส่ง ให้กด 'ถึงจุดส่งของ' และกด 'บันทึกส่งงาน' เพื่อถ่ายรูปบิลล์และลายเซ็นลูกค้า",
      icon: <Signature size={24} />,
      color: "bg-rose-500",
      bg: "bg-rose-50"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="fixed top-0 left-0 right-0 z-50">
        <MobileHeader title="คู่มือการใช้งาน" showBack />
      </div>

      <div className="pt-24 px-6 space-y-8">
        
        {/* Intro Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <BookOpen size={120} />
          </div>
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
             <BookOpen size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3 italic uppercase tracking-tighter">คู่มือคนขับ Elite</h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed">
            ขั้นตอนการทำงานอย่างละเอียด<br/>
            ตั้งแต่เริ่มรับงาน จนถึงส่งมอบสินค้า
          </p>
        </div>

        {/* Workflow Section */}
        <div className="space-y-6 relative">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-8 bg-primary rounded-full" />
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">ขั้นตอนการทำงาน (Workflow)</h3>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="relative group">
                {/* Connecting Line */}
                {idx !== steps.length - 1 && (
                  <div className="absolute left-[39px] top-[80px] bottom-[-20px] w-0.5 bg-slate-200" />
                )}
                
                <div className="bg-white rounded-[1.8rem] p-6 shadow-lg shadow-slate-200/40 border border-slate-100 flex gap-6 items-start relative z-10 active:scale-[0.98] transition-all">
                  <div className={`${step.color} text-white p-4 rounded-2xl shadow-lg shrink-0 flex items-center justify-center`}>
                    {step.icon}
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-lg font-black text-slate-900 leading-none">{step.title}</h4>
                    <p className="text-base text-slate-500 font-bold leading-snug break-words">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 opacity-10">
             <ShieldCheck size={180} />
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <ShieldCheck className="text-amber-400" size={28} />
            <h3 className="text-2xl font-black italic uppercase tracking-tight">ข้อแนะนำเพิ่มเติม</h3>
          </div>
          
          <div className="space-y-4 relative z-10">
            <div className="flex gap-4 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 shrink-0" />
              <p className="text-slate-300 font-bold leading-relaxed">
                <span className="text-white">เปิด GPS ตลอดเวลา:</span> เพื่อให้ระบบสามารถบันทึกเวลาและพิกัดการทำงานของคุณได้อย่างแม่นยำ
              </p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 shrink-0" />
              <p className="text-slate-300 font-bold leading-relaxed">
                <span className="text-white">ถ่ายรูปให้ชัดเจน:</span> รูปภาพหลักฐาน (POD) เป็นสิ่งสำคัญมากสำหรับการยืนยันการจ่ายเงิน
              </p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 shrink-0" />
              <p className="text-slate-300 font-bold leading-relaxed">
                <span className="text-white">แจ้งปัญหาทันที:</span> หากมีอุปสรรคหรือสินค้าเสียหาย ให้แจ้งแอดมินผ่านทางแชทหรือแจ้งลบงานทันที
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

