"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Job } from "@/lib/supabase/jobs"
import { createBillingNote } from "@/lib/supabase/billing"

import { CompanyProfile } from "@/lib/supabase/settings"
import { Customer } from "@/lib/supabase/customers"

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
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Get unique customers
  const uniqueCustomerNames = [...new Set(initialJobs.filter(j=>j.Customer_Name).map(item => item.Customer_Name!))]

  // Filter data (Client-side filtering for now)
  const filteredData = initialJobs.filter(item => {
    if (selectedCustomer && item.Customer_Name !== selectedCustomer) return false
    if (dateFrom && item.Plan_Date && item.Plan_Date < dateFrom) return false
    if (dateTo && item.Plan_Date && item.Plan_Date > dateTo) return false
    return true
  })

  // Calculate totals
  // Status "Completed" or "Delivered" are considered "Pending Billing" effectively until we have a real Billing Status
  const pendingItems = filteredData
  const pendingTotal = pendingItems.reduce((sum, i) => sum + (i.Price_Cust_Total || 0), 0)
  
  // Selected items calculations
  const selectedData = filteredData.filter(i => selectedItems.includes(i.Job_ID))
  const selectedSubtotal = selectedData.reduce((sum, i) => sum + (i.Price_Cust_Total || 0), 0)
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

  const [showPreview, setShowPreview] = useState(false)

  // ... (previous state existing) ...

  const handlePrint = () => {
    window.print()
  }

  // Preview Component (Reused for Print and Dialog)
  const InvoicePreview = () => {
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
                                {companyProfile.phone && <p><span className="font-semibold">Tel:</span> {companyProfile.phone}</p>}
                            </div>
                        </>
                    ) : (
                        <p className="text-slate-400">Loading company info...</p>
                    )}
                </div>
            </div>

            {/* Right: Document Title */}
            <div className="text-right">
                <h1 className="text-4xl font-bold text-slate-900 tracking-wide">ใบวางบิล</h1>
                <p className="text-slate-500 text-lg font-medium tracking-widest uppercase mt-1">Billing Note</p>
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
                    <div className="text-sm text-slate-600 mt-2 space-y-1">
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
                        <span className="text-slate-500">เลขที่เอกสาร (No.):</span>
                        <span className="font-mono font-bold">- (Draft)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500">วันที่ (Date):</span>
                        <span className="font-medium">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500">เครดิต (Credit Days):</span>
                        <span className="font-medium">30 Days</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">ผู้ทำรายการ (Prepared By):</span>
                        <span className="font-medium">Admin</span>
                    </div>
                 </div>
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
                    {selectedData.map((item, index) => (
                        <tr key={item.Job_ID} className="border-b border-slate-200">
                            <td className="py-3 px-4 text-center text-slate-500">{index + 1}</td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                                ค่าขนส่ง (Job: {item.Job_ID})
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                                {item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-xs">
                                {item.Route_Name || '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-slate-800">
                                {item.Price_Cust_Total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                    {/* Fill empty rows to maintain height if needed, or just standard spacing */}
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
                                <p>- กรุณาตรวจสอบความถูกต้องของเอกสาร</p>
                                <p>- ชำระเงินโดยการโอนเข้าบัญชีบริษัท</p>
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
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 text-lg decoration-double underline">
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Receipt className="text-emerald-400" />
            สรุปวางบิลลูกค้า
          </h1>
          <p className="text-sm text-slate-400 mt-1">สร้างเอกสารสรุปสำหรับวางบิลลูกค้า (หัก ณ ที่จ่าย 1%)</p>
        </div>
        <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300 gap-2"
            onClick={() => router.push('/billing/customer/history')}
        >
            <History className="w-4 h-4" /> ประวัติการวางบิล
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        {/* ... (Existing Filters Content) ... */}
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm">ลูกค้า</Label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">เลือกลูกค้า...</option>
                {uniqueCustomerNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
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
      {/* ... (Existing Summary Stats Content) ... */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{pendingItems.length}</p>
              <p className="text-xs text-slate-400">รอวางบิล</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">฿{pendingTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400">ยอดรอวางบิล</p>
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
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/30 mb-6">
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
                  <p className="text-slate-400 text-xs">ยอดสุทธิ</p>
                  <p className="text-emerald-400 font-bold text-xl">฿{selectedNetTotal.toLocaleString()}</p>
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
                        <DialogTitle className="text-slate-900">ตัวอย่างใบวางบิล</DialogTitle>
                    </DialogHeader>
                    <div className="p-6">
                        <InvoicePreview />
                    </div>
                </DialogContent>
            </Dialog>

            <Button 
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700" 
                disabled={selectedItems.length === 0 || loading}
                onClick={handleCreateBilling}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              สร้างใบวางบิล
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
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" disabled={selectedItems.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* ... (Existing Table Content) ... */}
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
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">ลูกค้า</th>
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
                    <td className="py-3 px-4 text-slate-300 flex items-center gap-2">
                       <Building2 className="w-4 h-4 text-slate-500" />
                      {item.Customer_Name || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.Route_Name || '-'}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">
                      ฿{(item.Price_Cust_Total || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-medium">
                      ฿{(item.Price_Cust_Total || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                        รอวางบิล
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
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
        </CardContent>
      </Card>
    </DashboardLayout>
    </div>

    {/* Hidden Print Area */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8">
        <InvoicePreview />
    </div>
    </>
  )
}
