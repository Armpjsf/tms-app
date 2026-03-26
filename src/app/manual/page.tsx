'use client'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { 
    BookOpen, LayoutDashboard, Truck, Users, 
    Bot, Shield, Target, FileText, 
    CheckCircle2, AlertTriangle, Info,
    ChevronRight, ArrowRight, Zap, Wallet, Activity,
    ShieldCheck, Navigation
} from "lucide-react"
import { cn } from "@/lib/utils"

const SECTIONS = [
    {
        id: 'dashboard',
        title: 'Mission Command & KPIs',
        icon: LayoutDashboard,
        color: 'text-primary',
        bg: 'bg-primary/10',
        desc: 'Strategic command center for real-time operational monitoring and financial intelligence.',
        items: [
            'Financial Matrix: Revenue, Profit, and Nodal Margin',
            'Fleet Vectors: Active units, GPS status, and readiness',
            'Performance Index: OTD (On-Time Delivery) and Utilization',
            'Energy Guard: Fuel consumption anomalies and Km/L logs'
        ]
    },
    {
        id: 'operations',
        title: 'Tactical Planning',
        icon: Navigation,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        desc: 'Digital mission deployment and real-time asset orchestration.',
        items: [
            'AI-Agent Planning: Optimized n-node mission distribution',
            'Vector Tracking: Real-time spatial asset monitoring',
            'Digital POD: Encrypted proofs, media, and e-signatures',
            'SOS Protocols: Instant emergency response matrix'
        ]
    },
    {
        id: 'fleet',
        title: 'Asset & Unit Grid',
        icon: Truck,
        color: 'text-accent',
        bg: 'bg-accent/10',
        desc: 'Management of the core logistics hardware and elite driver personnel.',
        items: [
            'Asset Master: Vehicle technical specs and regulatory logs',
            'Unit Master: Elite personnel records and LINE-Bot binding',
            'Integrity Maintenance: History of repairs and asset status',
            'Compliance Guard: Licensing and regulatory verifiers'
        ]
    },
    {
        id: 'finance',
        title: 'Strategic Settlement',
        icon: Wallet,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        desc: 'Advanced billing cycles and partner settlement subsystems.',
        items: [
            'Partner Billing: Periodic billing cycles & aggregations',
            'Fiscal Records: Invoice issuance and payment verification',
            'Subcon Protocols: Net-margin calculation post-energy costs',
            'Dynamic Expenses: Ad-hoc operational cost recording'
        ]
    },
    {
        id: 'intelligence',
        title: 'Neural AI Support',
        icon: Bot,
        color: 'text-primary',
        bg: 'bg-primary/20',
        desc: 'Conversational data analyst providing instant operational insights.',
        items: [
            'Natural Language Query: Instant revenue & performance stats',
            'Discovery Nodes: One-tap access to critical analytics',
            'Neural Branch Sync: Cross-branch intelligence parity',
            'ESG Insights: Carbon reduction & environmental impact'
        ]
    },
    {
        id: 'security',
        title: 'Encryption & Clearance',
        icon: ShieldCheck,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
        desc: 'Enterprise-grade security matrix and role-based access control.',
        items: [
            'Access Matrix: Precise role-based permission layering',
            'Nodal Isolation: Sector-specific data privacy (Branch)',
            'System Audit Logs: Traceable immutable modification history',
            'Overlord Access: Global administrative command privileges'
        ]
    }
]

