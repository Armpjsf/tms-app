"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Database, ArrowLeft, Download, FileJson, ShieldCheck, Zap, HardDrive, Share2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { useLanguage } from "@/components/providers/language-provider"

export default function BackupSettingsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleBackup = async (table: string) => {
    setLoading(true)
    try {
        const supabase = createClient()
        const { data, error } = await supabase.from(table).select('*')
        if (error) throw error
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${table}_backup_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`สำรองข้อมูลตาราง ${table} สำเร็จแล้ว`)
    } catch (error) {
        toast.error("การสำรองข้อมูลล้มเหลว: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
        setLoading(false)
    }
  }

  const backupItems = [
    { label: "บันทึกงานขนส่ง", table: "Jobs_Main", desc: "ข้อมูลการดำเนินงานหลักและประวัติงานวิ่งทั้งหมด" },
    { label: "ทะเบียนผู้ใช้งาน", table: "Master_Users", desc: "ข้อมูลบัญชีผู้ใช้ สิทธิ์ และประวัติพนักงาน" },
    { label: "คลังข้อมูลยานพาหนะ", table: "Master_Vehicles", desc: "ข้อมูลรถ ทะเบียน และข้อกำหนดทางเทคนิค" },
    { label: "บันทึกการใช้พลังงาน", table: "Fuel_Logs", desc: "ข้อมูลการเติมน้ำมันและสถิติประสิทธิภาพเชื้อเพลิง" },
    { label: "ข้อมูลซ่อมบำรุง", table: "Repair_Tickets", desc: "ประวัติการซ่อมและสถานะทางเทคนิคของอุปกรณ์" },
    { label: "ฐานข้อมูลลูกค้า", table: "Master_Customers", desc: "ข้อมูลบริษัทคู่ค้าและรายละเอียดผู้ว่าจ้าง" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10 max-w-7xl mx-auto">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-background/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-border/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-muted-foreground hover:text-emerald-500 transition-all font-black uppercase tracking-[0.1em] text-base font-bold group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    {t('common.back')}
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-500/20 rounded-[2.5rem] border-2 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-emerald-400 group-hover:scale-110 transition-all duration-500">
                        <Database size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none italic premium-text-gradient">
                            คลังข้อมูลระบบ
                        </h1>
                        <p className="text-base font-bold font-black text-emerald-500 uppercase tracking-[0.2em] mt-2 opacity-80 italic italic">{t('settings.items.vault_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-muted/50 border border-border/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                    <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">สถานะคลัง: พร้อมใช้งาน</span>
                </div>
                <div className="flex items-center gap-4 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                   <ShieldCheck className="text-emerald-500" size={18} />
                   <span className="text-base font-bold font-black text-foreground uppercase tracking-[0.1em] italic">ระบบเข้ารหัสข้อมูลเปิดทำงาน</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {backupItems.map((item) => (
              <PremiumCard key={item.table} className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[3rem] overflow-hidden group/vault hover:border-emerald-500/30 transition-all duration-500">
                  <div className="p-10 space-y-8">
                      <div className="flex justify-between items-start">
                          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner group-hover/vault:rotate-6 transition-transform">
                              <FileJson size={28} />
                          </div>
                          <div className="flex items-center gap-2 opacity-20 group-hover/vault:opacity-100 transition-opacity">
                             <Zap size={14} className="text-emerald-500" />
                             <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">พร้อมส่งออก</span>
                          </div>
                      </div>
                      
                      <div>
                          <h3 className="text-2xl font-black text-foreground tracking-widest uppercase italic group-hover/vault:text-emerald-400 transition-colors">{item.label}</h3>
                          <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.1em] mt-2 h-10 italic">
                            {"// "} {item.desc}
                          </p>
                      </div>

                      <div className="space-y-4 pt-4">
                           <div className="flex items-center justify-between text-base font-bold font-black uppercase tracking-[0.1em] text-muted-foreground italic">
                                <span>โปรโตคอล: JSON_EXPORT</span>
                                <span>สถานะ: ปกติ</span>
                           </div>
                           <PremiumButton 
                              variant="outline" 
                              className="w-full h-16 rounded-2xl gap-4 bg-muted/50 border-border/5 hover:bg-emerald-600 hover:text-foreground hover:border-emerald-500 transition-all shadow-xl font-black uppercase text-xl tracking-[0.1em] italic" 
                              onClick={() => handleBackup(item.table)}
                              disabled={loading}
                           >
                              {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                              ดึงข้อมูลสำรอง
                           </PremiumButton>
                      </div>
                  </div>
              </PremiumCard>
          ))}
        </div>

        {/* Global Advisory */}
        <div className="mt-20 p-12 rounded-[3.5rem] bg-emerald-500/5 border-2 border-emerald-500/10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="p-6 rounded-[2rem] bg-emerald-500/20 text-emerald-500 border-2 border-emerald-500/30 shadow-2xl animate-pulse">
                <HardDrive size={32} />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
                <p className="text-xl font-black text-emerald-500 italic uppercase tracking-widest">ข้อแนะนำการสำรองข้อมูล</p>
                <p className="text-xl font-bold text-muted-foreground leading-relaxed uppercase tracking-wider italic">
                    ข้อมูลสำรองจะถูกบันทึกในรูปแบบไฟล์ JSON ที่มีความแม่นยำสูง สำหรับการกู้คืนข้อมูลหรือย้ายระบบ กรุณาตรวจสอบความครบถ้วนของข้อมูลก่อนนำไปใช้งานในเครื่องสำรอง <br />
                    ระบบจะทำการซิงค์ข้อมูลอัตโนมัติทุกๆ รอบวันเวลา 00:00 UTC
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-border/10 text-foreground gap-3 uppercase font-black text-base font-bold tracking-[0.1em] ml-auto italic">
                <Share2 size={18} /> ซิงค์ข้อมูลภายนอก
            </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  )
}
