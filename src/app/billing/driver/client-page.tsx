"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useLanguage } from "@/components/providers/language-provider"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { todayTH } from "@/lib/utils/date-th"
import { Label } from "@/components/ui/label"
import {
  Wallet, Download, Truck, User, CheckCircle2, Banknote, Percent, Loader2,
  FileDown, History, Eye, Save, Users, ArrowLeft, ArrowRight, Search,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Job } from "@/lib/supabase/jobs"
import { Driver } from "@/lib/supabase/drivers"
import { createDriverPayment } from "@/lib/supabase/billing"
import { CompanyProfile } from "@/lib/supabase/settings"
import { Subcontractor } from "@/types/subcontractor"
import { getBankCode } from "@/lib/constants/banks"
import { toast } from "sonner"
import { exportToCSV } from "@/lib/utils/export"
import { PaymentVoucher } from "@/components/billing/driver/PaymentVoucher"
import { cn } from "@/lib/utils"

const WITHHOLDING_TAX_RATE = 0.01 // 1%

interface ExtraCost { cost_driver: string | number; type: string }

const getJobTotal = (job: Job) => {
    const basePrice = job.Cost_Driver_Total || 0
    let extra = 0
    if (job.extra_costs_json) {
        try {
            let costs: ExtraCost[] = []
            if (typeof job.extra_costs_json === 'string') {
                try { costs = JSON.parse(job.extra_costs_json) } catch {}
            } else {
                costs = job.extra_costs_json as ExtraCost[]
            }
            if (Array.isArray(costs)) extra = costs.reduce((s, c) => s + (Number(c.cost_driver) || 0), 0)
        } catch {}
    }
    return basePrice + extra
}

interface DriverPaymentClientProps {
  initialJobs: Job[]
  drivers: Driver[]
  companyProfile: CompanyProfile | null
  subcontractors: Subcontractor[]
  initialDateFrom?: string
  initialDateTo?: string
}

type Mode = 'individual' | 'subcontractor'

