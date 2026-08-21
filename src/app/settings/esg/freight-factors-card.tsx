"use client"

/**
 * FreightFactorsCard — manage the per-vehicle-type freight emission factors
 * (kgCO2e per km at rated full load) that the carbon calculation actually uses.
 * Edits here take effect within ~1 minute (server cache TTL). Values seeded from
 * TGO CFP Update 6 (April 2026); admin can revise when อบก. publishes new numbers.
 *
 * โหมดคำนวณ: auto เป็นค่าเริ่มต้น แต่พิมพ์ทับได้ทุกช่อง
 *   TTW = พิกัด × EF/tkm        (แก้ EF หรือ TTW ก็ sync กันสองทาง)
 *   WTT = TTW × 0.235           (auto; พิมพ์ทับได้ + ปุ่ม ↺ กลับ auto)
 *   WTW = TTW + WTT             (คำนวณให้ ดูอย่างเดียว)
 */

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Truck, Plus, Trash2, Loader2, Save, Leaf, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    upsertFreightFactor,
    deleteFreightFactor,
    type FreightFactorItem,
} from "@/lib/actions/carbon-factors"

type Draft = Partial<FreightFactorItem>

// สัดส่วน WTT/TTW ของดีเซล (WTT 0.60 / TTW 2.5504 ≈ 0.235) ใช้เป็นค่า auto เริ่มต้นของ WTT/km
const WTT_TTW_RATIO = 0.235
const r4 = (n: number) => Math.round(n * 10000) / 10000

