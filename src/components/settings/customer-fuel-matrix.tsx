
"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Plus, 
    Trash2, 
    Fuel, 
    Navigation,
    Loader2,
    ChevronRight,
    AlertCircle,
    MapPin,
    ArrowRight
} from "lucide-react"
import { getCustomerMatrices, saveCustomerMatrix, deleteCustomerMatrix } from "@/lib/actions/fuel-actions"
import { getAllRoutes } from "@/lib/supabase/routes"
import { getCustomer } from "@/lib/supabase/customers"
import { getVehicleTypes } from "@/lib/actions/vehicle-type-actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MatrixRow {
    min: number
    max: number
    price: number
}

interface CustomerFuelMatrixProps {
    customerId: string
    customerName: string
}

export const CustomerFuelMatrix = forwardRef(({ customerId, customerName }: CustomerFuelMatrixProps, ref) => {
    const [matrices, setMatrices] = useState<any[]>([])
    const [routes, setRoutes] = useState<any[]>([])
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeRoute, setActiveRoute] = useState<string>("")
    const [activeVehicleType, setActiveVehicleType] = useState<string>("")
    const [currentMatrix, setCurrentMatrix] = useState<MatrixRow[]>([])
    const [customerBranch, setCustomerBranch] = useState<string | null>(null)
    
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                const customer = await getCustomer(customerId)
                const branchId = customer?.Branch_ID || null
                setCustomerBranch(branchId)

                const [matrixData, routesData, vehicleTypesData] = await Promise.all([
                    getCustomerMatrices(customerId),
                    getAllRoutes(undefined, undefined, undefined, branchId || undefined),
                    getVehicleTypes()
                ])
                
                setMatrices(matrixData)
                setRoutes(routesData.data || [])
                setVehicleTypes(vehicleTypesData || [])
            } catch (error) {
                console.error("Failed to load fuel matrix data:", error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [customerId])

    useImperativeHandle(ref, () => ({
        async handleSave() {
            if (!activeRoute || activeRoute === "none") return { success: true }; 
            if (!currentMatrix || currentMatrix.length === 0) return { success: true };

            setSaving(true)
            try {
                const result = await saveCustomerMatrix(customerId, activeRoute, activeVehicleType, currentMatrix)
                if (result.success) {
                    const updated = await getCustomerMatrices(customerId)
                    setMatrices(updated)
                    toast.success("บันทึกข้อมูลเรียบร้อยแล้ว")
                    setSaving(false)
                    return { success: true }
                } else {
                    setSaving(false)
                    toast.error("บันทึกล้มเหลว: " + result.error)
                    return { success: false, error: result.error }
                }
            } catch (err: any) {
                setSaving(false)
                toast.error("เกิดข้อผิดพลาดในการบันทึก")
                return { success: false, error: err.message }
            }
        }
    }));

    const handleSelectRoute = (routeName: string) => {
        if (routeName === "none") {
            setActiveRoute("")
            setActiveVehicleType("")
            setCurrentMatrix([])
            return
        }
        setActiveRoute(routeName)
        // Reset matrix if route changes
        setActiveVehicleType("")
        setCurrentMatrix([])
    }

    const handleSelectVehicleType = (vType: string) => {
        if (vType === "none") {
            setActiveVehicleType("")
            setCurrentMatrix([])
            return
        }
        setActiveVehicleType(vType)
        const existing = matrices.find(m => m.Route_Name === activeRoute && m.Vehicle_Type === vType)
        if (existing) {
            setCurrentMatrix(existing.Fuel_Rate_Matrix)
        } else {
            setCurrentMatrix([{ min: 0, max: 0, price: 0 }])
        }
    }

    const addRow = () => {
        const lastRow = currentMatrix[currentMatrix.length - 1]
        const nextMin = lastRow ? (isNaN(lastRow.max) ? 0 : Number((lastRow.max + 0.01).toFixed(2))) : 0
        setCurrentMatrix([...currentMatrix, { 
            min: nextMin, 
            max: Number((nextMin + 3).toFixed(2)), 
            price: lastRow ? lastRow.price : 0
        }])
    }

    const removeRow = (index: number) => {
        setCurrentMatrix(currentMatrix.filter((_, i) => i !== index))
    }

    const updateRow = (index: number, field: keyof MatrixRow, value: string) => {
        const next = [...currentMatrix]
        const numVal = parseFloat(value)
        const val = isNaN(numVal) ? 0 : numVal
        next[index] = { ...next[index], [field]: val }
        setCurrentMatrix(next)
    }

    const handleDeleteMatrix = async () => {
        const matrix = matrices.find(m => m.Route_Name === activeRoute && m.Vehicle_Type === activeVehicleType)
        if (!matrix) return
        if (!confirm(`ยืนยันการลบเรทราคาทั้งหมดของเส้นทาง ${activeRoute} [${activeVehicleType}]?`)) return
        
        setSaving(true)
        const result = await deleteCustomerMatrix(matrix.ID)
        if (result.success) {
            toast.success("ลบข้อมูลเรียบร้อย")
            setMatrices(matrices.filter(m => m.ID !== matrix.ID))
            setCurrentMatrix([{ min: 0, max: 0, price: 0 }])
        } else {
            toast.error("ลบข้อมูลล้มเหลว")
        }
        setSaving(false)
    }

    const selectedRouteData = routes.find(r => r.Route_Name === activeRoute)

    // Main Render with Single Return Path to avoid React Hook mismatch
    return (
        <div className="flex flex-col gap-10 min-h-[650px] w-full p-4 lg:p-4">
            {loading ? (
                <div className="p-20 flex-1 flex flex-col items-center justify-center gap-6 min-h-[500px]">
                    <div className="relative">
                        <Loader2 className="animate-spin text-primary" size={64} strokeWidth={1} />
                        <Fuel className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary opacity-50" size={24} />
                    </div>
                    <div className="text-center animate-pulse">
                        <p className="text-foreground font-black text-xl uppercase tracking-tighter">กำลังโหลดข้อมูลเรทราคา...</p>
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.3em] mt-1">กรุณารอสักครู่ (Branch Filter Active)</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header: Route Selection Dropdown */}
                    <div className="p-8 bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-primary/5 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3 ml-1">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-[10px] font-black text-primary">01</span>
                                    </div>
                                    <Label className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">เลือกเส้นทางขนส่งสำหรับลูกค้ารายนี้</Label>
                                </div>
                                
                                <Select value={activeRoute || "none"} onValueChange={handleSelectRoute}>
                                    <SelectTrigger className="w-full h-20 bg-muted/20 border-border/5 text-2xl font-black rounded-2xl px-8 uppercase tracking-tighter hover:bg-card hover:translate-y-[-2px] transition-all duration-300 shadow-inner group/trigger">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/trigger:scale-110 transition-transform">
                                                <Navigation size={20} strokeWidth={2.5} />
                                            </div>
                                            <SelectValue placeholder="ค้นหาและเลือกเส้นทาง..." />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border/10 max-h-[400px] rounded-2xl shadow-3xl p-2">
                                        <SelectItem value="none" className="font-bold text-muted-foreground py-4 rounded-xl opacity-50">-- เลือกเส้นทาง (สาขา: {customerBranch || 'ทั้งหมด'}) --</SelectItem>
                                        {routes.map(r => (
                                            <SelectItem key={r.Route_Name} value={r.Route_Name} className="py-4 focus:bg-primary/10 rounded-xl mb-1">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-lg uppercase tracking-tighter">{r.Route_Name}</span>
                                                            {matrices.some(m => m.Route_Name === r.Route_Name) && (
                                                                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-black uppercase rounded border border-green-500/20">Configured</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 flex items-center gap-1">
                                                            {r.Origin || '-'} <ChevronRight size={8} /> {r.Destination || '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {activeRoute && (
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3 ml-1">
                                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                                            <span className="text-[10px] font-black text-accent">02</span>
                                        </div>
                                        <Label className="text-accent font-black uppercase tracking-[0.3em] text-[10px]">เลือกประเภทรถสำหรับเรทราคานี้</Label>
                                    </div>
                                    
                                    <Select value={activeVehicleType || "none"} onValueChange={handleSelectVehicleType}>
                                        <SelectTrigger className="w-full h-20 bg-muted/20 border-border/5 text-2xl font-black rounded-2xl px-8 uppercase tracking-tighter hover:bg-card hover:translate-y-[-2px] transition-all duration-300 shadow-inner group/trigger">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover/trigger:scale-110 transition-transform">
                                                    <Navigation size={20} className="rotate-45" strokeWidth={2.5} />
                                                </div>
                                                <SelectValue placeholder="เลือกประเภทรถ..." />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border/10 max-h-[400px] rounded-2xl shadow-3xl p-2">
                                            <SelectItem value="none" className="font-bold text-muted-foreground py-4 rounded-xl opacity-50">-- เลือกประเภทรถ --</SelectItem>
                                            {vehicleTypes.map(v => (
                                                <SelectItem key={v.type_name} value={v.type_name} className="py-4 focus:bg-accent/10 rounded-xl mb-1">
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-lg uppercase tracking-tighter">{v.type_name}</span>
                                                                {matrices.some(m => m.Route_Name === activeRoute && m.Vehicle_Type === v.type_name) && (
                                                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-black uppercase rounded border border-green-500/20">Configured</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                                                {v.description || 'ไม่มีคำอธิบาย'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {activeRoute && activeVehicleType && (
                                <button 
                                    type="button"
                                    onClick={handleDeleteMatrix}
                                    disabled={!matrices.some(m => m.Route_Name === activeRoute && m.Vehicle_Type === activeVehicleType) || saving}
                                    className="h-20 px-6 rounded-2xl bg-rose-500/5 text-rose-500 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 flex items-center justify-center shadow-lg active:scale-95 self-end"
                                >
                                    <Trash2 size={24} strokeWidth={2} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Matrix Editor Area */}
                    {activeRoute && activeVehicleType ? (
                        <div className="flex-1 p-6 lg:p-10 bg-card/60 backdrop-blur-md border border-white/10 rounded-[3rem] shadow-3xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="absolute inset-x-0 top-0 h-[15rem] bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
                            
                            <div className="flex flex-col gap-10 relative z-10">
                                {/* Route Info Visualizer */}
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-black/10 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/30">
                                            <MapPin size={28} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1 opacity-70">ORIGIN</span>
                                            <span className="text-2xl font-black text-foreground uppercase tracking-tighter">{selectedRouteData?.Origin || 'N/A'}</span>
                                        </div>
                                    </div>
                                    
                                    <ChevronRight className="text-muted-foreground/20 hidden md:block" size={32} strokeWidth={1} />

                                    <div className="flex items-center gap-6 md:text-right">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-accent uppercase tracking-[0.3em] mb-1 opacity-70">DESTINATION</span>
                                            <span className="text-2xl font-black text-foreground uppercase tracking-tighter">{selectedRouteData?.Destination || 'N/A'}</span>
                                        </div>
                                        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent shadow-lg ring-1 ring-accent/30">
                                            <MapPin size={28} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>

                                {/* Matrix Content */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-12 gap-4 px-8 mb-2">
                                        <div className="col-span-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">เริ่มช่วงราคาน้ำมัน (฿)</div>
                                        <div className="col-span-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">จบช่วงราคาน้ำมัน (฿)</div>
                                        <div className="col-span-4 text-[9px] font-black text-primary uppercase tracking-[0.2em]">ค่าขนส่งสุทธิ (฿)</div>
                                    </div>

                                    <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar p-1">
                                        {currentMatrix.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-black/10 p-5 rounded-[1.5rem] border border-white/5 hover:bg-black/20 transition-all group/row relative">
                                                <div className="col-span-4">
                                                    <div className="relative">
                                                        <Fuel className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={18} />
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={isNaN(row.min) ? "" : row.min}
                                                            onChange={(e) => updateRow(idx, 'min', e.target.value)}
                                                            className="bg-background/20 border-border/5 h-14 pl-12 text-xl font-black rounded-xl focus:ring-primary/40 shadow-inner"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-4">
                                                    <div className="relative">
                                                        <ArrowRight className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={18} />
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={isNaN(row.max) ? "" : row.max}
                                                            onChange={(e) => updateRow(idx, 'max', e.target.value)}
                                                            className="bg-background/20 border-border/5 h-14 pl-12 text-xl font-black rounded-xl focus:ring-accent/40 shadow-inner"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <Input
                                                        type="number"
                                                        value={isNaN(row.price) ? "" : row.price}
                                                        onChange={(e) => updateRow(idx, 'price', e.target.value)}
                                                        className="bg-primary/5 border-primary/10 h-14 text-2xl font-black text-right text-primary rounded-xl pr-6"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeRow(idx)} 
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground/20 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <button 
                                            type="button"
                                            onClick={addRow}
                                            className="w-full py-8 border-2 border-dashed border-primary/10 rounded-[2rem] text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 mt-6 group"
                                        >
                                            <Plus size={18} strokeWidth={3} className="group-hover:scale-125 transition-transform" />
                                            เพิ่มช่วงราคาใหม่ (Add Range)
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex gap-4 items-center">
                                    <AlertCircle className="text-primary shrink-0 opacity-50" size={24} />
                                    <p className="text-xs text-muted-foreground font-medium">
                                        * ระบบจะเลือกราคาให้อัตโนมัติตามราคาน้ำมัน ณ วันที่วิ่งงาน โดยตรวจสอบจากช่วงราคาน้ำมันที่คุณกำหนดไว้ด้านบน
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20 glass-panel border-dashed border-border/10 rounded-[3rem] opacity-40 group hover:opacity-100 transition-all duration-700">
                            <div className="relative mb-8">
                                <Navigation size={60} className={cn("transition-all duration-700", !activeRoute ? "text-primary/20 group-hover:scale-110 group-hover:text-primary/40" : "text-accent/20 group-hover:scale-110 group-hover:text-accent/40 rotate-45")} />
                                {activeRoute && <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-card flex items-center justify-center text-[10px] text-white font-bold">✓</div>}
                            </div>
                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-2">
                                {!activeRoute ? "เลือกเส้นทางงาน" : "เลือกประเภทรถยนต์"}
                            </h3>
                            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] max-w-xs mx-auto opacity-50">
                                {!activeRoute 
                                    ? "โปรดเลือกเส้นทางด้านบนเพื่อจัดการราคาตามค่าน้ำมัน" 
                                    : `เส้นทาง ${activeRoute} พร้อมแล้ว โปรดระบุประเภทรถเพื่อกำหนดเรทราคา`}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
});

CustomerFuelMatrix.displayName = "CustomerFuelMatrix";