export default function DriverPaymentClient({
  initialJobs, drivers, companyProfile, subcontractors, initialDateFrom, initialDateTo,
}: DriverPaymentClientProps) {
  const { t } = useLanguage()
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<Mode>('individual')
  const [selectedEntityId, setSelectedEntityId] = useState("")
  const [dateFrom, setDateFrom] = useState(initialDateFrom || "")
  const [dateTo, setDateTo] = useState(initialDateTo || "")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Jobs belonging to the chosen recipient (and date range). This is the ONLY
  // set that can ever be paid — the whole point of the recipient-first flow.
  const recipientJobs = useMemo(() => {
    if (!selectedEntityId) return []
    return initialJobs.filter(item => {
        const driver = drivers.find(d => d.Driver_Name === item.Driver_Name)
        if (mode === 'individual') {
            if (item.Driver_Name !== selectedEntityId) return false
        } else {
            if (driver?.Sub_ID !== selectedEntityId) return false
        }
        if (dateFrom && item.Plan_Date && item.Plan_Date < dateFrom) return false
        if (dateTo && item.Plan_Date && item.Plan_Date > dateTo) return false
        return true
    })
  }, [initialJobs, drivers, mode, selectedEntityId, dateFrom, dateTo])

  // Count of pending jobs per recipient (shown in the picker so the operator
  // knows who actually has something to pay).
  const pendingCountFor = useMemo(() => {
    const map: Record<string, number> = {}
    initialJobs.forEach(item => {
        const driver = drivers.find(d => d.Driver_Name === item.Driver_Name)
        if (dateFrom && item.Plan_Date && item.Plan_Date < dateFrom) return
        if (dateTo && item.Plan_Date && item.Plan_Date > dateTo) return
        if (mode === 'individual') {
            if (item.Driver_Name) map[item.Driver_Name] = (map[item.Driver_Name] || 0) + 1
        } else if (driver?.Sub_ID) {
            map[driver.Sub_ID] = (map[driver.Sub_ID] || 0) + 1
        }
    })
    return map
  }, [initialJobs, drivers, mode, dateFrom, dateTo])

  const selectedData = recipientJobs.filter(i => selectedItems.includes(i.Job_ID))
  const selectedSubtotal = selectedData.reduce((s, i) => s + getJobTotal(i), 0)
  const selectedWithholding = Math.round(selectedSubtotal * WITHHOLDING_TAX_RATE)
  const selectedNetTotal = selectedSubtotal - selectedWithholding

  const entityName = mode === 'individual'
    ? selectedEntityId
    : (subcontractors.find(s => s.Sub_ID === selectedEntityId)?.Sub_Name || selectedEntityId)
  const entityInfo = mode === 'individual'
    ? drivers.find(d => d.Driver_Name === selectedEntityId)
    : subcontractors.find(s => s.Sub_ID === selectedEntityId)

  const resetToStart = () => { setStep(1); setSelectedEntityId(""); setSelectedItems([]) }

  const goToJobs = () => {
    if (!selectedEntityId) { toast.warning("กรุณาเลือกผู้รับเงินก่อน"); return }
    if (recipientJobs.length === 0) { toast.warning("ผู้รับรายนี้ไม่มีงานค้างจ่ายในช่วงที่เลือก"); return }
    setSelectedItems(recipientJobs.map(j => j.Job_ID)) // default: select all of this recipient's jobs
    setStep(2)
  }

  const toggleItem = (jobId: string) =>
    setSelectedItems(prev => prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId])

  const toggleAll = () => {
    const ids = recipientJobs.map(i => i.Job_ID)
    const allSel = ids.length > 0 && ids.every(id => selectedItems.includes(id))
    setSelectedItems(allSel ? [] : ids)
  }

  const handleCreatePayment = async () => {
    const idsToPay = selectedData.map(d => d.Job_ID)
    if (idsToPay.length === 0) { toast.warning("ยังไม่ได้เลือกงาน"); return }
    setLoading(true)
    try {
        const result = await createDriverPayment(idsToPay, entityName, todayTH())
        if (result.success) {
            const paid = (result as { paidCount?: number }).paidCount ?? idsToPay.length
            toast.success(`ทำจ่ายสำเร็จ (${paid} งาน)`)
            resetToStart()
            router.refresh()
        } else {
            toast.error("ผิดพลาด: " + result.error)
        }
    } catch (err: unknown) {
        toast.error("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : String(err)))
    } finally {
        setLoading(false)
    }
  }

  // SCB bulk transfer for the single selected recipient (one payee → one line).
  const handleExportSCB = () => {
    if (selectedData.length === 0) return
    const info = entityInfo as { Bank_Account_No?: string; Bank_Name?: string; Bank_Account_Name?: string } | undefined
    if (!info?.Bank_Account_No) { toast.warning(`ไม่มีข้อมูลบัญชีธนาคารของ ${entityName}`); return }
    const bankCode = getBankCode(info.Bank_Name || "")
    const lines = [
        "Bank Code,Account No,Amount,Beneficiary Name,Ref1,Ref2",
        `${bankCode},${info.Bank_Account_No},${selectedNetTotal.toFixed(2)},${info.Bank_Account_Name || entityName},Salary,${todayTH()}`,
    ]
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `SCB_${entityName}_${todayTH()}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const handleExportCSV = () => {
    if (selectedData.length === 0) return
    const rows = selectedData.map(job => ({
        'Job ID': job.Job_ID,
        'วันที่': job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-',
        'คนขับ': job.Driver_Name || '-',
        'ทะเบียนรถ': job.Vehicle_Plate || '-',
        'ต้นทาง': job.Origin_Location || '-',
        'ปลายทาง': job.Dest_Location || job.Route_Name || '-',
        'ลูกค้า': job.Customer_Name || '-',
        'ต้นทุนคนขับ (Base)': job.Cost_Driver_Total || 0,
        'ค่าใช้จ่ายเพิ่มเติม': getJobTotal(job) - (job.Cost_Driver_Total || 0),
        'รวมทั้งหมด': getJobTotal(job),
    }))
    exportToCSV(rows, `Driver_Payment_${entityName}`)
  }

  const entityOptions = mode === 'individual'
    ? drivers.filter(d => !d.Sub_ID).map(d => ({ id: d.Driver_Name || "", label: d.Driver_Name || "-" }))
    : subcontractors.map(s => ({ id: s.Sub_ID, label: s.Sub_Name }))

  const voucher = (
    <PaymentVoucher
        companyProfile={companyProfile}
        entityName={entityName}
        entityInfo={entityInfo ?? null}
        today={new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
        selectedData={selectedData}
        selectedSubtotal={selectedSubtotal}
        selectedWithholding={selectedWithholding}
        selectedNetTotal={selectedNetTotal}
        t={t}
    />
  )

  return (
    <>
    <div className="print:hidden">
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/15 rounded-2xl"><Wallet className="text-indigo-500" size={28} /></div>
            <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">ทำจ่ายค่าเที่ยวคนขับ</h1>
                <p className="text-muted-foreground text-sm font-medium">เลือกผู้รับ → เลือกงาน → ยืนยัน</p>
            </div>
        </div>
        <PremiumButton variant="outline" className="h-12 px-6 rounded-xl gap-2" onClick={() => router.push('/billing/driver/history')}>
            <History className="w-5 h-5" /> ประวัติการจ่าย
        </PremiumButton>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {[
            { n: 1, label: "เลือกผู้รับเงิน" },
            { n: 2, label: "เลือกงานที่จะจ่าย" },
            { n: 3, label: "ตรวจสอบ & ยืนยัน" },
        ].map((s, idx) => (
            <React.Fragment key={s.n}>
                <div className={cn("flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all",
                    step === s.n ? "bg-primary/10 border-primary/40 text-primary"
                    : step > s.n ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                    : "bg-muted/30 border-border text-muted-foreground")}>
                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
                        step === s.n ? "bg-primary text-white" : step > s.n ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
                        {step > s.n ? "✓" : s.n}
                    </span>
                    <span className="text-sm font-bold hidden sm:inline">{s.label}</span>
                </div>
                {idx < 2 && <div className={cn("flex-1 h-0.5 rounded-full", step > s.n ? "bg-emerald-500/40" : "bg-border")} />}
            </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: choose recipient ── */}
      {step === 1 && (
        <div className="glass-panel border-border/10 rounded-3xl p-8 space-y-6 max-w-3xl">
            <div>
                <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 block">ประเภทผู้รับเงิน</Label>
                <div className="grid grid-cols-2 gap-3">
                    {([['individual', 'คนขับรายคน', User], ['subcontractor', 'รถร่วม (บริษัท)', Users]] as const).map(([m, label, Icon]) => (
                        <button key={m} type="button"
                            onClick={() => { setMode(m); setSelectedEntityId(""); setSelectedItems([]) }}
                            className={cn("flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                                mode === m ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:border-primary/30")}>
                            <Icon className="w-6 h-6" />
                            <span className="font-black">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">ตั้งแต่วันที่ (ไม่บังคับ)</Label>
                    <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setSelectedItems([]) }} className="h-12" />
                </div>
                <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">ถึงวันที่ (ไม่บังคับ)</Label>
                    <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setSelectedItems([]) }} className="h-12" />
                </div>
            </div>

            <div>
                <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    {mode === 'individual' ? "เลือกคนขับ" : "เลือกบริษัทรถร่วม"}
                </Label>
                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {entityOptions.length === 0 && (
                        <p className="text-sm text-muted-foreground py-6 text-center">ไม่มีรายชื่อ</p>
                    )}
                    {entityOptions.map(opt => {
                        const count = pendingCountFor[opt.id] || 0
                        const active = selectedEntityId === opt.id
                        return (
                            <button key={opt.id} type="button"
                                onClick={() => { setSelectedEntityId(opt.id); setSelectedItems([]) }}
                                className={cn("w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all text-left",
                                    active ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:border-primary/30",
                                    count === 0 && "opacity-50")}>
                                <span className="flex items-center gap-3 font-bold">
                                    {mode === 'individual' ? <User className="w-4 h-4 text-muted-foreground" /> : <Truck className="w-4 h-4 text-muted-foreground" />}
                                    {opt.label}
                                </span>
                                <span className={cn("text-xs font-black px-2.5 py-1 rounded-full",
                                    count > 0 ? "bg-indigo-500/15 text-indigo-500" : "bg-muted text-muted-foreground")}>
                                    {count} งานค้าง
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <PremiumButton onClick={goToJobs} disabled={!selectedEntityId || recipientJobs.length === 0}
                    className="h-14 px-10 rounded-2xl gap-2 text-base font-black">
                    ถัดไป <ArrowRight className="w-5 h-5" />
                </PremiumButton>
            </div>
        </div>
      )}

      {/* ── STEP 2: choose jobs ── */}
      {step === 2 && (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 glass-panel border-border/10 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep(1)} className="p-2 rounded-xl hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">ผู้รับเงิน</p>
                        <p className="text-xl font-black text-foreground">{entityName}</p>
                    </div>
                </div>
                <PremiumButton variant="outline" size="sm" className="h-11 px-6 rounded-xl" onClick={toggleAll}>
                    {recipientJobs.every(i => selectedItems.includes(i.Job_ID)) ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                </PremiumButton>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<CheckCircle2 size={20} />} label="เลือกแล้ว" value={`${selectedData.length} / ${recipientJobs.length}`} tone="primary" />
                <StatCard icon={<Banknote size={20} />} label="ยอดรวม (ก่อนหัก)" value={`฿${selectedSubtotal.toLocaleString()}`} tone="indigo" />
                <StatCard icon={<Percent size={20} />} label="หัก ณ ที่จ่าย 1%" value={`-฿${selectedWithholding.toLocaleString()}`} tone="rose" />
                <StatCard icon={<Wallet size={20} />} label="ยอดโอนสุทธิ" value={`฿${selectedNetTotal.toLocaleString()}`} tone="emerald" />
            </div>

            <div className="glass-panel rounded-3xl border-border/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/10 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                <th className="px-6 py-4 w-16">
                                    <input type="checkbox" className="w-5 h-5 rounded accent-primary cursor-pointer"
                                        checked={recipientJobs.length > 0 && recipientJobs.every(i => selectedItems.includes(i.Job_ID))}
                                        onChange={toggleAll} />
                                </th>
                                <th className="px-4 py-4">Job ID</th>
                                <th className="px-4 py-4">ทะเบียน</th>
                                <th className="px-4 py-4">วันที่</th>
                                <th className="px-4 py-4 text-right">ต้นทุน (Base)</th>
                                <th className="px-4 py-4 text-right">ค่าเพิ่ม</th>
                                <th className="px-6 py-4 text-right">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                            {recipientJobs.map(item => {
                                const checked = selectedItems.includes(item.Job_ID)
                                const extra = getJobTotal(item) - (item.Cost_Driver_Total || 0)
                                return (
                                    <tr key={item.Job_ID} onClick={() => toggleItem(item.Job_ID)}
                                        className={cn("cursor-pointer transition-colors", checked ? "bg-primary/[0.04]" : "hover:bg-muted/20")}>
                                        <td className="px-6 py-4"><input type="checkbox" className="w-5 h-5 rounded accent-primary cursor-pointer" checked={checked} onChange={() => toggleItem(item.Job_ID)} /></td>
                                        <td className="px-4 py-4 font-black text-foreground">{item.Job_ID}</td>
                                        <td className="px-4 py-4 text-muted-foreground font-bold">{item.Vehicle_Plate || '-'}</td>
                                        <td className="px-4 py-4 text-muted-foreground text-sm">{item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}</td>
                                        <td className="px-4 py-4 text-right text-muted-foreground">{(item.Cost_Driver_Total || 0).toLocaleString()}</td>
                                        <td className={cn("px-4 py-4 text-right", extra > 0 ? "text-indigo-500 font-bold" : "text-muted-foreground/50")}>{extra > 0 ? `+${extra.toLocaleString()}` : '-'}</td>
                                        <td className="px-6 py-4 text-right font-black text-foreground">฿{getJobTotal(item).toLocaleString()}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl gap-2" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
                </PremiumButton>
                <PremiumButton onClick={() => setStep(3)} disabled={selectedData.length === 0}
                    className="h-14 px-10 rounded-2xl gap-2 text-base font-black">
                    ตรวจสอบ & ยืนยัน <ArrowRight className="w-5 h-5" />
                </PremiumButton>
            </div>
        </div>
      )}

      {/* ── STEP 3: confirm ── */}
      {step === 3 && (
        <div className="space-y-6 max-w-4xl">
            <div className="glass-panel border-border/10 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep(2)} className="p-2 rounded-xl hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-2xl font-black">ยืนยันการทำจ่าย</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-muted/20 border border-border/10">
                    <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">ผู้รับเงิน</p>
                        <p className="text-xl font-black">{entityName}</p>
                        <p className="text-sm text-muted-foreground mt-1">{selectedData.length} งาน</p>
                    </div>
                    <div className="sm:text-right space-y-1">
                        <div className="flex sm:justify-end gap-3 text-sm"><span className="text-muted-foreground">ยอดรวม</span><span className="font-bold">฿{selectedSubtotal.toLocaleString()}</span></div>
                        <div className="flex sm:justify-end gap-3 text-sm text-rose-500"><span>หัก ณ ที่จ่าย 1%</span><span className="font-bold">-฿{selectedWithholding.toLocaleString()}</span></div>
                        <div className="flex sm:justify-end gap-3 text-lg border-t border-border/20 pt-1 mt-1"><span className="text-primary font-black">ยอดโอนสุทธิ</span><span className="text-primary font-black">฿{selectedNetTotal.toLocaleString()}</span></div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button onClick={() => setShowPreview(true)} className="h-12 px-6 rounded-xl bg-muted/50 border border-border/10 hover:bg-muted transition-all font-bold flex items-center gap-2">
                        <Eye size={18} /> ดูใบสำคัญจ่าย
                    </button>
                    <button onClick={handleExportSCB} className="h-12 px-6 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all font-bold flex items-center gap-2">
                        <FileDown size={18} /> ไฟล์โอนธนาคาร (SCB)
                    </button>
                    <button onClick={handleExportCSV} className="h-12 px-6 rounded-xl bg-muted/50 border border-border/10 hover:bg-muted transition-all font-bold flex items-center gap-2">
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl gap-2" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
                </PremiumButton>
                <PremiumButton onClick={handleCreatePayment} disabled={loading || selectedData.length === 0}
                    className="h-16 px-12 rounded-2xl gap-3 text-lg font-black shadow-[0_20px_40px_rgba(255,30,133,0.25)]">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save size={22} strokeWidth={3} />}
                    ยืนยันทำจ่าย ฿{selectedNetTotal.toLocaleString()}
                </PremiumButton>
            </div>
        </div>
      )}

    </DashboardLayout>
    </div>

    {/* Voucher dialog */}
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[210mm] max-h-[90vh] overflow-y-auto bg-white p-0 rounded-2xl">
            <div className="p-4 bg-slate-100 flex items-center justify-between border-b sticky top-0 z-50 text-foreground">
                <DialogTitle className="text-sm font-black uppercase tracking-widest">ใบสำคัญจ่าย • Payout Voucher</DialogTitle>
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-200 rounded-lg"><Search size={18} /></button>
            </div>
            {voucher}
        </DialogContent>
    </Dialog>

    {/* Print */}
    <div className="hidden print:block printable-content fixed inset-0 bg-white z-[9999] p-0">{voucher}</div>
    </>
  )
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'primary' | 'indigo' | 'rose' | 'emerald' }) {
    const tones = {
        primary: "border-primary/20 text-primary",
        indigo: "border-indigo-500/20 text-indigo-500",
        rose: "border-rose-500/20 text-rose-500",
        emerald: "border-emerald-500/20 text-emerald-600",
    }
    return (
        <div className={cn("p-5 rounded-2xl border bg-background/40", tones[tone])}>
            <div className="flex items-center gap-2 mb-2 opacity-80">{icon}<span className="text-[11px] font-black uppercase tracking-wider">{label}</span></div>
            <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
        </div>
    )
}