export function FreightFactorsCard({ initialList }: { initialList: FreightFactorItem[] }) {
    const [list, setList] = useState<FreightFactorItem[]>(initialList)
    const [draft, setDraft] = useState<Draft | null>(null)
    const [wttAuto, setWttAuto] = useState(true) // WTT คิดอัตโนมัติจาก TTW (ปิดเมื่อผู้ใช้พิมพ์ทับ)
    const [pending, start] = useTransition()

    // ค่าปัจจุบันของฟอร์ม (ตัวเลขล้วน)
    const payload = Number(draft?.payload_tonnes) || 0
    const efTkm = Number(draft?.ef_tkm) || 0
    const ttw = Number(draft?.co2_per_km) || 0
    const wtt = wttAuto ? r4(ttw * WTT_TTW_RATIO) : (Number(draft?.wtt_per_km) || 0)
    const wtw = r4(ttw + wtt)

    // ── handlers: แก้ช่องไหนก็ sync ช่องอื่นให้อัตโนมัติ ──
    const patch = (p: Partial<Draft>) => setDraft(d => ({ ...(d || {}), ...p }))

    const onPayload = (v: string) => {
        const pl = v === "" ? null : Number(v)
        const ef = efTkm
        const newTtw = pl && ef ? r4(pl * ef) : ttw
        patch({ payload_tonnes: pl, co2_per_km: newTtw })
    }
    const onEf = (v: string) => {
        const ef = v === "" ? null : Number(v)
        const newTtw = payload && ef ? r4(payload * ef) : ttw
        patch({ ef_tkm: ef, co2_per_km: newTtw })
    }
    const onTtw = (v: string) => {
        const t = v === "" ? 0 : Number(v)
        // แก้ TTW → คำนวณ EF/tkm ย้อนกลับให้สอดคล้อง (ถ้ามีพิกัด)
        const newEf = payload > 0 ? r4(t / payload) : efTkm
        patch({ co2_per_km: t, ef_tkm: payload > 0 ? newEf : draft?.ef_tkm })
    }
    const onWtt = (v: string) => {
        setWttAuto(false) // พิมพ์ทับ = ปิด auto
        patch({ wtt_per_km: v === "" ? 0 : Number(v) })
    }
    const resetWttAuto = () => {
        setWttAuto(true)
        patch({ wtt_per_km: r4(ttw * WTT_TTW_RATIO) })
    }

    const openAdd = () => { setWttAuto(true); setDraft({ mode: "normal" }) }
    const openEdit = (item: FreightFactorItem) => {
        // มีค่า WTT เดิม → ถือว่าตั้งเอง (ไม่ auto); ไม่มี → auto
        setWttAuto(!(Number(item.wtt_per_km) > 0))
        setDraft({ ...item })
    }

    const refreshRow = (item: FreightFactorItem) =>
        setList(prev => {
            const i = prev.findIndex(x => x.id === item.id)
            if (i === -1) return [...prev, item]
            const copy = [...prev]; copy[i] = item; return copy
        })

    const save = () => {
        if (!draft?.vehicle_type?.trim()) { toast.error("ระบุประเภทรถ"); return }
        if (!ttw || ttw <= 0) { toast.error("ต้องมีค่า TTW/km (หรือกรอกพิกัด + EF ให้คำนวณ)"); return }
        const payloadOut = payload > 0 ? payload : null
        const efOut = efTkm > 0 ? efTkm : null
        const ttwOut = r4(ttw)
        const wttOut = r4(wtt)
        start(async () => {
            const res = await upsertFreightFactor({
                id: draft.id,
                vehicle_type: draft.vehicle_type!.trim(),
                payload_tonnes: payloadOut,
                ef_tkm: efOut,
                co2_per_km: ttwOut,
                wtt_per_km: wttOut,
                mode: draft.mode || "normal",
                notes: draft.notes,
            })
            if (res.success) {
                toast.success(res.message || "บันทึกแล้ว")
                setDraft(null)
                refreshRow({
                    id: draft.id || crypto.randomUUID(),
                    vehicle_type: draft.vehicle_type!.trim(),
                    payload_tonnes: payloadOut, ef_tkm: efOut, co2_per_km: ttwOut, wtt_per_km: wttOut,
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
                        <p className="text-xs text-muted-foreground">รถเต็มพิกัด · TGO tonne-km · auto: TTW=พิกัด×EF, WTT=TTW×0.235, WTW=TTW+WTT (พิมพ์ทับได้)</p>
                    </div>
                </div>
                <Button type="button" size="sm" onClick={openAdd} className="gap-1.5">
                    <Plus className="w-4 h-4" /> เพิ่ม
                </Button>
            </div>

            {/* Add/edit form */}
            {draft && (
                <div className="p-4 rounded-xl border border-border bg-background/60 grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
                    <label className="text-xs font-bold col-span-2 md:col-span-1">ประเภทรถ
                        <Input value={draft.vehicle_type || ""} onChange={e => patch({ vehicle_type: e.target.value })} placeholder="10-Wheel" className="h-10 mt-1" />
                    </label>
                    <label className="text-xs font-bold">พิกัด (ตัน)
                        <Input type="number" step="any" value={draft.payload_tonnes ?? ""} onChange={e => onPayload(e.target.value)} placeholder="16" className="h-10 mt-1" />
                    </label>
                    <label className="text-xs font-bold">EF (/tkm)
                        <Input type="number" step="any" value={draft.ef_tkm ?? ""} onChange={e => onEf(e.target.value)} placeholder="0.0454" className="h-10 mt-1" />
                    </label>
                    <label className="text-xs font-bold">TTW /km
                        <Input type="number" step="any" value={draft.co2_per_km ?? ""} onChange={e => onTtw(e.target.value)} placeholder="0.7264" className="h-10 mt-1" />
                    </label>
                    <label className="text-xs font-bold">
                        <span className="flex items-center justify-between">WTT /km
                            {!wttAuto && (
                                <button type="button" onClick={resetWttAuto} title="กลับเป็น auto (TTW×0.235)" className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline">
                                    <RotateCcw className="w-3 h-3" /> auto
                                </button>
                            )}
                            {wttAuto && <span className="text-[10px] text-emerald-600">auto</span>}
                        </span>
                        <Input type="number" step="any" value={wttAuto ? r4(ttw * WTT_TTW_RATIO) : (draft.wtt_per_km ?? "")} onChange={e => onWtt(e.target.value)} placeholder="0.1707" className={cn("h-10 mt-1", wttAuto && "text-muted-foreground")} />
                    </label>
                    <label className="text-xs font-bold">WTW /km
                        <div className="h-10 mt-1 flex items-center px-3 rounded-md border border-border bg-muted/40 font-mono font-black text-emerald-600">{wtw.toFixed(4)}</div>
                    </label>
                    <div className="col-span-2 md:col-span-7 flex gap-2 justify-end">
                        <Button type="button" variant="ghost" onClick={() => setDraft(null)}>ยกเลิก</Button>
                        <Button type="button" onClick={save} disabled={pending} className="gap-1.5">
                            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
                        </Button>
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
                                <span className="ml-2 text-emerald-600 font-black">{(Number(item.co2_per_km) + Number(item.wtt_per_km || 0)).toFixed(4)} <span className="text-[10px] font-normal text-muted-foreground">kgCO₂e/km (WTW)</span></span>
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                                TTW {item.co2_per_km} + WTT {item.wtt_per_km || 0} · {item.payload_tonnes ? `${item.payload_tonnes} ต. × ${item.ef_tkm}/tkm` : "กำหนดเอง"} · {item.mode === "rough" ? "สมบุกสมบัน" : "วิ่งปกติ"}{item.notes ? ` · ${item.notes}` : ""}
                            </p>
                        </div>
                        <button type="button" onClick={() => openEdit(item)} className="text-xs font-bold px-2 py-1 rounded-lg text-primary hover:bg-primary/10">แก้ไข</button>
                        <button type="button" onClick={() => remove(item.id)} className={cn("p-2 rounded-lg text-destructive hover:bg-destructive/10")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
        </div>
    )
}
