"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, ChevronsUp, Check, Lock, ListOrdered, Loader2 } from "lucide-react"
import { reorderDrops } from "@/lib/actions/drop-actions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Dest = { name?: string; so_no?: string }

interface DropReorderProps {
    jobId: string
    destinations: Dest[]
    /** จำนวนดรอปที่ส่งแล้ว (นับจากลายเซ็น) — ล็อกส่วนหน้าไว้ */
    completedDrops: number
    /** true = อยู่ระหว่างส่ง POD ห้ามจัดลำดับชั่วคราว */
    locked?: boolean
    className?: string
}

export function DropReorder({ jobId, destinations, completedDrops, locked = false, className }: DropReorderProps) {
    const router = useRouter()
    // order = อาเรย์ของ index เดิม เรียงตามลำดับที่แสดง
    const [order, setOrder] = useState<number[]>(() => destinations.map((_, i) => i))
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)
    const pendingRef = useRef<number[] | null>(null)

    if (destinations.length < 2) return null

    const commit = async (next: number[]) => {
        setOrder(next)
        // ถ้ากำลังบันทึกอยู่ ให้จำลำดับล่าสุดไว้แล้วยิงต่อหลังเสร็จ
        if (savingRef.current) {
            pendingRef.current = next
            return
        }
        savingRef.current = true
        setSaving(true)
        let latest = next
        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const res = await reorderDrops(jobId, latest, completedDrops)
                if (!res.success) {
                    toast.error(res.message || "จัดลำดับไม่สำเร็จ")
                    router.refresh()
                    break
                }
                if (pendingRef.current) {
                    latest = pendingRef.current
                    pendingRef.current = null
                    continue
                }
                break
            }
        } finally {
            savingRef.current = false
            setSaving(false)
        }
    }

    // ดันจุดที่ตำแหน่ง pos ขึ้นเป็นจุดถัดไป (หัวแถวของส่วนที่ยังไม่ส่ง)
    const sendFirst = (pos: number) => {
        if (locked || pos <= completedDrops) return
        const next = [...order]
        const [item] = next.splice(pos, 1)
        next.splice(completedDrops, 0, item)
        commit(next)
    }

    // ขยับขึ้นทีละขั้น (ไม่ข้ามเข้าโซนที่ล็อก)
    const moveUp = (pos: number) => {
        if (locked || pos <= completedDrops) return
        const next = [...order]
        ;[next[pos - 1], next[pos]] = [next[pos], next[pos - 1]]
        commit(next)
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListOrdered size={18} className="text-primary" />
                    <span className="text-sm font-bold text-foreground">ลำดับการส่ง</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-2.5 py-0.5">
                    {saving ? (
                        <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> กำลังบันทึก</span>
                    ) : (
                        `ส่งแล้ว ${completedDrops} / ${destinations.length}`
                    )}
                </span>
            </div>

            <div className="space-y-2">
                {order.map((origIdx, pos) => {
                    const d = destinations[origIdx]
                    const done = pos < completedDrops
                    const isNext = pos === completedDrops
                    return (
                        <div
                            key={origIdx}
                            className={cn(
                                "flex items-center gap-2.5 rounded-2xl px-3 py-2.5 border transition-colors",
                                done && "bg-muted/40 border-border/40 opacity-60",
                                isNext && "bg-primary/5 border-primary/40 border-2",
                                !done && !isNext && "bg-card border-border"
                            )}
                        >
                            <div className={cn(
                                "w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold",
                                done ? "bg-emerald-500/15 text-emerald-600" :
                                isNext ? "bg-primary/15 text-primary" :
                                "bg-muted text-muted-foreground"
                            )}>
                                {done ? <Check size={15} /> : pos + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-medium truncate",
                                    done ? "text-muted-foreground line-through" : "text-foreground"
                                )}>
                                    {d?.name || `จุดส่งที่ ${pos + 1}`}
                                </p>
                                {isNext && (
                                    <p className="text-[11px] text-primary font-semibold">จุดถัดไป · กำลังส่ง</p>
                                )}
                                {d?.so_no && !isNext && (
                                    <p className="text-[11px] text-muted-foreground truncate">SO: {d.so_no}</p>
                                )}
                            </div>

                            {done ? (
                                <Lock size={15} className="text-muted-foreground/60 shrink-0" />
                            ) : locked ? null : (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {pos > completedDrops && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => moveUp(pos)}
                                                aria-label="เลื่อนขึ้น"
                                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-background active:scale-90 transition-transform"
                                            >
                                                <ArrowUp size={17} className="text-foreground" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => sendFirst(pos)}
                                                className="h-9 px-2.5 flex items-center gap-1 rounded-xl border border-primary/40 text-primary text-xs font-semibold active:scale-90 transition-transform"
                                            >
                                                <ChevronsUp size={15} /> ส่งก่อน
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                <Lock size={11} /> จุดที่ส่งแล้วถูกล็อก · จัดใหม่ได้เฉพาะจุดที่เหลือ
            </p>
        </div>
    )
}
