import { createAdminClient } from "@/utils/supabase/server"
import { Truck, FileText, Image as ImageIcon, PenTool, ArrowLeft, TrendingUp } from "lucide-react"
import Link from "next/link"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"
export const revalidate = 0

const STANDARD_CHECKLIST = [
    "น้ำมันเครื่อง", "น้ำในหม้อน้ำ", "ลมยาง", "ไฟเบรค/ไฟเลี้ยว", 
    "สภาพยางรถยนต์", "อุปกรณ์ฉุกเฉิน", "เอกสารประจำรถ"
]

export default async function AdminVehicleChecksPage() {
    const supabase = createAdminClient()
    
    try {
        const { data: checks, error } = await supabase
            .from('Vehicle_Checks')
            .select('*')
            .order('Check_Date', { ascending: false })
            .limit(100)

        if (error) {
            // Error fetching vehicle checks
        }

        return (
            <div className="space-y-10">
                {/* Bespoke Elite Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10">
                        <Link href="/dashboard" className="flex items-center gap-2 text-indigo-400 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em] w-fit">
                            <ArrowLeft className="w-4 h-4" /> Personnel Hub
                        </Link>
                        <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl shadow-2xl shadow-indigo-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                                <Truck size={32} />
                            </div>
                            Inspections COMMAND
                        </h1>
                        <p className="text-indigo-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Fleet Integrity & Safety Compliance Registry</p>
                    </div>

                    <div className="flex flex-wrap gap-4 relative z-10">
                        <div className="flex items-center gap-3 px-6 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Live Compliance Feed</span>
                        </div>
                    </div>
                </div>

            <PremiumCard className="overflow-hidden border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 bg-white rounded-br-[5rem] rounded-tl-[3rem]">
                {/* Table Header Section */}
                <div className="p-10 border-b border-slate-50 bg-slate-950 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Inspection Registry</h2>
                            <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Historical Safety Protocol logs</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="text-[9px] uppercase bg-slate-50 text-slate-500 border-b border-slate-100 font-black tracking-widest">
                            <tr>
                                <th className="text-left p-6">Timestamp / OP ID</th>
                                <th className="text-left p-6">Entity Plate</th>
                                <th className="text-left p-6">Operator</th>
                                <th className="text-left p-6">Status / Protocol</th>
                                <th className="text-left p-6">Artifacts & Verification</th>
                            </tr>
                        </thead>
                        <tbody>
                            {checks?.map((check) => {
                                const items = (check.Passed_Items || {}) as Record<string, boolean>
                                const failedItems = STANDARD_CHECKLIST.filter(item => !items[item])
                                const isPass = failedItems.length === 0

                                return (
                                    <tr key={check.id} className="group transition-all duration-300">
                                        <td className="p-6 bg-white group-hover:bg-slate-50 border-b border-slate-100 rounded-l-[1.5rem] transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-black tracking-tight">{new Date(check.Check_Date).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(check.Check_Date).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 bg-white group-hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-950 rounded-lg text-white group-hover:scale-110 transition-transform">
                                                    <Truck size={14} />
                                                </div>
                                                <span className="font-black text-slate-900 tracking-tighter uppercase">{check.Vehicle_Plate}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 bg-white group-hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-black border border-indigo-200 uppercase">
                                                    {(check.Driver_Name || check.Driver_ID || "?").charAt(0)}
                                                </div>
                                                <span className="text-sm font-black text-slate-700 tracking-tight">{check.Driver_Name || check.Driver_ID}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 bg-white group-hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        isPass ? "bg-emerald-500 shadow-lg shadow-emerald-500/40" : "bg-red-500 shadow-lg shadow-red-500/40 animate-pulse"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-[0.2em] leading-none",
                                                        isPass ? "text-emerald-500" : "text-red-500"
                                                    )}>
                                                        {isPass ? "Compliance Passed" : "Protocol Deficit"}
                                                    </span>
                                                </div>
                                                {!isPass && (
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px] truncate">
                                                        {failedItems.join(", ")}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 bg-white group-hover:bg-slate-50 border-b border-slate-100 rounded-r-[1.5rem] transition-colors">
                                            <div className="flex flex-wrap items-center gap-3">
                                                {check.Photo_Urls && (
                                                    <>
                                                        {(() => {
                                                            const urls = check.Photo_Urls.split(',').filter(Boolean);
                                                            if (urls.length === 0) return null;
                                                            return (
                                                                <a 
                                                                    href={urls[0]}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center justify-center h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
                                                                >
                                                                    <FileText size={14} className="mr-2" />
                                                                    Report
                                                                </a>
                                                            );
                                                        })()}

                                                        {(() => {
                                                            const urls = check.Photo_Urls.split(',').filter(Boolean);
                                                            if (urls.length <= 1) return null;
                                                            return (
                                                                <div className="flex gap-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                                                    {urls.slice(1).map((url: string, idx: number) => (
                                                                    <a 
                                                                        key={idx}
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200 hover:text-indigo-500 hover:border-indigo-500 hover:scale-110 transition-all shadow-sm"
                                                                        title={`Inspection Artifact ${idx + 1}`}
                                                                    >
                                                                        <ImageIcon size={12} />
                                                                    </a>
                                                                ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </>
                                                )}
                                                {check.Signature_Url && (
                                                    <a 
                                                        href={check.Signature_Url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm active:scale-95"
                                                    >
                                                        <PenTool size={14} className="mr-2" />
                                                        Auth
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {(!checks || checks.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="text-center py-24">
                                        <div className="flex flex-col items-center">
                                            <TrendingUp className="w-16 h-16 text-slate-100 mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No synchronization detected in the registry</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </PremiumCard>
        </div>
    )
  } catch {
    return (
      <div className="p-8">
        <h1>สรุปการตรวจเช็ครถ</h1>
        <p>ไม่สามารถโหลดข้อมูลได้</p>
      </div>
    )
  }
}
