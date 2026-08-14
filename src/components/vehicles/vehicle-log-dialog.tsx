"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { FileText, Paperclip, Loader2, History, Download } from "lucide-react"
import * as XLSX from "xlsx"
import type { Vehicle } from "@/lib/supabase/vehicles"
import {
    renewVehicleDocument, getVehicleRenewals,
    addTireLog, getTireLogs, getTireSummary, getVehicleCostSummary,
    type TireSummary, type VehicleCostSummary,
} from "@/app/vehicles/fleet-log-actions"

const DOC_LABELS: Record<string, string> = {
    tax: 'ภาษีรถ', insurance: 'ประกันภัย', act: 'พ.ร.บ.', cargo: 'ประกันสินค้า',
}
const TIRE_ACTION_LABELS: Record<string, string> = {
    change: 'เปลี่ยน', patch: 'ปะ', rotate: 'สลับ',
}
const today = () => new Date().toISOString().slice(0, 10)

export function VehicleLogDialog({ vehicle, open, onOpenChange }: {
    vehicle: Vehicle
    open: boolean
    onOpenChange: (v: boolean) => void
}) {
    const router = useRouter()
    const plate = vehicle.Vehicle_Plate
    const [loading, setLoading] = useState(false)
    const [renewals, setRenewals] = useState<Record<string, unknown>[]>([])
    const [tires, setTires] = useState<Record<string, unknown>[]>([])
    const [tireSummary, setTireSummary] = useState<TireSummary | null>(null)
    const [cost, setCost] = useState<VehicleCostSummary | null>(null)

    const refreshHistory = useCallback(async () => {
        const [r, t, s, c] = await Promise.all([
            getVehicleRenewals(plate), getTireLogs(plate), getTireSummary(plate), getVehicleCostSummary(plate),
        ])
        setRenewals(r as Record<string, unknown>[])
        setTires(t as Record<string, unknown>[])
        setTireSummary(s)
        setCost(c)
    }, [plate])

    const exportExcel = () => {
        const wb = XLSX.utils.book_new()
        // Sheet 1: cost summary
        if (cost) {
            const summaryRows = [
                { รายการ: 'ค่าน้ำมันสะสม', จำนวน: cost.fuelCost },
                { รายการ: 'ลิตรสะสม', จำนวน: cost.fuelLiters },
                { รายการ: 'อัตราน้ำมัน (กม./ลิตร)', จำนวน: cost.kmPerLiter ?? '-' },
                { รายการ: 'ค่าซ่อมสะสม', จำนวน: cost.repairCost },
                { รายการ: 'ค่ายางสะสม', จำนวน: cost.tireCost },
                { รายการ: 'ต้นทุนรวม', จำนวน: cost.totalCost },
            ]
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'ต้นทุนรวม')
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cost.monthlyFuel.map(m => ({ เดือน: m.month, ค่าน้ำมัน: m.cost, ลิตร: m.liters }))), 'น้ำมันรายเดือน')
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(renewals), 'ประวัติการต่อเอกสาร')
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tires), 'ประวัติยาง')
        XLSX.writeFile(wb, `vehicle_${plate}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    useEffect(() => { if (open) refreshHistory() }, [open, refreshHistory])

    const submit = async (fd: FormData, fn: (f: FormData) => Promise<{ success: boolean; error?: string }>, form?: HTMLFormElement) => {
        fd.set('plate', plate)
        setLoading(true)
        try {
            const res = await fn(fd)
            if (res.success) {
                toast.success('บันทึกเรียบร้อย')
                form?.reset()
                await refreshHistory()
                router.refresh()
            } else {
                toast.error('ผิดพลาด: ' + (res.error || ''))
            }
        } finally {
            setLoading(false)
        }
    }

    const fmtDate = (v: unknown) => (v ? String(v) : '-')
    const fmtNum = (v: unknown) => (v == null ? '-' : Number(v).toLocaleString())

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 overflow-hidden bg-card border-border">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <FileText size={18} className="text-primary" /> เอกสาร & ยาง — {plate}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <Tabs defaultValue="doc" className="w-full">
                        <TabsList className="grid grid-cols-4 w-full mb-4">
                            <TabsTrigger value="doc">ต่อเอกสาร</TabsTrigger>
                            <TabsTrigger value="tire">ยาง</TabsTrigger>
                            <TabsTrigger value="summary">สรุปยาง</TabsTrigger>
                            <TabsTrigger value="cost">ต้นทุน</TabsTrigger>
                        </TabsList>

                        {/* ── Document renewal ── */}
                        <TabsContent value="doc" className="space-y-4">
                            <form
                                onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget), renewVehicleDocument, e.currentTarget) }}
                                className="space-y-3 p-4 rounded-xl border border-border bg-muted/20"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">ประเภทเอกสาร</Label>
                                        <select name="doc_type" required className="h-10 w-full rounded-md bg-background border border-border px-3 text-sm text-foreground">
                                            {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">วันหมดอายุใหม่</Label>
                                        <Input name="new_expiry" type="date" required className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">วันที่ต่อ</Label>
                                        <Input name="renewed_date" type="date" defaultValue={today()} className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">ค่าใช้จ่าย (บาท)</Label>
                                        <Input name="cost" type="number" step="any" placeholder="0" className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">ผู้ให้บริการ/นายหน้า</Label>
                                        <Input name="vendor" placeholder="เช่น นายหน้า ก." className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">แนบไฟล์</Label>
                                        <Input name="file" type="file" accept="image/*,application/pdf" className="h-10 bg-background border-border text-xs" />
                                    </div>
                                </div>
                                <Input name="note" placeholder="หมายเหตุ" className="h-10 bg-background border-border" />
                                <Button type="submit" disabled={loading} className="w-full">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'บันทึกการต่อ + อัปเดตวันหมดอายุ'}
                                </Button>
                            </form>

                            <HistoryList
                                title="ประวัติการต่อ"
                                rows={renewals}
                                render={(r) => `${DOC_LABELS[String(r.doc_type)] || r.doc_type} • ต่อ ${fmtDate(r.renewed_date)} → หมด ${fmtDate(r.new_expiry)}${r.cost ? ` • ${fmtNum(r.cost)}฿` : ''}${r.vendor ? ` • ${r.vendor}` : ''}`}
                            />
                        </TabsContent>

                        {/* ── Tire ── */}
                        <TabsContent value="tire" className="space-y-4">
                            <form
                                onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget), addTireLog, e.currentTarget) }}
                                className="space-y-3 p-4 rounded-xl border border-border bg-muted/20"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">การดำเนินการ</Label>
                                        <select name="action" required className="h-10 w-full rounded-md bg-background border border-border px-3 text-sm text-foreground">
                                            {Object.entries(TIRE_ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">ตำแหน่งยาง</Label>
                                        <Input name="position" placeholder="เช่น หน้าซ้าย, หลังขวา1, ทั้งหมด" className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">วันที่</Label>
                                        <Input name="service_date" type="date" defaultValue={today()} className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">เลขไมล์</Label>
                                        <Input name="odometer" type="number" defaultValue={vehicle.Current_Mileage ?? ''} className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">ยี่ห้อยาง</Label>
                                        <Input name="brand" placeholder="เช่น Bridgestone" className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">จำนวน (เส้น)</Label>
                                        <Input name="qty" type="number" placeholder="0" className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">ค่าใช้จ่าย (บาท)</Label>
                                        <Input name="cost" type="number" step="any" placeholder="0" className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">ไมล์ครบกำหนดเปลี่ยนถัดไป</Label>
                                        <Input name="next_change_mileage" type="number" placeholder="เช่น 180000" className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">ร้าน/อู่</Label>
                                        <Input name="vendor" placeholder="เช่น ร้านยาง ข." className="h-10 bg-background border-border" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">แนบไฟล์</Label>
                                        <Input name="file" type="file" accept="image/*,application/pdf" className="h-10 bg-background border-border text-xs" />
                                    </div>
                                </div>
                                <Input name="note" placeholder="หมายเหตุ" className="h-10 bg-background border-border" />
                                <Button type="submit" disabled={loading} className="w-full">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'บันทึกงานยาง'}
                                </Button>
                            </form>

                            <HistoryList
                                title="ประวัติยาง"
                                rows={tires}
                                render={(r) => `${TIRE_ACTION_LABELS[String(r.action)] || r.action}${r.position ? ` (${r.position})` : ''} • ${fmtDate(r.service_date)}${r.odometer ? ` • ${fmtNum(r.odometer)} กม.` : ''}${r.brand ? ` • ${r.brand}` : ''}${r.cost ? ` • ${fmtNum(r.cost)}฿` : ''}`}
                            />
                        </TabsContent>

                        {/* ── Tire summary ── */}
                        <TabsContent value="summary" className="space-y-4">
                            {!tireSummary || tireSummary.records === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-8 text-center">ยังไม่มีข้อมูลยาง — บันทึกงานยางในแท็บ &quot;ยาง&quot; ก่อน</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <SummaryStat label="เปลี่ยน / ปะ / สลับ" value={`${tireSummary.counts.change} / ${tireSummary.counts.patch} / ${tireSummary.counts.rotate}`} />
                                        <SummaryStat label="ค่ายางสะสม" value={`${tireSummary.totalCost.toLocaleString()} ฿`} />
                                        <SummaryStat label="ระยะที่มีข้อมูล" value={tireSummary.kmSpan > 0 ? `${tireSummary.kmSpan.toLocaleString()} กม.` : '-'} />
                                        <SummaryStat label="ต้นทุนยาง / กม." value={tireSummary.costPerKm != null ? `${tireSummary.costPerKm.toFixed(2)} ฿/กม.` : '-'} />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                            <History size={14} /> เฉลี่ยระยะเปลี่ยน — ต่อตำแหน่ง
                                        </div>
                                        {tireSummary.positions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic py-3 text-center">ยังไม่มีรายการ &quot;เปลี่ยน&quot;</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {tireSummary.positions.map((p, i) => (
                                                    <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 border border-border text-sm">
                                                        <span className="font-medium text-foreground truncate">{p.position}</span>
                                                        <span className="text-muted-foreground shrink-0 text-xs">
                                                            เปลี่ยน {p.changeCount} ครั้ง
                                                            {p.avgKmBetweenChanges != null
                                                                ? ` • เฉลี่ย ${p.avgKmBetweenChanges.toLocaleString()} กม./ครั้ง`
                                                                : ' • ยังคำนวณเฉลี่ยไม่ได้ (ต้องเปลี่ยน ≥2 ครั้ง)'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        {/* ── Combined cost (fuel + repair + tire) ── */}
                        <TabsContent value="cost" className="space-y-4">
                            <div className="flex justify-end">
                                <Button type="button" variant="outline" size="sm" onClick={exportExcel} className="gap-2">
                                    <Download size={14} /> Export Excel
                                </Button>
                            </div>
                            {!cost ? (
                                <p className="text-sm text-muted-foreground italic py-8 text-center">กำลังโหลด...</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <SummaryStat label="ค่าน้ำมันสะสม" value={`${cost.fuelCost.toLocaleString()} ฿`} />
                                        <SummaryStat label="อัตราน้ำมัน" value={cost.kmPerLiter != null ? `${cost.kmPerLiter.toFixed(2)} กม./ล.` : '-'} />
                                        <SummaryStat label="ค่าซ่อมสะสม" value={`${cost.repairCost.toLocaleString()} ฿`} />
                                        <SummaryStat label="ค่ายางสะสม" value={`${cost.tireCost.toLocaleString()} ฿`} />
                                    </div>
                                    <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 flex items-center justify-between">
                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wide">ต้นทุนรวม (น้ำมัน+ซ่อม+ยาง)</span>
                                        <span className="text-2xl font-black text-primary">{cost.totalCost.toLocaleString()} ฿</span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                            <History size={14} /> น้ำมันรายเดือน (12 เดือนล่าสุด)
                                        </div>
                                        <MonthlyFuelChart data={cost.monthlyFuel} />
                                    </div>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function MonthlyFuelChart({ data }: { data: { month: string; cost: number; liters: number }[] }) {
    const max = Math.max(1, ...data.map(d => d.cost))
    return (
        <div className="flex items-end justify-between gap-1 h-32 p-3 rounded-lg bg-muted/20 border border-border">
            {data.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.month}: ${d.cost.toLocaleString()} ฿ • ${d.liters.toLocaleString()} ล.`}>
                    <div className="w-full flex items-end justify-center h-full">
                        <div
                            className="w-full max-w-[18px] rounded-t bg-primary/70 group-hover:bg-primary transition-colors"
                            style={{ height: `${Math.round((d.cost / max) * 100)}%`, minHeight: d.cost > 0 ? 2 : 0 }}
                        />
                    </div>
                    <span className="text-[8px] text-muted-foreground">{d.month.slice(5)}</span>
                </div>
            ))}
        </div>
    )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
        </div>
    )
}

function HistoryList({ title, rows, render }: {
    title: string
    rows: Record<string, unknown>[]
    render: (r: Record<string, unknown>) => string
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                <History size={14} /> {title} ({rows.length})
            </div>
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">ยังไม่มีประวัติ</p>
            ) : (
                <div className="space-y-1.5">
                    {rows.map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 border border-border text-sm text-foreground">
                            <span className="truncate">{render(r)}</span>
                            {r.file_url ? (
                                <a href={String(r.file_url)} target="_blank" rel="noreferrer" className="text-primary shrink-0" title="เปิดไฟล์แนบ">
                                    <Paperclip size={14} />
                                </a>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
