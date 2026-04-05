
"use client"

import { useState, useEffect } from "react"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Plus, 
    Trash2, 
    Save, 
    Fuel, 
    Navigation,
    Loader2,
    ChevronRight,
    AlertCircle
} from "lucide-react"
import { getCustomerMatrices, saveCustomerMatrix, deleteCustomerMatrix } from "@/lib/actions/fuel-actions"
import { getAllRoutes } from "@/lib/supabase/routes"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface MatrixRow {
    min: number
    max: number
    price: number
}

interface CustomerFuelMatrixProps {
    customerId: string
    customerName: string
}

export function CustomerFuelMatrix({ customerId, customerName }: CustomerFuelMatrixProps) {
    const [matrices, setMatrices] = useState<any[]>([])
    const [routes, setRoutes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeRoute, setActiveRoute] = useState<string>("")
    const [currentMatrix, setCurrentMatrix] = useState<MatrixRow[]>([])

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const [matrixData, routesData] = await Promise.all([
                getCustomerMatrices(customerId),
                getAllRoutes()
            ])
            setMatrices(matrixData)
            setRoutes(routesData.data)
            setLoading(false)
        }
        loadData()
    }, [customerId])

    const handleSelectRoute = (routeName: string) => {
        setActiveRoute(routeName)
        const existing = matrices.find(m => m.Route_Name === routeName)
        if (existing) {
            setCurrentMatrix(existing.Fuel_Rate_Matrix)
        } else {
            setCurrentMatrix([{ min: 0, max: 0, price: 0 }])
        }
    }

    const addRow = () => {
        const lastRow = currentMatrix[currentMatrix.length - 1]
        setCurrentMatrix([...currentMatrix, { 
            min: lastRow ? lastRow.max + 0.01 : 0, 
            max: lastRow ? lastRow.max + 3 : 0, 
            price: 0 
        }])
    }

    const removeRow = (index: number) => {
        setCurrentMatrix(currentMatrix.filter((_, i) => i !== index))
    }

    const updateRow = (index: number, field: keyof MatrixRow, value: number) => {
        const next = [...currentMatrix]
        next[index] = { ...next[index], [field]: value }
        setCurrentMatrix(next)
    }

    const handleSave = async () => {
        if (!activeRoute) return toast.error("กรุณาเลือกเส้นทาง")
        if (currentMatrix.length === 0) return toast.error("กรุณาเพิ่มอย่างน้อย 1 แถว")

        setSaving(true)
        const result = await saveCustomerMatrix(customerId, activeRoute, currentMatrix)
        if (result.success) {
            toast.success("บันทึกเรทราคาน้ำมันเรียบร้อย")
            // Refresh local matrices
            const updated = await getCustomerMatrices(customerId)
            setMatrices(updated)
        } else {
            toast.error("เกิดข้อผิดพลาด: " + result.error)
        }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("ยืนยันการลบ Matrix นี้?")) return
        const result = await deleteCustomerMatrix(id)
        if (result.success) {
            toast.success("ลบเรียบร้อย")
            setMatrices(matrices.filter(m => m.ID !== id))
            if (activeRoute && matrices.find(m => m.ID === id)?.Route_Name === activeRoute) {
                setActiveRoute("")
                setCurrentMatrix([])
            }
        }
    }

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-muted-foreground font-black uppercase tracking-widest">กำลังโหลดข้อมูลเรทราคา...</p>
        </div>
    )

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
            {/* Sidebar: Routes List */}
            <div className="lg:col-span-1 space-y-4">
                <div className="p-6 bg-card border border-border/10 rounded-[2rem] shadow-xl">
                    <h3 className="text-xl font-black text-foreground mb-6 uppercase tracking-tighter flex items-center gap-3">
                        <Navigation className="text-primary" size={20} />
                        เส้นทาง (Routes)
                    </h3>
                    
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {routes.map((route) => {
                            const hasMatrix = matrices.some(m => m.Route_Name === route.Route_Name)
                            return (
                                <button
                                    key={route.Route_Name}
                                    onClick={() => handleSelectRoute(route.Route_Name)}
                                    className={cn(
                                        "w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group",
                                        activeRoute === route.Route_Name 
                                            ? "bg-primary border-primary text-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                                            : "bg-muted/30 border-border/5 text-muted-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-black text-lg tracking-tight uppercase">{route.Route_Name}</span>
                                        {hasMatrix && (
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                activeRoute === route.Route_Name ? "text-foreground/70" : "text-emerald-500"
                                            )}>✓ Matrix Configured</span>
                                        )}
                                    </div>
                                    <ChevronRight size={16} className={cn(
                                        "transition-transform",
                                        activeRoute === route.Route_Name ? "rotate-90" : "group-hover:translate-x-1"
                                    )} />
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Main: Matrix Editor */}
            <div className="lg:col-span-2">
                {activeRoute ? (
                    <div className="p-8 bg-card border border-border/10 rounded-[3rem] shadow-2xl relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <p className="text-primary font-black text-sm uppercase tracking-[0.2em] mb-1">Fuel Price Escalator</p>
                                <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase">{activeRoute}</h3>
                            </div>
                            <PremiumButton onClick={handleSave} disabled={saving} className="rounded-2xl px-8 shadow-lg shadow-primary/20">
                                {saving ? <Loader2 size={20} className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
                                บันทึกเรทราคา
                            </PremiumButton>
                        </div>

                        <div className="flex-1 space-y-4 relative z-10">
                            <div className="grid grid-cols-12 gap-4 px-4 mb-2">
                                <div className="col-span-4 text-xs font-black text-muted-foreground uppercase tracking-widest">ช่วงราคาน้ำมันต่ำสุด (฿)</div>
                                <div className="col-span-4 text-xs font-black text-muted-foreground uppercase tracking-widest">ช่วงราคาน้ำมันสูงสุด (฿)</div>
                                <div className="col-span-3 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">ค่าขนส่ง (฿)</div>
                                <div className="col-span-1"></div>
                            </div>

                            {currentMatrix.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-muted/20 p-2 rounded-2xl border border-border/5 hover:bg-muted/40 transition-all">
                                    <div className="col-span-4">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={row.min}
                                            onChange={(e) => updateRow(idx, 'min', parseFloat(e.target.value))}
                                            className="bg-background/50 border-none h-12 font-black text-lg focus:ring-primary/30"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={row.max}
                                            onChange={(e) => updateRow(idx, 'max', parseFloat(e.target.value))}
                                            className="bg-background/50 border-none h-12 font-black text-lg focus:ring-primary/30"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            value={row.price}
                                            onChange={(e) => updateRow(idx, 'price', parseFloat(e.target.value))}
                                            className="bg-background/50 border-none h-12 font-black text-lg text-right text-primary focus:ring-primary/30"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-rose-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button 
                                onClick={addRow}
                                className="w-full py-4 border-2 border-dashed border-border/10 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3"
                            >
                                <Plus size={18} />
                                เพิ่มช่วงราคาใหม่
                            </button>
                        </div>

                        <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                            <div className="flex gap-4 items-start text-primary">
                                <AlertCircle className="shrink-0 mt-1" size={20} />
                                <div className="text-sm">
                                    <p className="font-black uppercase tracking-tight mb-1">คำแนะนำการตั้งค่า</p>
                                    <p className="opacity-70">ระบบจะใช้ราคาน้ำมัน Diesel B7 ใน กทม. ประจำวันที่วางแผนงาน มาเทียบกับช่วงราคาที่ตั้งไว้เพื่อแนะนำค่าขนส่งที่เหมาะสม</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-20 glass-panel border-dashed border-border/10 rounded-[3rem] opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                        <Fuel size={80} className="mb-8 text-primary group-hover:scale-110 transition-transform duration-1000" />
                        <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-4">ยังไม่ได้เลือกเส้นทาง</h3>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-base font-bold">โปรดเลือกเส้นทางจากแถบด้านซ้าย เพื่อจัดการ Matrix ราคาน้ำมัน</p>
                    </div>
                )}
            </div>
        </div>
    )
}
