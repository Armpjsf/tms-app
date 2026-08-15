"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { ocrLoadDetail, type ResolvedLoadDetail } from "./actions"

export default function LoadDetailTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResolvedLoadDetail | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true); setResult(null)
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = reject
        r.readAsDataURL(file)
      })
      setPreview(base64)
      const res = await ocrLoadDetail(base64, file.type || "image/jpeg")
      setResult(res)
      if (res.drops.length === 0) toast.warning("อ่านไม่พบรายการดรอป — ลองรูปที่ชัดขึ้น")
      else toast.success(`อ่านได้ ${res.drops.length} ดรอป`)
    } catch (e) {
      console.error(e)
      toast.error("อ่านเอกสารไม่สำเร็จ (เช็ค GEMINI API key)")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="text-primary" /> ทดสอบอ่านใบจัดสาย (Load Detail OCR)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">อัปรูปใบจัดสาย → ระบบอ่าน + จับคู่รหัสลูกค้ากับสถานที่ที่มี (ยังไม่สร้างงาน)</p>
        </div>

        <label className="flex items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-border bg-muted/20 cursor-pointer hover:border-primary/40 transition-colors w-fit">
          {loading ? <Loader2 className="animate-spin text-primary" /> : <Upload className="text-primary" />}
          <span className="font-medium">{loading ? "กำลังอ่าน..." : "เลือกรูปใบจัดสาย"}</span>
          <input type="file" accept="image/*" className="hidden" disabled={loading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </label>

        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm p-4 rounded-xl border border-border bg-muted/20">
              <span><b>ใบจัดสาย:</b> {result.dispatchNo || "-"}</span>
              <span><b>สายส่ง:</b> {result.route || "-"}</span>
              <span><b>คนขับ:</b> {result.driverName || "-"}</span>
              <span><b>ทะเบียน:</b> {result.vehiclePlate || "-"}</span>
              <span><b>วันส่ง:</b> {result.deliveryDate || "-"}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">รหัสลูกค้า</th>
                    <th className="text-left p-3">ลูกค้า</th>
                    <th className="text-left p-3">ที่อยู่ (อ./จ.)</th>
                    <th className="text-left p-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.drops.map((d, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 font-mono">{d.customerCode || "-"}</td>
                      <td className="p-3">{d.customerName || "-"}</td>
                      <td className="p-3 text-muted-foreground">{[d.amphoe, d.province].filter(Boolean).join(" / ") || d.shipTo || "-"}</td>
                      <td className="p-3">
                        {d.matched
                          ? (d.hasCoord
                              ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 size={12} className="mr-1" />มีสถานที่+พิกัด</Badge>
                              : <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><AlertCircle size={12} className="mr-1" />มีสถานที่ (ไม่มีพิกัด)</Badge>)
                          : <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20"><AlertCircle size={12} className="mr-1" />ใหม่ (ยังไม่มี)</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              เขียว = จับคู่รหัส+มีพิกัดพร้อมสร้างงาน • เหลือง = มีสถานที่แต่ต้องเติมพิกัด • แดง = ร้านใหม่ (ระบบจะสร้างให้ตอนสร้างงานจริง)
            </p>
          </div>
        )}
        {preview && <img src={preview} alt="preview" className="max-w-xs rounded-xl border border-border" />}
      </div>
    </DashboardLayout>
  )
}
