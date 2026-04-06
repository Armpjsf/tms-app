
"use client"

import { useState } from "react"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Fuel, 
    Wrench, 
    ShieldCheck, 
    Save, 
    Plus, 
    Trash2,
    Info,
    AlertTriangle,
    Activity,
    ArrowRight,
    Loader2
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { saveFuelStandard, saveMaintenanceStandard, deleteMaintenanceStandard } from "@/lib/actions/fleet-intelligence-actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function FleetStandardsClient({ initialFuel, initialMaintenance }: { initialFuel: any[], initialMaintenance: any[] }) {
    const [fuelData, setFuelData] = useState(initialFuel)
    const [maintData, setMaintData] = useState(initialMaintenance)
    const [saving, setSaving] = useState(false)

    // Fuel Actions
    const updateFuel = (index: number, field: string, value: any) => {
        const next = [...fuelData]
        next[index] = { ...next[index], [field]: field === 'Vehicle_Type' ? value : (parseFloat(value) || 0) }
        setFuelData(next)
    }

    const handleSaveFuel = async (index: number) => {
        setSaving(true)
        const result = await saveFuelStandard(fuelData[index])
        if (result.success) {
            toast.success("บันทึกเกณฑ์น้ำมันเรียบร้อย")
            // Update the record with any server-side defaults if needed
            if (result.data) {
                const next = [...fuelData]
                next[index] = result.data
                setFuelData(next)
            }
        }
        else toast.error("ล้มเหลว: " + result.error)
        setSaving(false)
    }

    const addFuelRow = () => {
        setFuelData([{ Vehicle_Type: "ประเภทรถใหม่", Standard_KM_L: 10, Warning_Threshold_Percent: 15 }, ...fuelData])
    }

    // Maintenance Actions
    const updateMaint = (index: number, field: string, value: any) => {
        const next = [...maintData]
        next[index] = { ...next[index], [field]: field.includes('Name') ? value : (parseFloat(value) || null) }
        setMaintData(next)
    }

    const handleSaveMaint = async (index: number) => {
        setSaving(true)
        const result = await saveMaintenanceStandard(maintData[index])
        if (result.success) toast.success("บันทึกเกณฑ์การบำรุงรักษาเรียบร้อย")
        else toast.error("ล้มเหลว: " + result.error)
        setSaving(false)
    }

    const addMaintRow = () => {
        setMaintData([...maintData, { Component_Name: "อะไหล่ใหม่", Standard_KM: 10000, Standard_Months: 12, Alert_Before_KM: 1000, Alert_Before_Days: 15 }])
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Tactical Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-background/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-border/5 shadow-2xl relative group ring-1 ring-border/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                            <ShieldCheck className="text-primary" size={20} />
                        </div>
                        <h2 className="text-base font-bold font-black text-primary uppercase tracking-[0.4em]">Fleet Intelligence Standard</h2>
                    </div>
                    <h1 className="text-6xl font-black text-foreground tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                        เกณฑ์มาตรฐานยานพาหนะ
                    </h1>
                    <p className="text-muted-foreground font-bold text-xl tracking-wide opacity-80 uppercase leading-relaxed max-w-2xl">
                        ตั้งค่าเกณฑ์ชี้วัดเพื่อใช้ในระบบวิเคราะห์ความผิดปกติและการแจ้งเตือนอัจฉริยะ (Anomaly Detection)
                    </p>
                </div>
            </div>

            <Tabs defaultValue="fuel" className="w-full">
                <div className="flex justify-center mb-12">
                    <TabsList className="bg-muted/50 p-2 rounded-[2rem] border border-border/5 h-auto flex gap-2">
                        <TabsTrigger value="fuel" className="px-10 py-4 rounded-[1.5rem] text-lg font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-xl transition-all flex items-center gap-3">
                            <Fuel size={20} /> เกณฑ์น้ำมัน (Fuel)
                        </TabsTrigger>
                        <TabsTrigger value="maintenance" className="px-10 py-4 rounded-[1.5rem] text-lg font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-xl transition-all flex items-center gap-3">
                            <Wrench size={20} /> เกณฑ์บำรุงรักษา (Maint)
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* FUEL TAB */}
                <TabsContent value="fuel" className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex justify-end mb-8">
                        <PremiumButton onClick={addFuelRow} className="rounded-2xl px-8 shadow-lg shadow-primary/20">
                            <Plus size={20} className="mr-2" strokeWidth={3} />
                            เพิ่มเกณฑ์ประเภทรถ
                        </PremiumButton>
                    </div>

                    {fuelData.length === 0 ? (
                        <div className="py-40 text-center glass-panel rounded-[4rem] border-dashed border-border/5 opacity-30 flex flex-col items-center gap-6">
                            <Fuel size={80} className="text-muted-foreground" />
                            <p className="text-2xl font-black uppercase tracking-tighter">ยังไม่มีข้อมูลเกณฑ์น้ำมัน</p>
                            <button onClick={addFuelRow} className="text-primary font-black uppercase tracking-widest underline underline-offset-8 decoration-2">กดเพื่อเพิ่มรายการแรก</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                            {fuelData.map((std, idx) => (
                                <Card key={idx} className="bg-card border-border/10 rounded-[3rem] shadow-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-500 relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none" />
                                    <CardContent className="p-8 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="p-4 bg-primary/20 rounded-2xl text-primary shadow-inner">
                                                <Activity size={24} strokeWidth={2.5} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">Fuel Matrix</span>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">ประเภทรถ (Vehicle Type)</Label>
                                            <Input 
                                                value={std.Vehicle_Type}
                                                onChange={(e) => updateFuel(idx, 'Vehicle_Type', e.target.value)}
                                                className="bg-transparent border-none text-3xl font-black text-foreground tracking-tighter p-0 h-auto focus:ring-0 uppercase"
                                                placeholder="ระบุประเภทรถ..."
                                            />
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <Label className="text-xs font-black uppercase tracking-widest text-primary">อัตราสิ้นเปลืองมาตรฐาน (KM/L)</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.1"
                                                    value={std.Standard_KM_L}
                                                    onChange={(e) => updateFuel(idx, 'Standard_KM_L', e.target.value)}
                                                    className="bg-muted/30 border-none h-14 text-2xl font-black rounded-2xl text-center focus:ring-primary/30"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">เกณฑ์แจ้งเตือนเบี่ยงเบน (%)</Label>
                                                <Input 
                                                    type="number" 
                                                    value={std.Warning_Threshold_Percent}
                                                    onChange={(e) => updateFuel(idx, 'Warning_Threshold_Percent', e.target.value)}
                                                    className="bg-muted/30 border-none h-14 text-2xl font-black rounded-2xl text-center focus:ring-primary/30"
                                                />
                                            </div>
                                        </div>

                                        <PremiumButton 
                                            onClick={() => handleSaveFuel(idx)} 
                                            disabled={saving}
                                            className="w-full h-14 rounded-2xl shadow-lg shadow-primary/20"
                                        >
                                            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} className="mr-2" />}
                                            อัปเดตเกณฑ์
                                        </PremiumButton>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* MAINTENANCE TAB */}
                <TabsContent value="maintenance" className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="bg-card border border-border/10 rounded-[4rem] shadow-2xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border/5">
                                    <th className="px-10 py-8 text-sm font-black uppercase tracking-widest text-muted-foreground">รายการอะไหล่ / บริการ</th>
                                    <th className="px-8 py-8 text-sm font-black uppercase tracking-widest text-muted-foreground">ระยะมาตรฐาน (KM)</th>
                                    <th className="px-8 py-8 text-sm font-black uppercase tracking-widest text-muted-foreground">เวลามาตรฐาน (เดือน)</th>
                                    <th className="px-8 py-8 text-sm font-black uppercase tracking-widest text-muted-foreground">เตือนก่อนถึง (KM)</th>
                                    <th className="px-8 py-8 text-sm font-black uppercase tracking-widest text-muted-foreground text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {maintData.map((std, idx) => (
                                    <tr key={idx} className="group hover:bg-primary/[0.02] transition-colors">
                                        <td className="px-10 py-6">
                                            <Input 
                                                value={std.Component_Name}
                                                onChange={(e) => updateMaint(idx, 'Component_Name', e.target.value)}
                                                className="bg-transparent border-none text-xl font-black uppercase tracking-tighter h-12 focus:bg-muted/50"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <Input 
                                                type="number"
                                                value={std.Standard_KM || ""}
                                                onChange={(e) => updateMaint(idx, 'Standard_KM', e.target.value)}
                                                placeholder="N/A"
                                                className="bg-muted/30 border-none text-xl font-black text-center h-12 rounded-xl focus:ring-primary/30"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <Input 
                                                type="number"
                                                value={std.Standard_Months || ""}
                                                onChange={(e) => updateMaint(idx, 'Standard_Months', e.target.value)}
                                                placeholder="N/A"
                                                className="bg-muted/30 border-none text-xl font-black text-center h-12 rounded-xl focus:ring-primary/30"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <Input 
                                                type="number"
                                                value={std.Alert_Before_KM}
                                                onChange={(e) => updateMaint(idx, 'Alert_Before_KM', e.target.value)}
                                                className="bg-muted/30 border-none text-xl font-black text-center h-12 rounded-xl focus:ring-primary/30 text-primary"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" onClick={() => handleSaveMaint(idx)} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg">
                                                    <Save size={18} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={async () => {
                                                        if (confirm("ยืนยันการลบรายการนี้?")) {
                                                            const result = await deleteMaintenanceStandard(std.Component_Name)
                                                            if (result.success) {
                                                                toast.success("ลบรายการเรียบร้อย")
                                                                setMaintData(maintData.filter((_, i) => i !== idx))
                                                            }
                                                        }
                                                    }}
                                                    className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="p-10 bg-muted/30 flex justify-between items-center">
                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                <Info size={16} /> รายการเหล่านี้จะใช้ในการแจ้งเตือน Predictive Maintenance ในเมนู Mobile ของคนขับ
                            </p>
                            <button 
                                type="button"
                                onClick={addMaintRow}
                                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] transition-all"
                            >
                                <Plus size={20} strokeWidth={3} /> เพิ่มรายการเกณฑ์
                            </button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Recommendation Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 p-10 bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                        <Activity size={160} />
                    </div>
                    <h3 className="text-3xl font-black text-foreground mb-4 uppercase tracking-tighter">การทำงานของระบบวิเคราะห์</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-xl">
                        เมื่อแอดมินหรือคนขับบันทึกข้อมูล "เติมน้ำมัน" หรือ "ซ่อมบำรุง" ระบบจะนำข้อมูลไปเทียบกับเกณฑ์ด้านบนทันที 
                        หากพบว่ามีการใช้ทรัพยากรสูงกว่าเกณฑ์ที่ตั้งไว้ หรือ อะไหล่หมดอายุก่อนกำหนด ระบบจะสร้าง **Intelligence Alert** ให้แอดมินตรวจสอบทันที
                    </p>
                    <div className="flex items-center gap-4 text-primary font-black uppercase tracking-widest">
                        <span>ดูแดชบอร์ดความเสี่ยง</span>
                        <ArrowRight size={20} />
                    </div>
                </div>

                <div className="p-10 bg-card border border-border/10 rounded-[3rem] shadow-2xl flex flex-col justify-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                            <AlertTriangle size={24} />
                        </div>
                        <h4 className="text-xl font-black text-foreground uppercase tracking-tight">เกณฑ์ที่แนะนำ (Industry Standard)</h4>
                    </div>
                    <ul className="space-y-4">
                        <li className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold uppercase tracking-widest">ยางรถบรรทุก</span>
                            <span className="text-foreground font-black">50,000 - 80,000 KM</span>
                        </li>
                        <li className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold uppercase tracking-widest">น้ำมันเครื่องสังเคราะห์</span>
                            <span className="text-foreground font-black">10,000 - 15,000 KM</span>
                        </li>
                        <li className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-bold uppercase tracking-widest">แบตเตอรี่</span>
                            <span className="text-foreground font-black">18 - 24 เดือน</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
