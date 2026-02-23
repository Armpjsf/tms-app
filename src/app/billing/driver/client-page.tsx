"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Wallet,
  Download,
  Calendar,
  Truck,
  User,
  FileText,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  Banknote,
  Percent,
  Loader2,
  FileDown,
  History,
  Eye
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Job } from "@/lib/supabase/jobs"
import { Driver } from "@/lib/supabase/drivers"
import { createDriverPayment } from "@/lib/supabase/billing"

import { CompanyProfile } from "@/lib/supabase/settings"
import { Subcontractor } from "@/types/subcontractor"

const WITHHOLDING_TAX_RATE = 0.01 // 1%
import { exportToCSV } from "@/lib/utils/export"

const getJobTotal = (job: Job) => {
    const basePrice = job.Cost_Driver_Total || 0
    let extra = 0
    if (job.extra_costs_json) {
        try {
            let costs: any = job.extra_costs_json
            if (typeof costs === 'string') {
                try { costs = JSON.parse(costs) } catch {}
            }
            if (typeof costs === 'string') {
                try { costs = JSON.parse(costs) } catch {}
            }
            if (Array.isArray(costs)) {
                extra = costs.reduce((sum: number, c: any) => sum + (Number(c.cost_driver) || 0), 0)
            }
        } catch (e) {
            console.error("Error parsing extra costs", e)
        }
    }
    return basePrice + extra
}

interface DriverPaymentClientProps {
  initialJobs: Job[]
  drivers: Driver[]
  companyProfile: CompanyProfile | null
  subcontractors: Subcontractor[]
}

