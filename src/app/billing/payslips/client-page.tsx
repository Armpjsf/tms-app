"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  uploadPayslipWorkbook,
  confirmPayslips,
  deletePayslipBatch,
  type SheetPreview,
  type UploadResult,
} from "@/lib/actions/payslip-actions"
import type { DriverLite } from "@/lib/payslip/match"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

interface Row extends SheetPreview {
  selected: boolean
  driverId: string
}

export default function PayslipsClient({ initialList }: { initialList: Record<string, unknown>[] }) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsed, setParsed] = useState<UploadResult | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [drivers, setDrivers] = useState<DriverLite[]>([])
  const [title, setTitle] = useState("")
  const [period, setPeriod] = useState("")
  const [branch, setBranch] = useState("")

  // จัดกลุ่มรายการที่อัปแล้วตาม batch
  const batches = useMemo(() => {
    const map = new Map<string, { title: string; period: string; file: string; date: string; count: number; batchId: string }>()
    for (const r of initialList) {
      const m = r as Record<string, unknown>
      const bid = String(m.batch_id || m.id)
      const ex = map.get(bid)
      if (ex) ex.count++
      else
        map.set(bid, {
          batchId: bid,
          title: String(m.title || ""),
          period: String(m.period_label || ""),
          file: String(m.source_file || ""),
          date: m.uploaded_at ? new Date(String(m.uploaded_at)).toLocaleString("th-TH") : "",
          count: 1,
        })
    }
    return Array.from(map.values())
  }, [initialList])

  const handleFile = async (file: File) => {
    setUploading(true)
    setParsed(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await uploadPayslipWorkbook(fd)
      if (!res.ok) {
        toast.error(res.error || "อ่านไฟล์ไม่สำเร็จ")
        return
      }
      setParsed(res)
      setDrivers(res.drivers || [])
      setTitle(res.defaults?.title || "")
      setPeriod(res.defaults?.period || "")
      setBranch(res.defaults?.branch || "")
      setRows(
        (res.sheets || []).map((s) => ({
          ...s,
          selected: s.isDriverSheet,
          driverId: s.suggestedDriverId || "",
        }))
      )
      const matched = (res.sheets || []).filter((s) => s.isDriverSheet && s.suggestedDriverId).length
      const totalDriverSheets = (res.sheets || []).filter((s) => s.isDriverSheet).length
      toast.success(`พบ ${totalDriverSheets} แผ่นคนขับ · จับคู่อัตโนมัติได้ ${matched}`)
    } catch {
      toast.error("เกิดข้อผิดพลาดขณะอัปโหลด")
    } finally {
      setUploading(false)
    }
  }

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const handleConfirm = async () => {
    if (!parsed?.batchId || !parsed.sourcePath) return
    const mappings = rows
      .filter((r) => r.selected && r.driverId)
      .map((r) => ({ sheetName: r.sheetName, driverId: r.driverId }))
    if (mappings.length === 0) {
      toast.error("กรุณาเลือกและจับคู่คนขับอย่างน้อย 1 รายการ")
      return
    }
    // กันจับคู่คนขับซ้ำ
    const seen = new Set<string>()
    for (const m of mappings) {
      if (seen.has(m.driverId)) {
        const d = drivers.find((x) => x.id === m.driverId)
        toast.error(`คนขับ "${d?.name || m.driverId}" ถูกจับคู่มากกว่า 1 แผ่น`)
        return
      }
      seen.add(m.driverId)
    }

    // เตือนชัดๆ ก่อนข้ามคนที่จับคู่ไม่ได้
    if (unmatched.length > 0) {
      const names = unmatched.map((r) => `• ${r.sheetName}`).join("\n")
      const proceed = confirm(
        `มี ${unmatched.length} แผ่นที่จับคู่คนขับไม่ได้ (ไม่มีในระบบ) จะถูกข้าม ไม่บันทึก:\n\n${names}\n\n` +
          `บันทึกเฉพาะ ${mappings.length} รายการที่จับคู่แล้วต่อไปหรือไม่?`
      )
      if (!proceed) return
    }

    setSaving(true)
    try {
      const res = await confirmPayslips({
        batchId: parsed.batchId,
        sourcePath: parsed.sourcePath,
        fileName: parsed.fileName || "",
        title,
        period,
        branch,
        mappings,
      })
      if (!res.ok) {
        toast.error(res.error || "บันทึกไม่สำเร็จ")
        return
      }
      toast.success(
        `บันทึกสำเร็จ ${res.created} รายการ` +
          (unmatched.length > 0 ? ` · ข้าม ${unmatched.length} แผ่น (ไม่มีในระบบ)` : "")
      )
      setParsed(null)
      setRows([])
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm("ลบชุดสลิปนี้ทั้งหมด? คนขับจะไม่เห็นอีก")) return
    const res = await deletePayslipBatch(batchId)
    if (res.ok) {
      toast.success("ลบแล้ว")
      router.refresh()
    } else toast.error(res.error || "ลบไม่สำเร็จ")
  }

  const selectedCount = rows.filter((r) => r.selected && r.driverId).length
  // แผ่นที่เป็นคนขับแต่จับคู่ไม่ได้ (ไม่มีในระบบ) — จะถูกข้าม
  const unmatched = rows.filter((r) => r.isDriverSheet && !r.driverId)

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="text-indigo-600" /> ใบสรุปจ่ายรถ
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          อัปโหลดไฟล์ Excel รวม (1 แผ่นงาน = 1 คนขับ) ระบบจะแยกให้คนขับเปิดดู/โหลดในแอปได้เอง
        </p>
      </div>

      {/* Upload */}
      {!parsed && (
        <Card>
          <CardContent className="p-6">
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl py-10 cursor-pointer hover:border-indigo-400 transition-colors">
              {uploading ? (
                <>
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                  <span className="text-muted-foreground">กำลังอ่านไฟล์…</span>
                </>
              ) : (
                <>
                  <Upload className="text-indigo-500" size={32} />
                  <span className="font-medium">เลือกไฟล์ Excel (.xlsx)</span>
                  <span className="text-xs text-muted-foreground">
                    ไฟล์ควรเป็นค่านิ่งแล้ว (ไม่มีสูตรลิงก์ข้ามไฟล์)
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".xlsx,.xlsm"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ""
                }}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Mapping */}
      {parsed && (
        <Card>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">หัวเรื่อง</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="รถร่วม 1-15 ก.ค. 69" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">งวด</label>
                <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="1-15.7.69" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">สาขา</label>
                <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="มหาชัย" />
              </div>
            </div>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Users size={16} /> จับคู่แผ่นงานกับคนขับ ({selectedCount} รายการพร้อมบันทึก)
            </div>

            {unmatched.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm p-3">
                ⚠️ มี {unmatched.length} แผ่นที่เป็นคนขับแต่ <b>ไม่มีในระบบ</b> (จับคู่ไม่ได้) —
                รายการเหล่านี้จะ <b>ถูกข้าม ไม่บันทึก</b>: {unmatched.map((r) => r.sheetName).join(", ")}
                <div className="text-xs mt-1 text-amber-700">
                  หากต้องการส่งให้คนเหล่านี้ ต้องเพิ่มคนขับใน &ldquo;คนขับ&rdquo; ก่อน แล้วอัปโหลดใหม่
                </div>
              </div>
            )}

            <div className="border rounded-xl overflow-hidden divide-y max-h-[420px] overflow-y-auto">
              {rows.map((r, i) => (
                <div
                  key={r.sheetName + i}
                  className={`flex items-center gap-3 p-3 ${!r.isDriverSheet ? "bg-gray-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={(e) => updateRow(i, { selected: e.target.checked })}
                    className="w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {r.sheetName}
                      {!r.isDriverSheet && (
                        <span className="ml-2 text-xs text-amber-600">(ไม่ใช่แผ่นคนขับ?)</span>
                      )}
                      {r.isDriverSheet && !r.driverId && (
                        <span className="ml-2 text-xs font-semibold text-rose-600">จับคู่ไม่ได้ – จะถูกข้าม</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.rowCount} แถว
                      {typeof r.total === "number" ? ` · ยอด ~฿${r.total.toLocaleString()}` : ""}
                    </p>
                  </div>
                  <select
                    value={r.driverId}
                    onChange={(e) => updateRow(i, { driverId: e.target.value, selected: true })}
                    className="border rounded-lg px-2 py-1.5 text-sm max-w-[45%] bg-background"
                  >
                    <option value="">— เลือกคนขับ —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setParsed(null)} disabled={saving}>
                ยกเลิก
              </Button>
              <Button onClick={handleConfirm} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                บันทึก {selectedCount} รายการ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing batches */}
      <div>
        <h2 className="font-semibold mb-2">ประวัติการอัปโหลด</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-2">
            {batches.map((b) => (
              <Card key={b.batchId}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{b.title || b.file}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.period ? `งวด ${b.period} · ` : ""}
                      {b.count} คนขับ · {b.date}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 shrink-0"
                    onClick={() => handleDeleteBatch(b.batchId)}
                  >
                    <Trash2 size={16} /> ลบ
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
