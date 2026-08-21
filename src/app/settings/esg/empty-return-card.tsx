"use client"

/**
 * EmptyReturnCard — ตั้งค่าสัดส่วนการปล่อยของเที่ยวกลับ (รถเปล่า) เทียบเที่ยวไป (เต็ม)
 * ตัวคูณการปล่อยไป-กลับ = 1 + ratio. อ้างอิง DEFRA 2025 all-HGV (empty/full ≈ 0.65).
 * แก้แล้วมีผลกับการคำนวณจริงภายใน ~1 นาที (server cache TTL).
 */

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Save, RefreshCw, Recycle } from "lucide-react"
import { upsertEmptyReturnRatio } from "@/lib/actions/carbon-factors"

export function EmptyReturnCard({ initialRatio }: { initialRatio: number }) {
    const [ratio, setRatio] = useState<string>(String(initialRatio))
    const [pending, start] = useTransition()

    const num = Number(ratio)
    const valid = Number.isFinite(num) && num >= 0 && num <= 1
    const factor = valid ? (1 + num).toFixed(2) : "—"

    const save = () => {
        if (!valid) { toast.error("ค่าต้องอยู่ระหว่าง 0–1"); return }
        start(async () => {
            const res = await upsertEmptyReturnRatio(num)
            if (res.success) toast.success(res.message || "บันทึกแล้ว")
            else toast.error(res.message || "บันทึกไม่สำเร็จ")
        })
    }

    return (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Recycle className="w-5 h-5 text-emerald-500" />
                <div>
                    <h3 className="font-black text-lg">สัดส่วนเที่ยวกลับรถเปล่า (Empty Return)</h3>
                    <p className="text-xs text-muted-foreground">
                        การปล่อยไป-กลับ = เที่ยวไป(เต็ม) + เที่ยวกลับ(เปล่า) · ตัวคูณ = 1 + ค่านี้ · แก้แล้วมีผลภายใน ~1 นาที
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <label className="text-xs font-bold col-span-1">สัดส่วน (0–1)
                    <Input
                        type="number" step="0.01" min="0" max="1"
                        value={ratio}
                        onChange={e => setRatio(e.target.value)}
                        placeholder="0.65"
                        className="h-10 mt-1"
                    />
                </label>
                <div className="text-xs font-bold">
                    ตัวคูณไป-กลับ
                    <div className="h-10 mt-1 flex items-center font-mono font-black text-emerald-600 text-base">×{factor}</div>
                </div>
                <Button type="button" onClick={save} disabled={pending || !valid} className="gap-1.5">
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
                </Button>
                <button
                    type="button"
                    onClick={() => setRatio("0.65")}
                    className="text-xs font-bold px-2 py-2 rounded-lg text-primary hover:bg-primary/10 inline-flex items-center gap-1 justify-center"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> ค่ามาตรฐาน 0.65
                </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
                📖 อ้างอิง: DEFRA 2025 UK GHG Conversion Factors — all-HGV ต่อ กม. empty (0% laden) 0.660 / full (100%) 1.012 → 0.660÷1.012 ≈ 0.65.
                ปรับได้ตามข้อมูลจริงของฟลีต (เช่น หากมักมีสินค้าขากลับ ค่าจะสูงขึ้น).
            </p>
        </div>
    )
}