export default function DriverPaymentClient({ initialJobs, drivers, companyProfile, subcontractors }: DriverPaymentClientProps) {
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [paymentModel, setPaymentModel] = useState<'individual' | 'subcontractor'>('individual')
  const [selectedEntityId, setSelectedEntityId] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Selected items calculations

  // Filter data (Client-side)
  const filteredData = initialJobs.filter(item => {
    // Determine if this job belongs to the selected entity
    if (paymentModel === 'individual') {
        if (selectedEntityId && item.Driver_Name !== selectedEntityId) return false
    } else {
        // For subcontractor mode, we need to know which subcontractor the driver belongs to
        const driver = drivers.find(d => d.Driver_Name === item.Driver_Name)
        if (selectedEntityId && driver?.Sub_ID !== selectedEntityId) return false
    }

    if (dateFrom && item.Plan_Date && item.Plan_Date < dateFrom) return false
    if (dateTo && item.Plan_Date && item.Plan_Date > dateTo) return false
    return true
  })

  // Calculate totals
  const pendingItems = filteredData
  const pendingTotal = pendingItems.reduce((sum, i) => sum + getJobTotal(i), 0)
  
  // Selected items calculations
  const selectedData = filteredData.filter(i => selectedItems.includes(i.Job_ID))
  const selectedSubtotal = selectedData.reduce((sum, i) => sum + getJobTotal(i), 0)
  const selectedWithholding = Math.round(selectedSubtotal * WITHHOLDING_TAX_RATE)
  const selectedNetTotal = selectedSubtotal - selectedWithholding

  const toggleItem = (jobId: string) => {
    setSelectedItems(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    )
  }

  const selectAll = () => {
    const pendingIds = pendingItems.map(i => i.Job_ID)
    setSelectedItems(pendingIds)
  }

  const clearSelection = () => {
    setSelectedItems([])
  }

  const handleCreatePayment = async () => {
    if (selectedItems.length === 0) return
    if (!selectedEntityId) {
        alert(paymentModel === 'individual' ? "กรุณาเลือกคนขับก่อนสร้างใบสรุปจ่าย" : "กรุณาเลือกบริษัทรถร่วมก่อนสร้างใบสรุปจ่าย")
        return
    }

    if (!confirm(`ยืนยันการสร้างใบสรุปจ่ายสำหรับ ${selectedItems.length} รายการ?`)) return

    setLoading(true)
    try {
        const today = new Date().toISOString().split('T')[0]

        const result = await createDriverPayment(
            selectedItems, 
            paymentModel === 'individual' 
                ? selectedEntityId 
                : (subcontractors.find(s => s.Sub_ID === selectedEntityId)?.Sub_Name || selectedEntityId), 
            today
        )

        if (result.success) {
            alert(`สร้างใบสรุปจ่ายเลขที่ ${result.id} สำเร็จ!`)
            setSelectedItems([])
            router.refresh() 
        } else {
            alert(`เกิดข้อผิดพลาด: ${result.error}`)
        }
    } catch (e) {
        console.error(e)
        alert("เกิดข้อผิดพลาดในการสร้างใบสรุปจ่าย")
    } finally {
        setLoading(false)
    }
  }

  const handleExportSCB = () => {
    if (selectedItems.length === 0) return

    // 1. Get selected job objects
    const jobsToExport = initialJobs.filter(j => selectedItems.includes(j.Job_ID))

    // 2. Group by Payment Entity
    const lines = ["Bank Code,Account No,Amount,Beneficiary Name,Ref1,Ref2"]
    const missingBankEntities: string[] = []

    if (paymentModel === 'individual') {
        const jobsByDriver: Record<string, Job[]> = {}
        jobsToExport.forEach(job => {
            const dName = job.Driver_Name || 'Unknown'
            if (!jobsByDriver[dName]) jobsByDriver[dName] = []
            jobsByDriver[dName].push(job)
        })

        Object.entries(jobsByDriver).forEach(([driverName, p_jobs]) => {
            const driverInfo = drivers.find(d => d.Driver_Name === driverName)
            if (!driverInfo?.Bank_Account_No) {
                missingBankEntities.push(driverName)
                return
            }
            const subtotal = p_jobs.reduce((sum, j) => sum + getJobTotal(j), 0)
            const withholding = Math.round(subtotal * WITHHOLDING_TAX_RATE)
            const netTotal = subtotal - withholding
            lines.push(`${driverInfo.Bank_Name || 'SCB'},${driverInfo.Bank_Account_No},${netTotal.toFixed(2)},${driverInfo.Bank_Account_Name || driverName},Salary,${new Date().toISOString().split('T')[0]}`)
        })
    } else {
        // Subcontractor grouping
        const jobsBySub: Record<string, Job[]> = {}
        jobsToExport.forEach(job => {
            const driver = drivers.find(d => d.Driver_Name === job.Driver_Name)
            const subId = driver?.Sub_ID || 'Independent'
            if (!jobsBySub[subId]) jobsBySub[subId] = []
            jobsBySub[subId].push(job)
        })

        Object.entries(jobsBySub).forEach(([subId, p_jobs]) => {
            const subInfo = subcontractors.find(s => s.Sub_ID === subId)
            if (!subInfo?.Bank_Account_No) {
                missingBankEntities.push(subInfo?.Sub_Name || subId)
                return
            }
            const subtotal = p_jobs.reduce((sum, j) => sum + getJobTotal(j), 0)
            const withholding = Math.round(subtotal * WITHHOLDING_TAX_RATE)
            const netTotal = subtotal - withholding
            lines.push(`${subInfo.Bank_Name || 'SCB'},${subInfo.Bank_Account_No},${netTotal.toFixed(2)},${subInfo.Bank_Account_Name || subInfo.Sub_Name},Salary,${new Date().toISOString().split('T')[0]}`)
        })
    }

    if (missingBankEntities.length > 0) {
        alert(`ไม่สามารถ Export รายการเหล่านี้ได้เนื่องจากไม่มีเลขบัญชี:\n${missingBankEntities.join(", ")}\n\n(รายการอื่นๆ จะถูก Export ตามปกติ)`)
        if (lines.length === 1) return // header only, nothing to export
    }

    const csvContent = "data:text/csv;charset=utf-8," + lines.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `SCB_Bulk_Export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportCSV = () => {
    if (selectedItems.length === 0) return
    const jobsToExport = initialJobs.filter(j => selectedItems.includes(j.Job_ID))
    
    const dataToExport = jobsToExport.map(job => ({
        'Job ID': job.Job_ID,
        'วันที่': job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-',
        'คนขับ': job.Driver_Name || '-',
        'ทะเบียนรถ': job.Vehicle_Plate || '-',
        'เส้นทาง': job.Route_Name || '-',
        'ลูกค้า': job.Customer_Name || '-',
        'ต้นทุนคนขับ (Base)': job.Cost_Driver_Total || 0,
        'ค่าใช้จ่ายเพิ่มเติม': getJobTotal(job) - (job.Cost_Driver_Total || 0),
        'รวมทั้งหมด': getJobTotal(job),
        'สถานะ': job.Job_Status
    }))

    exportToCSV(dataToExport, `Driver_Payment_Selection`)
  }

  const handlePrint = () => {
    window.print()
  }

  // Preview Component
  const PaymentPreview = () => {
    // Find info
    const entityInfo = paymentModel === 'individual' 
        ? drivers.find(d => d.Driver_Name === selectedEntityId)
        : subcontractors.find(s => s.Sub_ID === selectedEntityId)
    
    const entityName = paymentModel === 'individual'
        ? selectedEntityId
        : subcontractors.find(s => s.Sub_ID === selectedEntityId)?.Sub_Name || selectedEntityId

    const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})

    return (
    <div className="p-8 bg-white text-black max-w-[210mm] mx-auto min-h-[297mm] relative">
        {/* Document Border (Optional, for visual) */}
        <div className="absolute inset-0 border border-slate-300 pointer-events-none print:hidden"></div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
            {/* Left: Logo & Company Info */}
            <div className="flex flex-col gap-4 max-w-[60%]">
                {companyProfile?.logo_url && (
                    <div>
                        <img 
                            src={companyProfile.logo_url} 
                            alt="Company Logo" 
                            className="h-24 w-auto object-contain" 
                        />
                    </div>
                )}
                <div className="text-sm">
                    {companyProfile ? (
                        <>
                            <h2 className="font-bold text-lg">{companyProfile.company_name}</h2>
                            {companyProfile.company_name_en && (
                                <p className="text-slate-600 font-medium">{companyProfile.company_name_en}</p>
                            )}
                            <p className="mt-2 text-slate-700">{companyProfile.address}</p>
                            <div className="flex gap-4 mt-1">
                                <p><span className="font-semibold">Tax ID:</span> {companyProfile.tax_id}</p>
                            </div>
                        </>
                    ) : (
                        <p className="text-slate-400">Loading company info...</p>
                    )}
                </div>
            </div>

            {/* Right: Document Title */}
            <div className="text-right">
                <h1 className="text-4xl font-bold text-slate-900 tracking-wide">ใบสำคัญจ่าย</h1>
                <p className="text-slate-500 text-lg font-medium tracking-widest uppercase mt-1">Payment Voucher</p>
                <div className="mt-4">
                     <span className="px-3 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">
                        ORIGINAL (ต้นฉบับ)
                     </span>
                </div>
            </div>
        </div>

        <hr className="border-slate-300 mb-6" />

        {/* Info Grid: Payer & Payee */}
        <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Payer Info (Company) */}
            <div className="border border-slate-200 rounded p-4 bg-slate-50/50">
                 <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">ผู้ทำจ่าย (Payer)</h3>
                 {companyProfile ? (
                    <div className="text-sm text-slate-600 mt-2 space-y-1">
                        <p className="font-semibold text-lg text-slate-900">{companyProfile.company_name}</p>
                        <p>{companyProfile.address}</p>
                        <p><span className="font-semibold">Tax ID:</span> {companyProfile.tax_id}</p>
                    </div>
                 ) : (
                    <p className="text-sm text-slate-400">Loading...</p>
                 )}
            </div>

            {/* Payee Info (Driver) */}
            <div className="border border-slate-200 rounded p-4">
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">ผู้รับเงิน (Payee)</h3>
                <p className="font-semibold text-lg text-slate-900">{entityName}</p>
                {entityInfo ? (
                     <div className="text-sm text-slate-600 mt-2 space-y-1">
                        {entityInfo.Bank_Name && entityInfo.Bank_Account_No ? (
                            <>
                                <p><span className="font-semibold">Bank:</span> {entityInfo.Bank_Name}</p>
                                <p><span className="font-semibold">Account No:</span> {entityInfo.Bank_Account_No} <span className="text-xs text-slate-400">({entityInfo.Bank_Account_Name})</span></p>
                            </>
                        ) : (
                            <p className="text-amber-600 italic">* ไม่พบข้อมูลบัญชีธนาคาร</p>
                        )}
                     </div>
                ) : (
                    <p className="text-sm text-red-400 mt-2 italic">* ไม่พบข้อมูลผู้รับเงินในระบบ</p>
                )}
            </div>
        </div>

        {/* Document Details Row */}
        <div className="flex justify-between items-center mb-6 text-sm bg-slate-50 p-3 rounded border border-slate-200">
             <div>
                <span className="text-slate-500 mr-2">เลขที่เอกสาร (No.):</span>
                <span className="font-mono font-bold">- (Draft)</span>
             </div>
             <div>
                <span className="text-slate-500 mr-2">วันที่ (Date):</span>
                <span className="font-medium">{today}</span>
             </div>
             <div>
                <span className="text-slate-500 mr-2">วิธีการชำระ (Payment Method):</span>
                <span className="font-medium">Bank Transfer</span>
             </div>
        </div>

        {/* Table */}
        <div className="mb-8">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-slate-100 text-slate-700 border-y-2 border-slate-300">
                        <th className="py-3 px-4 text-center font-bold w-16">ลำดับ<br/><span className="text-xs font-normal">No.</span></th>
                        <th className="py-3 px-4 text-left font-bold">รายละเอียด<br/><span className="text-xs font-normal">Description</span></th>
                        <th className="py-3 px-4 text-left font-bold">วันที่<br/><span className="text-xs font-normal">Date</span></th>
                        <th className="py-3 px-4 text-left font-bold">เส้นทาง<br/><span className="text-xs font-normal">Route</span></th>
                        <th className="py-3 px-4 text-right font-bold w-32">จำนวนเงิน<br/><span className="text-xs font-normal">Amount</span></th>
                    </tr>
                </thead>
                <tbody>
                    {selectedData.map((item, index) => {
                        let extraCosts: any[] = []
                        try {
                            if (item.extra_costs_json) {
                                let parsed: any = item.extra_costs_json
                                if (typeof parsed === 'string') {
                                    try { parsed = JSON.parse(parsed) } catch {}
                                }
                                if (typeof parsed === 'string') {
                                    try { parsed = JSON.parse(parsed) } catch {}
                                }
                                if (Array.isArray(parsed)) {
                                    extraCosts = parsed.filter(c => (Number(c.cost_driver) || 0) > 0)
                                }
                            }
                        } catch {}

                        return (
                            <tbody key={item.Job_ID} className="border-b border-slate-200">
                                <tr className="hover:bg-slate-50">
                                    <td className="py-3 px-4 text-center text-slate-500 align-top">{index + 1}</td>
                                    <td className="py-3 px-4 font-medium text-slate-800">
                                        ค่าเที่ยววิ่ง (Job: {item.Job_ID})
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 align-top">
                                        {item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 text-xs align-top">
                                        {item.Route_Name || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-800 align-top">
                                        {(item.Cost_Driver_Total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                {extraCosts.map((extra, i) => (
                                    <tr key={`${item.Job_ID}-extra-${i}`} className="text-slate-600 bg-slate-50/30">
                                        <td className="py-1 px-4"></td>
                                        <td className="py-1 px-4">
                                            <div className="text-sm border-l-2 border-slate-300 pl-2">
                                                {extra.type}
                                            </div>
                                        </td>
                                        <td className="py-1 px-4 text-center">-</td>
                                        <td className="py-1 px-4 text-slate-500 text-xs">-</td>
                                        <td className="py-1 px-4 text-right">
                                            {Number(extra.cost_driver).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        )
                    })}
                    {Array.from({ length: Math.max(0, 5 - selectedData.length) }).map((_, i) => (
                         <tr key={`empty-${i}`} className="border-b border-slate-100 h-10">
                            <td colSpan={5}></td>
                         </tr>
                    ))}
                </tbody>
                <tfoot>
                     <tr>
                        <td colSpan={3} rowSpan={3} className="pt-4 pr-8 align-top">
                            <div className="border border-slate-300 bg-slate-50 p-3 rounded text-xs text-slate-500">
                                <p className="font-bold mb-1">หมายเหตุ (Remarks):</p>
                                <p>- ยอดเงินนี้รวมค่าแรงและค่าพาหนะแล้ว</p>
                            </div>
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-slate-600">รวมเป็นเงิน</td>
                        <td className="py-2 px-4 text-right font-bold text-slate-800">{selectedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td className="py-2 px-4 text-right text-slate-600 text-sm">หัก ณ ที่จ่าย 1%</td>
                        <td className="py-2 px-4 text-right text-red-500 font-medium">-{selectedWithholding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 border-b-2">
                        <td className="py-3 px-4 text-right font-bold text-slate-900 text-lg">ยอดสุทธิ</td>
                        <td className="py-3 px-4 text-right font-bold text-indigo-700 text-lg decoration-double underline">
                            {selectedNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

         {/* Footer Signatures */}
        <div className="flex justify-between mt-16 text-sm text-slate-600 pb-8">
             <div className="text-center w-1/3">
                <div className="border-b border-slate-400 mb-2 h-8 w-3/4 mx-auto"></div>
                <p className="font-bold">ผู้รับเงิน</p>
                <p className="text-xs">(Payee)</p>
                <div className="mt-4 text-xs">วันที่ (Date): _____/_____/_______</div>
            </div>
            <div className="text-center w-1/3">
                <div className="border-b border-slate-400 mb-2 h-8 w-3/4 mx-auto"></div>
                <p className="font-bold">ผู้จ่ายเงิน / ผู้มีอำนาจลงนาม</p>
                <p className="text-xs">(Payer / Authorized Signature)</p>
                <div className="mt-4 text-xs">วันที่ (Date): _____/_____/_______</div>
            </div>
        </div>
    </div>
    )
  }

  return (
    <>
    <div className="print:hidden">
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wallet className="text-indigo-400" />
            สรุปจ่ายรถ
          </h1>
          <p className="text-sm text-slate-400 mt-1">สร้างเอกสารสรุปการทำจ่ายให้คนขับ (หัก ณ ที่จ่าย 1%)</p>
        </div>
        <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300 gap-2"
            onClick={() => router.push('/billing/driver/history')}
        >
            <History className="w-4 h-4" /> ประวัติการจ่าย
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm">รูปแบบการจ่าย</Label>
              <select
                value={paymentModel}
                onChange={(e) => {
                    setPaymentModel(e.target.value as 'individual' | 'subcontractor')
                    setSelectedEntityId("")
                }}
                className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
              >
                <option value="individual">คนขับรายบุคคล (Individual)</option>
                <option value="subcontractor">บริษัทรถร่วม (Subcontractor)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm">{paymentModel === 'individual' ? 'เลือกคนขับ' : 'เลือกบริษัทรถร่วม'}</Label>
              <select
                value={selectedEntityId || ""}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">ทั้งหมด</option>
                {paymentModel === 'individual' ? (
                    drivers.map(d => (
                        <option key={d.Driver_Name || ""} value={d.Driver_Name || ""}>{d.Driver_Name}</option>
                    ))
                ) : (
                    subcontractors.map(s => (
                        <option key={s.Sub_ID} value={s.Sub_ID}>{s.Sub_Name}</option>
                    ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" /> วันที่เริ่มต้น
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm">วันที่สิ้นสุด</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="border-slate-700 w-full text-slate-300">
                <Search className="w-4 h-4 mr-2" /> ค้นหา
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{pendingItems.length}</p>
              <p className="text-xs text-slate-400">รอจ่าย</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-500/10 border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-400">฿{pendingTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400">ยอดรอจ่าย</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">฿{selectedSubtotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400">ยอดที่เลือก ({selectedItems.length} รายการ)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Percent className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">฿{selectedWithholding.toLocaleString()}</p>
              <p className="text-xs text-slate-400">หัก ณ ที่จ่าย 1%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Summary Box */}
      {selectedItems.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-slate-400 text-xs">ยอดรวม</p>
                  <p className="text-white font-bold text-lg">฿{selectedSubtotal.toLocaleString()}</p>
                </div>
                <div className="text-slate-500">-</div>
                <div>
                  <p className="text-slate-400 text-xs">หัก ณ ที่จ่าย 1%</p>
                  <p className="text-red-400 font-bold text-lg">฿{selectedWithholding.toLocaleString()}</p>
                </div>
                <div className="text-slate-500">=</div>
                <div>
                  <p className="text-slate-400 text-xs">ยอดจ่ายสุทธิ</p>
                  <p className="text-indigo-400 font-bold text-xl">฿{selectedNetTotal.toLocaleString()}</p>
                </div>
              </div>
              <Button onClick={clearSelection} variant="ghost" className="text-slate-400 hover:text-white">
                ล้างการเลือก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-white">รายการงาน</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="border-slate-700 text-slate-300">
              เลือกทั้งหมด
            </Button>
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-slate-700 text-slate-300"
                        disabled={selectedItems.length === 0}
                    >
                        <Eye className="w-4 h-4 mr-2" /> ดูตัวอย่าง
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="text-slate-900">ตัวอย่างใบสำคัญจ่าย</DialogTitle>
                    </DialogHeader>
                    <div className="p-6">
                        <PaymentPreview />
                    </div>
                </DialogContent>
            </Dialog>

            <Button 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700" 
                disabled={selectedItems.length === 0 || loading}
                onClick={handleCreatePayment}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              สร้างใบสรุปจ่าย
            </Button>
            <Button 
                size="sm" 
                variant="outline" 
                className="border-slate-700 text-slate-300" 
                disabled={selectedItems.length === 0 || loading}
                onClick={handleExportSCB}
            >
              <FileDown className="w-4 h-4 mr-2" /> Export SCB
            </Button>
            <Button 
                size="sm" 
                variant="outline" 
                className="border-slate-700 text-slate-300" 
                disabled={selectedItems.length === 0}
                onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" /> พิมพ์
            </Button>
            <Button 
                size="sm" 
                variant="outline" 
                className="border-slate-700 text-slate-300" 
                disabled={selectedItems.length === 0}
                onClick={handleExportCSV}
            >
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                    <input 
                      type="checkbox" 
                      className="rounded bg-slate-800 border-slate-700"
                      checked={selectedItems.length === pendingItems.length && pendingItems.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Job ID</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">คนขับ</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">ทะเบียนรถ</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">วันที่</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">เส้นทาง</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">ค่าขนส่ง</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">รวม</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.Job_ID} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        className="rounded bg-slate-800 border-slate-700"
                        checked={selectedItems.includes(item.Job_ID)}
                        onChange={() => toggleItem(item.Job_ID)}
                      />
                    </td>
                    <td className="py-3 px-4 text-white font-medium">{item.Job_ID}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        {item.Driver_Name || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-500" />
                        {item.Vehicle_Plate || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.Route_Name || '-'}</td>
                    <td className="py-3 px-4 text-right text-indigo-400">
                      ฿{(item.Cost_Driver_Total || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-medium">
                      ฿{getJobTotal(item).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                        รอจ่าย
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
    </div>

    {/* Hidden Print Area */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8">
        <PaymentPreview />
    </div>
    </>
  )
}
