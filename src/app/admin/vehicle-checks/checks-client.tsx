"use client"

import { 
    Truck, FileText, Image as ImageIcon, PenTool, 
    ArrowLeft, Activity, Search, Target, ShieldCheck 
} from "lucide-react"
import Link from "next/link"
import { PremiumCard } from "@/components/ui/premium-card"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

interface VehicleCheck {
    id: string;
    Check_Date: string;
    Vehicle_Plate: string;
    Driver_Name: string | null;
    Passed_Items: Record<string, boolean> | null;
    Check_Type?: string;
    Photo_Urls?: string | null;
    Signature_Url?: string | null;
}

interface ChecksClientProps {
    checks: VehicleCheck[]
}

export function ChecksClient({ checks }: ChecksClientProps) {
    const { t } = useLanguage()

    const STANDARD_CHECKLIST = [
        { key: "oil", label: t('checks.standard.oil'), dbKey: "น้ำมันเครื่อง" },
        { key: "coolant", label: t('checks.standard.coolant'), dbKey: "น้ำในหม้อน้ำ" },
        { key: "tires", label: t('checks.standard.tires'), dbKey: "ลมยาง" },
        { key: "lights", label: t('checks.standard.lights'), dbKey: "ไฟเบรค/ไฟเลี้ยว" },
        { key: "tire_condition", label: t('checks.standard.tire_condition'), dbKey: "สภาพยางรถยนต์" },
        { key: "emergency", label: t('checks.standard.emergency'), dbKey: "อุปกรณ์ฉุกเฉิน" },
        { key: "documents", label: t('checks.standard.documents'), dbKey: "เอกสารประจำรถ" }
    ]

    return (
        <div className="space-y-12 pb-20 p-4 lg:p-10">
            {/* Tactical Elite Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
                
                <div className="relative z-10 space-y-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-base font-bold group/back italic">
                        <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                        {t('common.back')}
                    </Link>
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                            <Truck size={42} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">
                                {t('navigation.checks')}
                            </h1>
                            <p className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] mt-2 opacity-80 italic">{t('dashboard.subtitle')}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 relative z-10">
                    <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                        <span className="text-base font-bold font-black text-slate-400 uppercase tracking-widest">{t('dashboard.system_integrity')}</span>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4 bg-primary/10 border border-primary/20 rounded-2xl">
                        <Activity className="text-primary" size={18} />
                        <span className="text-xl font-black text-white uppercase tracking-tighter italic">{t('notifications.status')}: NOMINAL</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: t('common.trips'), value: "24", icon: ShieldCheck, color: "primary" },
                  { label: t('notifications.compliance_rate') || "Compliance Rate", value: "98.2%", icon: Activity, color: "emerald" },
                  { label: t('common.error'), value: "02", icon: Target, color: "rose" },
                  { label: t('navigation.fleet'), value: "86", icon: Truck, color: "blue" },
                ].map((stat, i) => (
                   <PremiumCard key={i} className="p-8 group hover:border-primary/40 transition-all duration-500 border-white/5 bg-[#0a0518]/40 backdrop-blur-xl">
                       <div className="flex justify-between items-start mb-4">
                          <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                          <stat.icon className="text-primary opacity-20 group-hover:opacity-100 transition-opacity" size={20} />
                       </div>
                       <p className="text-4xl font-black text-white italic tracking-tighter mb-2">{stat.value}</p>
                       <div className="h-1 w-12 bg-primary rounded-full shadow-lg shadow-primary/20" />
                   </PremiumCard>
                ))}
            </div>

            {/* Registry Table */}
            <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/table">
                <div className="p-10 border-b border-white/5 bg-black/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] pointer-events-none" />
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="p-3 bg-white/5 rounded-2xl text-primary border border-white/10 shadow-inner group-hover/table:rotate-12 transition-transform duration-500">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase italic">{t('checks.registry')}</h2>
                            <p className="text-base font-bold font-black text-slate-500 uppercase tracking-[0.4em] mt-1">{t('notifications.registry_subtitle')}</p>
                        </div>
                    </div>
                    
                    <div className="relative z-10 w-full md:w-80 group/search">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-primary transition-colors" size={20} />
                        <input 
                            className="w-full h-16 bg-[#0a0518] border-white/5 rounded-3xl pl-16 pr-8 text-lg font-bold font-black uppercase tracking-widest focus:border-primary/50 transition-all text-white placeholder:text-slate-700 italic shadow-inner outline-none"
                            placeholder={t('common.search')}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-black/20 text-base font-bold font-black uppercase tracking-[0.4em] text-slate-500 border-b border-white/5">
                                <th className="text-left p-10">{t('common.date')} Node</th>
                                <th className="text-left p-10">{t('navigation.fleet')} Plate</th>
                                <th className="text-left p-10">{t('navigation.drivers')} Operator</th>
                                <th className="text-left p-10">{t('notifications.compliance_decay')} Vector</th>
                                <th className="text-right p-10">{t('checks.visual')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {checks?.map((check) => {
                                const items = (check.Passed_Items || {}) as Record<string, boolean>
                                const failedItems = STANDARD_CHECKLIST.filter(item => !items[item.dbKey])
                                const isPass = failedItems.length === 0

                                return (
                                    <tr key={check.id} className="group/row hover:bg-white/[0.03] transition-all duration-300">
                                        <td className="p-10">
                                            <div className="flex flex-col">
                                                <span className="text-white font-black tracking-tight text-xl uppercase italic group-hover/row:text-primary transition-colors">
                                                    {new Date(check.Check_Date).toLocaleDateString(t('common.loading') === 'กำลังประมวลผล...' ? 'th-TH' : 'en-US')}
                                                </span>
                                                <span className="text-base font-bold text-slate-600 font-black uppercase tracking-widest mt-1">
                                                    {new Date(check.Check_Date).toLocaleTimeString(t('common.loading') === 'กำลังประมวลผล...' ? 'th-TH' : 'en-US')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover/row:scale-110 group-hover/row:bg-primary/20 transition-all duration-500 shadow-inner border border-white/5">
                                                    <Truck size={18} />
                                                </div>
                                                <span className="font-black text-white text-xl tracking-widest uppercase italic border-b-2 border-primary/20">{check.Vehicle_Plate}</span>
                                            </div>
                                        </td>
                                        <td className="p-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-base font-bold font-black italic shadow-lg shadow-primary/20 border-2 border-white/10 overflow-hidden relative">
                                                    <div className="absolute inset-0 bg-primary/20" />
                                                    {(check.Driver_Name || "A").charAt(0)}
                                                </div>
                                                <span className="text-lg font-bold font-black text-slate-400 group-hover/row:text-white transition-colors uppercase tracking-widest">{check.Driver_Name || "OP_ALPHA"}</span>
                                            </div>
                                        </td>
                                        <td className="p-10">
                                            <div className="flex flex-col gap-2">
                                                <div className={cn(
                                                    "flex items-center gap-3 px-5 py-2.5 rounded-full border w-fit shadow-2xl transition-all duration-500 group-hover/row:translate-x-2",
                                                    isPass 
                                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10" 
                                                        : "bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-rose-500/20 animate-pulse"
                                                )}>
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        isPass ? "bg-emerald-500" : "bg-rose-500"
                                                    )} />
                                                    <span className="text-base font-bold font-black uppercase tracking-[0.2em] italic">
                                                        {isPass ? t('checks.status.pass') : t('checks.status.fail')}
                                                    </span>
                                                </div>
                                                {!isPass && (
                                                    <div className="flex flex-wrap gap-2 ml-5">
                                                        {failedItems.map(item => (
                                                            <span key={item.key} className="text-base font-bold font-black text-rose-300 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-lg italic">
                                                                {t('notifications.danger') || 'DANGER'}: {item.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-10 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {check.Photo_Urls && check.Photo_Urls.split(',')[0] && (
                                                    <a 
                                                        href={check.Photo_Urls.split(',')[0]}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-primary text-white text-base font-bold font-black uppercase tracking-widest flex items-center justify-center transition-all border border-white/10 hover:border-primary/50 group/intel shadow-lg active:scale-95"
                                                    >
                                                        <ImageIcon size={14} className="mr-3 group-hover/intel:scale-110 transition-transform" />
                                                        {t('notifications.visual') || 'VISUAL'}
                                                    </a>
                                                )}
                                                {check.Signature_Url && (
                                                    <a 
                                                        href={check.Signature_Url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-emerald-500 text-white flex items-center justify-center transition-all border border-white/10 hover:border-emerald-500 shadow-lg active:scale-95 group/sig"
                                                    >
                                                        <PenTool size={18} className="group-hover/sig:rotate-12 transition-transform" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </PremiumCard>
        </div>
    )
}