export default function SmartManual() {
    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-16 pb-24">
                {/* Tactical Hero Header */}
                <div className="relative p-16 bg-background/60 backdrop-blur-3xl rounded-[4rem] border border-border/5 shadow-2xl overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/5 rounded-full blur-[100px] animate-pulse" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-12">
                        <div className="w-32 h-32 bg-primary rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-[0_20px_60px_rgba(255,30,133,0.4)] group-hover:rotate-6 transition-transform duration-700">
                            <BookOpen className="text-foreground" size={56} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-6 text-center lg:text-left">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                <h1 className="text-6xl font-black text-foreground tracking-tighter uppercase premium-text-gradient italic">
                                    Knowledge <span className="text-primary">Matrix</span>
                                </h1>
                                <div className="inline-flex items-center gap-3 bg-muted/50 border border-border/10 px-6 py-2 rounded-full backdrop-blur-md">
                                    <Zap className="text-primary animate-pulse" size={18} />
                                    <span className="text-muted-foreground text-base font-bold font-black uppercase tracking-[0.4em]">Protocol v9.4 Stable</span>
                                </div>
                            </div>
                            <p className="text-muted-foreground text-xl max-w-3xl font-bold leading-relaxed uppercase tracking-tight italic">
                                ยินดีต้อนรับสู่ศูนย์กลางข้อมูล LOGISPRO นี่คือคู่มือปฏิบัติการเชิงยุทธวิธี เพื่อการบริหารจัดการระบบขนส่งอัจฉริยะอย่างเต็มประสิทธิภาพ
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tactical Grid Modules */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {SECTIONS.map((section) => (
                        <PremiumCard 
                            key={section.id}
                            className="p-10 border-border/5 bg-background/40 backdrop-blur-2xl hover:border-primary/40 transition-all group relative overflow-hidden flex flex-col h-full rounded-[3.5rem] shadow-2xl hover:shadow-primary/5"
                        >
                            <div className={cn("inline-flex p-4 rounded-2xl mb-8 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6", section.bg)}>
                                <section.icon className={section.color} size={32} strokeWidth={2.5} />
                            </div>
                            
                            <h3 className="text-2xl font-black text-foreground mb-4 flex items-center gap-3 italic tracking-tight uppercase group-hover:text-primary transition-colors">
                                {section.title}
                                <ArrowRight className="opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all text-primary" size={20} />
                            </h3>
                            
                            <p className="text-muted-foreground text-[13px] mb-10 font-bold leading-relaxed uppercase tracking-widest opacity-80">
                                {section.desc}
                            </p>

                            <div className="mt-auto space-y-4">
                                {section.items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 group/item">
                                        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/20 group-hover/item:bg-primary transition-colors shadow-[0_0_8px_rgba(255,30,133,0)] group-hover/item:shadow-[0_0_8px_rgba(255,30,133,1)]" />
                                        <span className="text-base font-bold text-muted-foreground group-hover/item:text-muted-foreground transition-colors font-black uppercase tracking-widest leading-none italic">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </PremiumCard>
                    ))}
                </div>

                {/* Strategic Deployment Guide */}
                <div className="bg-background/60 backdrop-blur-3xl rounded-[5rem] p-20 shadow-3xl border border-border/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none text-primary group-hover:opacity-[0.04] transition-opacity duration-1000">
                        <Activity size={500} />
                    </div>

                    <div className="max-w-5xl space-y-16 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-2 h-16 bg-primary rounded-full shadow-[0_0_20px_rgba(255,30,133,0.8)]" />
                            <div className="space-y-2">
                                <h2 className="text-6xl font-black text-foreground tracking-tighter uppercase italic">Operational Launchpad</h2>
                                <p className="text-primary text-xl font-black uppercase tracking-[0.5em] italic">3 Phases to Absolute Grid Control</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {[
                                { step: '01', title: 'MATRIX SETUP', desc: 'ตั้งค่าสาขาและกำหนดสิทธิ์เข้าถึงในหมวด SECURITY MESH Settings' },
                                { step: '02', title: 'ASSET DEPLOY', desc: 'ลงทะเบียน Fleet และ Driver เพื่อเตรียมความพร้อมของทรัพยากร' },
                                { step: '03', title: 'GRID MISSION', desc: 'เริ่มจ่ายงานผ่าน SMART PLAN และติดตามสถานะทางยุทธวิธีแบบเรียลไทม์' }
                            ].map((item, i) => (
                                <div key={i} className="group/step space-y-8">
                                    <div className="w-20 h-20 rounded-3xl bg-muted/50 border border-border/5 text-muted-foreground flex items-center justify-center font-black text-3xl shadow-2xl group-hover/step:bg-primary group-hover/step:text-foreground group-hover/step:border-primary/40 transition-all duration-700 group-hover/step:scale-110 group-hover/step:-rotate-3">
                                        {item.step}
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-xl font-black text-foreground uppercase tracking-tight group-hover/step:text-primary transition-colors italic">{item.title}</h4>
                                        <p className="text-muted-foreground text-lg font-bold font-black uppercase tracking-widest leading-relaxed opacity-80">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-12 bg-primary/5 rounded-[3.5rem] border border-primary/10 flex flex-col md:flex-row items-center gap-10 group/tip relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-3xl" />
                            <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-foreground shadow-[0_20px_50px_rgba(255,30,133,0.3)] shrink-0 group-hover/tip:scale-110 transition-transform duration-500">
                                <Info size={40} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-3 flex-1 text-center md:text-left">
                                <p className="font-black text-foreground text-xl tracking-tighter uppercase italic">Neural Command Recommendation</p>
                                <p className="text-muted-foreground text-xl font-bold leading-relaxed uppercase tracking-tight italic">
                                    หากต้องการข้อมูลวิเคราะห์ประมวลผลด่วน ลองใช้ระบบ <span className="text-primary font-black">Tactical Assistant</span> เพียงพิมพ์คำรหัสหรือคำสั่งที่คุณต้องการ ระบบจะดึงฐานพิกัดข้อมูลมาตอบคุณทันที
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final Tactical Signature */}
                <div className="flex flex-col items-center gap-10 py-12">
                    <div className="flex items-center gap-6 text-muted-foreground font-black uppercase tracking-[0.8em] text-base font-bold opacity-30 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-px bg-slate-800" />
                        LOGISPRO INTEL ECOSYSTEM
                        <div className="w-16 h-px bg-slate-800" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

