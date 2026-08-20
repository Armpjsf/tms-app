"use client"

/**
 * FreightFactorsCard — manage the per-vehicle-type freight emission factors
 * (kgCO2e per km at rated full load) that the carbon calculation actually uses.
 * Edits here take effect within ~1 minute (server cache TTL). Values seeded from
 * TGO CFP Update 6 (April 2026); admin can revise when อบก. publishes new numbers.
 */

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Truck, Plus, Trash2, Loader2, Save, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    upsertFreightFactor,
    deleteFreightFactor,
    type FreightFactorItem,
} from "@/lib/actions/carbon-factors"

type Draft = Partial<FreightFactorItem>

export function FreightFactorsCard({ initialList }: { initialList: FreightFactorItem[] }) {
    const [list, setList] = useState<FreightFactorItem[]>(initialList)
    const [draft, setDraft] = useState<Draft | null>(null)
    const [pending, start] = useTransition()

    const refreshRow = (item: FreightFactorItem) =>
        setList(prev => {
            const i = prev.findIndex(x => x.id === item.id)
            if (i === -1) return [...prev, item]
            const copy = [...prev]; copy[i] = item; return copy
        })

    const save = () => {
        if (!draft?.vehicle_type?.trim()) { toast.error("ระบุประเภทรถ"); return }
        const payload = Number(draft.payload_tonnes) || null
        const ef = Number(draft.ef_tkm) || null
        // co2_per_km = payload × ef when both given, else use typed co2_per_km.
        const co2 = payload && ef ? Number((payload * ef).toFixed(4)) : Number(draft.co2_per_km)
        if (!co2 || co2 <= 0) { toast.error("ต้องมีค่า CO₂/km (หรือกรอกน้ำหนัก+EF ให้คำนวณ)"); return }
        start(async () => {
            const res = await upsertFreightFactor({
                id: draft.id,
                vehicle_type: draft.vehicle_type!.trim(),
                payload_tonnes: payload,
                ef_tkm: ef,
                co2_per_km: co2,
                mode: draft.mode || "normal",
                notes: draft.notes,
            })
            if (res.success) {
                toast.success(res.message || "บันทึกแล้ว")
                setDraft(null)
                // Optimistic: reflect the change locally.
                refreshRow({
                    id: draft.id || crypto.randomUUID(),
                    vehicle_type: draft.vehicle_type!.trim(),
                    payload_tonnes: payload, ef_tkm: ef, co2_per_km: co2,
                    mode: draft.mode || "normal",
                    effective_date: draft.effective_date || new Date().toISOString().slice(0, 10),
                    notes: draft.notes || "", is_active: true,
                })
            } else toast.error(res.message || "บันทึกไม่สำเร็จ")
        })
    }

    const remove = (id: string) => start(async () => {
        const res = await deleteFreightFactor(id)
        if (res.success) { setList(prev => prev.filter(x => x.id !== id)); toast.success("ลบแล้ว") }
        else toast.error(res.message || "ลบไม่สำเร็จ")
    })

    return (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-emerald-500" />
                    <div>
                        <h3 className="font-black text-lg">EF ขนส่งต่อชนิดรถ (kgCO₂e/กม.)</h3>
                        <p className="text-xs text-muted-foreground">รถเต็มพิกัด · TGO tonne-km · แก้แล้วมีผลกับการคำนวณจริงภายใน ~1 นาที</p>
                    </div>
                </div>
                <Button type="button" size="sm" onClick={() => setDraft({ mode: "normal" })} className="gap-1.5">
                    <Plus className="w-4 h-4" /> เพิ่ม
                </Button>
            </div>

            {/* Add/edit form */}
            {draft && (
                <div className="p-4 rounded-xl border border-border bg-background/60 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <label className="text-xs font-bold col-span-2 md:col-span-1">ประเภทรถ
                        <Input value={draft.vehicle_type || ""} onChange={e => setDraft({ ...draft, vehicle_type: e.target.value })} placeholder="10-Wheel" className="h-10 mt-1" />
                    </label>
                    <label className="text-xs font-bold">พิกัด (ตัน)
                        <Input type="number" step="any" value={draft.payload_tonnes ?? ""} onChange={e => setDraft({ ...draft, payload_tonnes: e.target.value === "" ? null : Number(e.target.value) })} placeholder="16" className="h-10 mt-1" />
                    </label>
                    <label className="text-xs font-bold">EF (/tkm)
                        <Input type="number" step="any" value={draft.ef_tkm ?? ""} onChange={e => setDraft({ ...draft, ef_tkm: e.target.value === "" ? null : Number(e.target.value) })} placeholder="0.0454" className="h-10 mt-1" />
                    </label>
                    <label className="text-xs font-bold">CO₂/km
                        <Input type="number" step="any" value={draft.payload_tonnes && draft.ef_tkm ? (Number(draft.payload_tonnes) * Number(draft.ef_tkm)).toFixed(4) : (draft.co2_per_km ?? "")} onChange={e => setDraft({ ...draft, co2_per_km: Number(e.target.value) })} placeholder="0.7264" className="h-10 mt-1" />
                    </label>
                    <div className="col-span-2 md:col-span-1 flex gap-2">
                        <Button type="button" onClick={save} disabled={pending} className="flex-1 gap-1.5">
                            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setDraft(null)}>ยกเลิก</Button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-2">
                {list.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีค่า EF ขนส่ง — ระบบจะใช้ค่า default ในโค้ด</p>
                )}
                {list.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/40">
                        <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{item.vehicle_type}
                                <span className="ml-2 text-emerald-600 font-black">{item.co2_per_km} <span className="text-[10px] font-normal text-muted-foreground">kgCO₂e/km</span></span>
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {item.payload_tonnes ? `${item.payload_tonnes} ต. × ${item.ef_tkm}/tkm` : "กำหนดเอง"} · {item.mode === "rough" ? "สมบุกสมบัน" : "วิ่งปกติ"}{item.notes ? ` · ${item.notes}` : ""}
                            </p>
                        </div>
                        <button type="button" onClick={() => setDraft(item)} className="text-xs font-bold px-2 py-1 rounded-lg text-primary hover:bg-primary/10">แก้ไข</button>
                        <button type="button" onClick={() => remove(item.id)} className={cn("p-2 rounded-lg text-destructive hover:bg-destructive/10")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
        </div>
    )
}
