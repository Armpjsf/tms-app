
'use client'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { 
    BookOpen, LayoutDashboard, Truck, Users, 
    Bot, Shield, Target, FileText, 
    CheckCircle2, AlertTriangle, Info,
    ChevronRight, ArrowRight, Zap, Wallet, Activity
} from "lucide-react"
import { cn } from "@/lib/utils"

const SECTIONS = [
    {
        id: 'dashboard',
        title: 'Executive Dashboard & KPIs',
        icon: LayoutDashboard,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        desc: 'หน้าจอหลักสำหรับผู้บริหาร เพื่อดูความเคลื่อนไหวของธุรกิจและสถานะการเงินแบบเรียลไทม์',
        items: [
            'Financial Stats: รายได้รวม, กำไรสุทธิ และ Profit Margin',
            'Fleet Status: จำนวนรถที่ว่าง, กำลังวิ่ง และสถานะความพร้อม GPS',
            'Service Level: อัตราการส่งมอบตรงเวลา (OTD) และการใช้รถ (Utilization)',
            'Fuel Guard: แจ้งเตือนความผิดปกติในการเติมน้ำมันและอัตราสิ้นเปลือง Km/L'
        ]
    },
    {
        id: 'operations',
        title: 'Planning & Assignment',
        icon: FileText,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        desc: 'การวางแผนงานขนส่งและการจ่ายงานให้คนขับรถผ่านระบบดิจิทัล',
        items: [
            'Smart Planning: ใช้ระบบ AI ช่วยคำนวณการจ่ายงานให้เหมาะสมที่สุด',
            'Monitoring: ติดตามตำแหน่งรถสดบนแผนที่ (Real-time GPS)',
            'POD Management: ตรวจสอบหลักฐานการส่งมอบ รูปภาพ และลายเซ็นดิจิทัล',
            'SOS Alerts: ระบบแจ้งเตือนอุบัติเหตุหรือเหตุฉุกเฉินจากคนขับทันที'
        ]
    },
    {
        id: 'fleet',
        title: 'Fleet & Driver Management',
        icon: Truck,
        color: 'text-orange-400',
        bg: 'bg-orange-400/10',
        desc: 'จัดการทรัพยากรบุคคลและพาหนะที่เป็นหัวใจสำคัญของการขนส่ง',
        items: [
            'Vehicle Master: บันทึกข้อมูลรถ, ความจุถังน้ำมัน และวันที่ต้องเช็คระยะ/ภาษี',
            'Driver Master: จัดการข้อมูลคนขับและการเชื่อมต่อ LINE Bot',
            'Maintenance: ติดตามประวัติการซ่อมบำรุงและสถานะรถเสีย',
            'Workforce Compliance: ตรวจสอบวันหมดอายุใบขับขี่และบัตรพนักงาน'
        ]
    },
    {
        id: 'finance',
        title: 'Accounting & Billing',
        icon: Wallet,
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        desc: 'ระบบวางบิลลูกค้าและการคำนวณสรุปจ่ายค่าเที่ยวให้รถร่วม',
        items: [
            'Customer Billing: สรุปยอดวางบิลรายสัปดาห์/รายเดือน',
            'Invoice Management: ออกใบแจ้งหนี้และบันทึกประวัติการรับชำระ',
            'Subcontractor Settlement: สรุปกำไรรายเที่ยวที่หักต้นทุนค่าน้ำมันแล้ว',
            'Expense Management: จัดการประเภทค่าใช้จ่ายพิเศษ (Extra Costs)'
        ]
    },
    {
        id: 'intelligence',
        title: 'Intelligence Support (AI)',
        icon: Bot,
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
        desc: 'ผู้ช่วยอัจฉริยะที่พร้อมตอบคำถามข้อมูลสถิติเพียงแค่คุณพิมพ์ถาม',
        items: [
            'Ask Anything: พิมพ์ถามเรื่องรายได้, รถเสีย, หรือ SOS ได้ทันที',
            'Discovery Chips: กดเลือกคำถามแนะนำเพื่อดูสถิติสำคัญแบบเร่งด่วน',
            'Branch Sync: ให้ข้อมูลตามสาขาที่เลือกไว้อย่างแม่นยำ',
            'ESG Insights: รายงานการลด CO2 และผลกระทบต่อสิ่งแวดล้อม'
        ]
    },
    {
        id: 'security',
        title: 'Security & Permissions',
        icon: Shield,
        color: 'text-rose-400',
        bg: 'bg-rose-400/10',
        desc: 'การจัดการความปลอดภัยและสิทธิ์การเข้าถึงเมนูต่างๆ ในระบบ',
        items: [
            'Access Matrix: กำหนดสิทธิ์รายบุคคลตามบทบาท (Role)',
            'Branch Isolation: แบ่งแยกข้อมูลตามสาขาเพื่อความเป็นส่วนตัว',
            'System Logs: ตรวจสอบความเคลื่อนไหวและประวัติการแก้ไขข้อมูล',
            'Super Admin: สิทธิ์สูงสุดในการจัดการระบบภาพรวมทั่วประเทศ'
        ]
    }
]

