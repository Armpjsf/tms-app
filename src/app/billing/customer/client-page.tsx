"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Receipt,
  Download,
  Calendar,
  Building2,
  FileText,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  Banknote,
  Percent,
  Loader2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Job } from "@/lib/supabase/jobs"
import { createBillingNote } from "@/lib/supabase/billing"

import { CompanyProfile } from "@/lib/supabase/settings"
import { Customer } from "@/lib/supabase/customers"
import { exportToCSV } from "@/lib/utils/export"

const WITHHOLDING_TAX_RATE = 0.01 // 1%

interface CustomerBillingClientProps {
    initialJobs: Job[]
    companyProfile: CompanyProfile | null
    customers: Customer[]
}

export default function CustomerBillingClient({ initialJobs, companyProfile, customers }: CustomerBillingClientProps) {
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [isCustomerMode, setIsCustomerMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Initialize customer mode and selection
  useEffect(() => {
    async function init() {
        const { isCustomer, getCustomerId } = await import("@/lib/permissions")
        const customerFlag = await isCustomer()
        setIsCustomerMode(customerFlag)
        
        if (customerFlag) {
            const custId = await getCustomerId()
            const myCust = customers.find(c => c.Customer_ID === custId)
            if (myCust) {
                setSelectedCustomer(myCust.Customer_Name)
            }
        }
    }
    init()
  }, [customers])

  // Get unique customers
  const uniqueCustomerNames = [...new Set(initialJobs.filter(j=>j.Customer_Name).map(item => item.Customer_Name!))]

  // Filter data (Client-side filtering for now)
  const filteredData = initialJobs.filter(item => {
    if (selectedCustomer && item.Customer_Name !== selectedCustomer) return false
    if (dateFrom && item.Plan_Date && item.Plan_Date < dateFrom) return false
    if (dateTo && item.Plan_Date && item.Plan_Date > dateTo) return false
    return true
  })

  // Helper to calculate total including extra costs
  const getJobTotal = (job: Job) => {
      const basePrice = job.Price_Cust_Total || 0
      let extra = 0
      if (job.extra_costs_json) {
          try {
              let costs: unknown = job.extra_costs_json
              if (typeof costs === 'string') {
                  try { costs = JSON.parse(costs) } catch {}
              }
              if (typeof costs === 'string') {
                  try { costs = JSON.parse(costs as string) } catch {}
              }
              if (Array.isArray(costs)) {
                  extra = costs.reduce((sum: number, c: { charge_cust?: string | number }) => sum + (Number(c.charge_cust) || 0), 0)
              }
          } catch (e) {
              console.error("Error parsing extra costs", e)
          }
      }
      return basePrice + extra
  }

  // Calculate totals
  // Status "Completed" or "Delivered" that are NOT yet billed
  const pendingItems = filteredData.filter(i => !i.Billing_Note_ID)
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

  const handleCreateBilling = async () => {
    if (selectedItems.length === 0) return
    if (!selectedCustomer) {
        alert("กรุณาเลือกลูกค้าก่อนสร้างใบวางบิล")
        return
    }

    if (!confirm(`ยืนยันการสร้างใบวางบิลสำหรับ ${selectedItems.length} รายการ?`)) return

    setLoading(true)
    try {
        const today = new Date().toISOString().split('T')[0]
        // Default Due Date = Today + 30 days
        const dueDateObj = new Date()
        dueDateObj.setDate(dueDateObj.getDate() + 30)
        const dueDate = dueDateObj.toISOString().split('T')[0]

        const result = await createBillingNote(
            selectedItems, 
            selectedCustomer, // Assuming only one customer is selected/filtered
            today,
            dueDate
        )

        if (result.success) {
            alert(`สร้างใบวางบิลเลขที่ ${result.id} สำเร็จ!`)
            setSelectedItems([])
            router.refresh() // Reload data to remove billed items (logic needs to handle excluding billed items)
        } else {
            alert(`เกิดข้อผิดพลาด: ${result.error}`)
        }
    } catch (e) {
        console.error(e)
        alert("เกิดข้อผิดพลาดในการสร้างใบวางบิล")
    } finally {
        setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (selectedItems.length === 0) return
    const jobsToExport = initialJobs.filter(j => selectedItems.includes(j.Job_ID))
    
    const dataToExport = jobsToExport.map(job => ({
        'Job ID': job.Job_ID,
        'วันที่': job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-',
        'ลูกค้า': job.Customer_Name || '-',
        'ต้นทาง': job.Origin_Location || '-',
        'ปลายทาง': job.Dest_Location || '-',
        'ค่าขนส่ง': job.Price_Cust_Total || 0,
        'รวมทั้งหมด': getJobTotal(job),
        'สถานะ': job.Job_Status
    }))

    exportToCSV(dataToExport, `Customer_Billing_Selection`)
  }

  const [showPreview, setShowPreview] = useState(false)

  // ... (previous state existing) ...

  const handlePrint = () => {
    window.print()
  }

  // Preview Component (Reused for Print and Dialog)
  const InvoicePreview = () => {
    // If customer mode and nothing selected, show all filtered items
    const displayData = (isCustomerMode && selectedItems.length === 0) ? filteredData : selectedData
    const subtotal = displayData.reduce((sum, i) => sum + getJobTotal(i), 0)
    const withholding = Math.round(subtotal * WITHHOLDING_TAX_RATE)
    const netTotal = subtotal - withholding

    // Find customer details (Case-insensitive match)
    const customerInfo = customers.find(c => 
        c.Customer_Name?.trim().toLowerCase() === selectedCustomer?.trim().toLowerCase()
    )

    return (
    <div className="p-8 bg-white text-black max-w-[210mm] mx-auto min-h-[297mm] relative">
        {/* Document Border (Optional, for visual) */}
        <div className="absolute inset-0 border border-slate-300 pointer-events-none print:hidden"></div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
            {/* Left: Logo & Company Info */}
            <div className="flex flex-col gap-4 max-w-[60%]">
                {companyProfile?.logo_url && (
                    <div className="relative h-24 w-48">
                        <Image 
                            src={companyProfile.logo_url} 
                            alt="Company Logo" 
                            fill
                            className="object-contain object-left"
                            unoptimized
                        />
                    </div>
                )}
                <div className="text-sm">
                    {companyProfile ? (
                        <>
                            <h2 className="font-bold text-lg">{companyProfile.company_name}</h2>
                            {companyProfile.company_name_en && (
                                <p className="text-gray-500 font-medium">{companyProfile.company_name_en}</p>
                            )}
                            <p className="mt-2 text-gray-400">{companyProfile.address}</p>
                            <div className="flex gap-4 mt-1">
                                <p><span className="font-semibold">Tax ID:</span> {companyProfile.tax_id}</p>
                                {companyProfile.phone && <p><span className="font-semibold">Tel:</span> {companyProfile.phone}</p>}
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500">Loading company info...</p>
                    )}
                </div>
            </div>

            {/* Right: Document Title */}
            <div className="text-right">
                <h1 className="text-4xl font-bold text-slate-900 tracking-wide">ใบวางบิล</h1>
                <p className="text-gray-400 text-lg font-medium tracking-widest uppercase mt-1">Billing Note</p>
                <div className="mt-4">
                     <span className="px-3 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">
                        ORIGINAL (ต้นฉบับ)
                     </span>
                </div>
            </div>
        </div>

        <hr className="border-slate-300 mb-6" />

        {/* Info Grid: Buyer & Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Buyer Info */}
            <div className="border border-slate-200 rounded p-4 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">ลูกค้า (Customer)</h3>
                <p className="font-semibold text-lg">{selectedCustomer}</p>
                {customerInfo ? (
                    <div className="text-sm text-gray-500 mt-2 space-y-1">
                        <p>{customerInfo.Address || '-'}</p>
                        <p><span className="font-semibold">Tax ID:</span> {customerInfo.Tax_ID || '-'}</p>
                        {customerInfo.Phone && <p><span className="font-semibold">Tel:</span> {customerInfo.Phone}</p>}
                        {/* Use Branch_ID if previously added to type, else omit */}
                        {customerInfo.Branch_ID && <p><span className="font-semibold">Branch:</span> {customerInfo.Branch_ID}</p>} 
                    </div>
                ) : (
                    <p className="text-sm text-red-400 mt-2 italic">* ไม่พบข้อมูลลูกค้าในระบบ Master</p>
                )}
            </div>

            {/* Document Details */}
            <div className="border border-slate-200 rounded p-4">
                 <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-gray-400">เลขที่เอกสาร (No.):</span>
                        <span className="font-mono font-bold">- (Draft)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-gray-400">วันที่ (Date):</span>
                        <span className="font-medium">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-gray-400">เครดิต (Credit Days):</span>
                        <span className="font-medium">30 Days</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">ผู้ทำรายการ (Prepared By):</span>
                        <span className="font-medium">Admin</span>
                    </div>
                 </div>
            </div>
        </div>

        {/* Table */}
        <div className="mb-8">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-slate-100 text-gray-400 border-y-2 border-slate-300">
                        <th className="py-3 px-4 text-center font-bold w-16">ลำดับ<br/><span className="text-xs font-normal">No.</span></th>
                        <th className="py-3 px-4 text-center font-bold w-32">วันที่ขนส่ง<br/><span className="text-xs font-normal">Date</span></th>
                        <th className="py-3 px-4 text-left font-bold">รายละเอียด (Job ID / Route)<br/><span className="text-xs font-normal">Description</span></th>
                        <th className="py-3 px-4 text-right font-bold w-32">จำนวนเงิน<br/><span className="text-xs font-normal">Amount</span></th>
                    </tr>
                </thead>
                {displayData.map((job, index) => {
                    let extraCosts: { extra_cost_name?: string; charge_cust?: string | number }[] = []
                    try {
                        if (job.extra_costs_json) {
                            let parsed: unknown = job.extra_costs_json
                            if (typeof parsed === 'string') {
                                try { parsed = JSON.parse(parsed) } catch {}
                            }
                            if (typeof parsed === 'string') {
                                try { parsed = JSON.parse(parsed as string) } catch {}
                            }
                            if (Array.isArray(parsed)) {
                                extraCosts = parsed
                            }
                        }
                    } catch {}

                    const chargeableExtras = extraCosts.filter(c => c.charge_cust > 0)

                    return (
                        <tbody key={job.Job_ID} className="text-sm text-gray-400 border-b border-slate-200">
                            {/* Main Job Row */}
                            <tr>
                                <td className="py-3 px-4 text-center text-gray-400 align-top">{index + 1}</td>
                                <td className="py-3 px-4 text-center text-gray-500 align-top">
                                    {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-'}
                                </td>
                                <td className="py-3 px-4 align-top">
                                    <div className="font-bold text-slate-800">ค่าขนส่ง (Job: {job.Job_ID})</div>
                                    <div className="text-gray-400 text-xs mt-1">{job.Route_Name || '-'}</div>
                                </td>
                                <td className="py-3 px-4 text-right font-medium text-slate-800 align-top">
                                    {job.Price_Cust_Total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>

                            {/* Extra Costs Rows */}
                            {chargeableExtras.map((extra, i) => (
                                <tr key={`${job.Job_ID}-extra-${i}`} className="text-gray-500">
                                    <td className="py-1 px-4"></td>
                                    <td className="py-1 px-4 text-center"></td>
                                    <td className="py-1 px-4">
                                        <div className="text-sm border-l-2 border-slate-300 pl-2">
                                            {extra.type}
                                        </div>
                                    </td>
                                    <td className="py-1 px-4 text-right">
                                        {Number(extra.charge_cust).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    )
                })}
                <tfoot>
                    <tr>
                        <td colSpan={2} rowSpan={3} className="pt-4 pr-8 align-top">
                            <div className="border border-slate-300 bg-slate-50 p-3 rounded text-xs text-gray-400">
                                <p className="font-bold mb-1">หมายเหตุ (Remarks):</p>
                                <p>- กรุณาตรวจสอบความถูกต้องของเอกสาร</p>
                                <p>- ชำระเงินโดยการโอนเข้าบัญชีบริษัท</p>
                            </div>
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-gray-500">รวมเป็นเงิน</td>
                        <td className="py-2 px-4 text-right font-bold text-slate-800">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td className="py-2 px-4 text-right text-gray-500 text-sm">หัก ณ ที่จ่าย 1%</td>
                        <td className="py-2 px-4 text-right text-red-500 font-medium">-{withholding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 border-b-2">
                        <td className="py-3 px-4 text-right font-bold text-slate-900 text-lg">ยอดสุทธิ</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 text-lg decoration-double underline">
                            {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* Footer Signatures */}
        <div className="flex justify-between mt-16 text-sm text-gray-500 pb-8">
            <div className="text-center w-1/3">
                <div className="border-b border-slate-400 mb-2 h-8 w-3/4 mx-auto"></div>
                <p className="font-bold">ผู้รับวางบิล</p>
                <p className="text-xs">(Received By)</p>
                <div className="mt-4 text-xs">วันที่ (Date): _____/_____/_______</div>
            </div>
            <div className="text-center w-1/3">
                <div className="border-b border-slate-400 mb-2 h-8 w-3/4 mx-auto"></div>
                <p className="font-bold">ผู้วางบิล / ผู้มีอำนาจลงนาม</p>
                <p className="text-xs">(Authorized Signature)</p>
                <div className="mt-4 text-xs">วันที่ (Date): _____/_____/_______</div>
            </div>
        </div>
    </div>
  )}

  return (
    <>
    <div className="print:hidden">
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white/80 p-6 lg:p-8 rounded-[2rem] border border-gray-200 backdrop-blur-md shadow-2xl relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none scale-150">
              <Receipt size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2.5 bg-emerald-500/20 rounded-2xl shadow-lg shadow-emerald-500/20">
                  <Receipt className="text-emerald-400 w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                    {isCustomerMode ? "สรุปรายการค่าขนส่ง" : "สรุปวางบิลลูกค้า"}
                  </h1>
                  <p className="text-muted-foreground font-medium mt-1">
                    {isCustomerMode 
                      ? "ตรวจสอบสรุปค่าขนส่งและสถานะการวางบิลของคุณ" 
                      : "สร้างเอกสารสรุปสำหรับวางบิลลูกค้า (หัก ณ ที่จ่าย 1%)"}
                  </p>
                </div>
              </div>
            </div>
            <Button 
                variant="outline" 
                className="h-11 px-5 rounded-xl border-gray-200 bg-white/80 hover:bg-white text-gray-700 hover:text-white gap-2 relative z-10"
                onClick={() => router.push('/billing/customer/history')}
            >
                <History className="w-4 h-4" /> {isCustomerMode ? "ประวัติค่าขนส่ง" : "ประวัติการวางบิล"}
            </Button>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 shadow-2xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {!isCustomerMode && (
            <div className="space-y-2">
              <Label className="text-gray-500 text-sm">ลูกค้า</Label>
              <Select
                value={selectedCustomer}
                onValueChange={(value) => setSelectedCustomer(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-full h-10 bg-white border-gray-200 text-gray-900">
                  <SelectValue placeholder="เลือกลูกค้า..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด (All Customers)</SelectItem>
                  {uniqueCustomerNames.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
            <div className="space-y-2">
              <Label className="text-gray-500 text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" /> วันที่เริ่มต้น
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white border-gray-200 text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500 text-sm">วันที่สิ้นสุด</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white border-gray-200 text-gray-900"
              />
            </div>
            {!isCustomerMode && (
            <div className="flex items-end">
              <Button variant="outline" className="border-gray-200 w-full text-gray-700">
                <Search className="w-4 h-4 mr-2" /> ค้นหา
              </Button>
            </div>
            )}
          </div>
      </div>

      {/* Summary Stats */}
      {/* ... (Existing Summary Stats Content) ... */}
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/80 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{pendingItems.length}</p>
              <p className="text-xs text-gray-500">{isCustomerMode ? "งานที่ยังไม่วางบิล" : "รอวางบิล"}</p>
            </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-emerald-500/15 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-500">฿{pendingTotal.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{isCustomerMode ? "ยอดรอเรียกเก็บ" : "ยอดรอวางบิล"}</p>
            </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">฿{selectedSubtotal.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{isCustomerMode ? "ยอดที่ตรวจสอบ" : `ยอดที่เลือก (${selectedItems.length} รายการ)`}</p>
            </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Percent className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">฿{selectedWithholding.toLocaleString()}</p>
              <p className="text-xs text-gray-500">หัก ณ ที่จ่าย 1%</p>
            </div>
        </div>
      </div>

      {/* Selected Summary Box - Hide for customers */}
      {!isCustomerMode && selectedItems.length > 0 && (
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/30 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-gray-500 text-xs">ยอดรวม</p>
                  <p className="text-gray-900 font-bold text-lg">฿{selectedSubtotal.toLocaleString()}</p>
                </div>
                <div className="text-gray-400">-</div>
                <div>
                  <p className="text-gray-500 text-xs">หัก ณ ที่จ่าย 1%</p>
                  <p className="text-red-400 font-bold text-lg">฿{selectedWithholding.toLocaleString()}</p>
                </div>
                <div className="text-gray-400">=</div>
                <div>
                  <p className="text-gray-500 text-xs">ยอดสุทธิ</p>
                  <p className="text-emerald-400 font-bold text-xl">฿{selectedNetTotal.toLocaleString()}</p>
                </div>
              </div>
              <Button onClick={clearSelection} variant="ghost" className="text-gray-500 hover:text-white">
                ล้างการเลือก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-2xl">
        <div className="flex flex-row items-center justify-between p-5 pb-4">
          <h3 className="text-gray-900 font-bold text-lg">รายการงาน</h3>
          <div className="flex gap-2">
            {!isCustomerMode && (
              <Button variant="outline" size="sm" onClick={selectAll} className="border-gray-200 text-gray-700">
                เลือกทั้งหมด
              </Button>
            )}
            
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-gray-200 text-gray-700"
                        disabled={!isCustomerMode && selectedItems.length === 0}
                    >
                        <Eye className="w-4 h-4 mr-2" /> {isCustomerMode ? "ดูตัวอย่างสรุป" : "ดูตัวอย่าง"}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="text-slate-900">ตัวอย่างใบวางบิล</DialogTitle>
                    </DialogHeader>
                    <div className="p-6">
                        <InvoicePreview />
                    </div>
                </DialogContent>
            </Dialog>

            {!isCustomerMode && (
              <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700" 
                  disabled={selectedItems.length === 0 || loading}
                  onClick={handleCreateBilling}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                สร้างใบวางบิล
              </Button>
            )}

            <Button 
                size="sm" 
                variant="outline" 
                className="border-gray-200 text-gray-700" 
                disabled={!isCustomerMode && selectedItems.length === 0}
                onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" /> พิมพ์
            </Button>
            
            {!isCustomerMode && (
              <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-gray-200 text-gray-700" 
                  disabled={selectedItems.length === 0}
                  onClick={handleExportCSV}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            )}
          </div>
        </div>
        <div className="px-5 pb-5">
          {/* ... (Existing Table Content) ... */}
           <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                <tr className="border-b border-gray-200">
                  {!isCustomerMode && (
                    <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">
                      <input 
                        type="checkbox" 
                        className="rounded bg-gray-100 border-gray-200"
                        checked={selectedItems.length === pendingItems.length && pendingItems.length > 0}
                        onChange={selectAll}
                      />
                    </th>
                  )}
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">Job ID</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">ลูกค้า</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">วันที่</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">เส้นทาง</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium text-sm">ค่าขนส่ง</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium text-sm">รวม</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium text-sm">สถานะ</th>
                  {isCustomerMode && (
                    <th className="text-right py-3 px-4 text-gray-500 font-medium text-sm"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                 {filteredData.map((item) => (
                  <tr key={item.Job_ID} className="border-b border-gray-200 hover:bg-gray-50 transition-colors group">
                    {!isCustomerMode && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          className="rounded bg-gray-100 border-gray-200"
                          checked={selectedItems.includes(item.Job_ID)}
                          onChange={() => toggleItem(item.Job_ID)}
                        />
                      </td>
                    )}
                    <td className="py-3 px-4 text-gray-800 font-medium">{item.Job_ID}</td>
                    <td className="py-3 px-4 text-gray-700">
                       <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                        {item.Customer_Name || '-'}
                       </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-700 truncate max-w-[200px]">{item.Route_Name || '-'}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      ฿{(item.Price_Cust_Total || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 font-bold">
                      ฿{getJobTotal(item).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold",
                        isCustomerMode 
                          ? "bg-emerald-500/10 text-emerald-600" 
                          : "bg-amber-500/10 text-amber-600"
                      )}>
                        {isCustomerMode ? "รอชำระเงิน" : "รายการรอดำเนินการ"}
                      </span>
                    </td>
                    {isCustomerMode && (
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg hover:bg-emerald-500/10 text-emerald-600 font-medium"
                          onClick={() => router.push(`/admin/jobs/${item.Job_ID}`)}
                        >
                          <Eye className="w-4 h-4 mr-1.5" /> รายละเอียด
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                         <FileText className="w-8 h-8 opacity-50" />
                         <p>ไม่พบรายการที่ต้องวางบิล</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
    </div>

    {/* Hidden Print Area */}
    <div className="hidden print:block printable-content fixed inset-0 bg-white z-[9999] p-8">
        <InvoicePreview />
    </div>
    </>
  )
}