export default function SmartManual() {
    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-12 pb-20">
                {/* Hero Header */}
                <div className="relative p-12 bg-slate-950 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/10 pointer-events-none" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl shadow-emerald-500/20">
                            <BookOpen className="text-white" size={48} />
                        </div>
                        <div className="space-y-4 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <h1 className="text-5xl font-black text-white tracking-tight italic">
                                    Knowledge <span className="text-emerald-500">Center</span>
                                </h1>
                                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
                                    <Zap className="text-amber-400" size={16} />
                                    <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Version 2026.3 Standard</span>
                                </div>
                            </div>
                            <p className="text-slate-400 text-lg max-w-2xl font-medium leading-relaxed">
                                ยินดีต้อนรับสู่ระบบ TMS-ePOD อัจฉริยะ นี่คือคู่มือฉบับสมบูรณ์เพื่อให้คุณจัดการระบบได้อย่างมืออาชีพ คล่องตัว และเต็มประสิทธิภาพในการทำงาน
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SECTIONS.map((section) => (
                        <PremiumCard 
                            key={section.id}
                            className="p-8 border-slate-800 hover:border-emerald-500/50 transition-all group relative overflow-hidden flex flex-col h-full bg-slate-900/40 backdrop-blur-sm"
                        >
                            <div className={cn("inline-flex p-3 rounded-2xl mb-6 shadow-xl", section.bg)}>
                                <section.icon className={section.color} size={28} />
                            </div>
                            
                            <h3 className="text-xl font-black text-white mb-3 flex items-center gap-2">
                                {section.title}
                                <ChevronRight className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-500" size={18} />
                            </h3>
                            
                            <p className="text-slate-400 text-xs mb-8 font-medium leading-relaxed">
                                {section.desc}
                            </p>

                            <div className="mt-auto space-y-3">
                                {section.items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 group/item">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/50 group-hover/item:bg-emerald-500 transition-colors" />
                                        <span className="text-[11px] text-slate-500 group-hover/item:text-slate-200 transition-colors font-bold uppercase tracking-tight">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </PremiumCard>
                    ))}
                </div>

                {/* Premium Onboarding Guide */}
                <div className="bg-slate-950 rounded-[4rem] p-16 shadow-2xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-emerald-500">
                        <Activity size={350} />
                    </div>

                    <div className="max-w-4xl space-y-12 relative z-10">
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black text-white tracking-tight">ขั้นตอนการเริ่มต้นใช้งาน</h2>
                            <p className="text-emerald-500 text-lg font-black uppercase tracking-widest">3 Steps to Master the System</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {[
                                { step: '1', title: 'SETUP ROLES', desc: 'ตั้งค่าสาขาและกำหนดสิทธิ์ให้พนักงานในเมนู Settings' },
                                { step: '2', title: 'REGISTER FLEET', desc: 'เพิ่มข้อมูลรถและสร้างบัญชีคนขับเพื่อให้พร้อมรับงาน' },
                                { step: '3', title: 'SMART PLAN', desc: 'เริ่มสร้างงานและใช้ AI ช่วยจ่ายงานให้คนขับทันที' }
                            ].map((item, i) => (
                                <div key={i} className="group space-y-6">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center font-black text-2xl shadow-xl group-hover:bg-emerald-500 group-hover:border-emerald-400 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                                        {item.step}
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                                        <p className="text-slate-400 text-sm font-medium leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-10 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/20 flex flex-col md:flex-row items-center gap-8 group">
                            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 shrink-0 group-hover:scale-110 transition-transform">
                                <Info size={32} />
                            </div>
                            <div className="space-y-2 flex-1 text-center md:text-left">
                                <p className="font-black text-white text-lg tracking-tight uppercase">Professional Recommendation</p>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                    หากคุณมีคำถามเร่งด่วน หรือต้องการวิเคราะห์สถิติแบบเจาะจง ลองใช้ฟีเจอร์ <span className="text-emerald-400 font-black">Intelligence Support</span> และพิมพ์แชทถามได้ทันที ระบบจะดึงข้อมูลจริงจากฐานข้อมูลมาตอบคุณในเสี้ยววินาทีครับ
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support Footer */}
                <div className="flex flex-col items-center gap-8 py-10">
                    <div className="flex items-center gap-4 text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">
                        <div className="w-10 h-px bg-slate-800" />
                        LOGIS-PRO Intellegent Ecosystem
                        <div className="w-10 h-px bg-slate-800" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
