"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PremiumButton } from "@/components/ui/premium-button"
import { PremiumCard } from "@/components/ui/premium-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Receipt,
  Download,
  Calendar,
  Building2,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Banknote,
  Percent,
  Loader2,
  History,
  Eye,
  Zap,
  ShieldCheck,
  TrendingUp,
  Activity,
  ArrowRight
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
import { toast } from "sonner"
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
              let costs: any = job.extra_costs_json
              if (typeof costs === 'string') {
                  try { costs = JSON.parse(costs) } catch {}
              }
              if (typeof costs === 'string') {
                  try { costs = JSON.parse(costs as string) } catch {}
              }
              if (Array.isArray(costs)) {
                  extra = costs.reduce((sum: number, c: { charge_cust?: string | number }) => sum + (Number(c.charge_cust) || 0), 0)
              }
          } catch {
      // Continue without error logging
    }
      }
      return basePrice + extra
  }

  // Calculate totals
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
        toast.error("กรุณาเลือกลูกค้าก่อนสร้างใบวางบิล")
        return
    }

    if (!confirm(`ยืนยันการสร้างใบวางบิลสำหรับ ${selectedItems.length} รายการ?`)) return

    setLoading(true)
    try {
        const today = new Date().toISOString().split('T')[0]
        const dueDateObj = new Date()
        dueDateObj.setDate(dueDateObj.getDate() + 30)
        const dueDate = dueDateObj.toISOString().split('T')[0]

        const result = await createBillingNote(
            selectedItems, 
            selectedCustomer,
            today,
            dueDate
        )

        if (result.success) {
            setSelectedItems([])
            router.refresh()
            toast.success("สร้างใบวางบิลระบุเรียบร้อย")
        } else {
            throw new Error(result.error || 'Failed to create billing note')
        }
    } catch (err: any) {
        toast.error("เกิดข้อผิดพลาด: " + err.message)
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

  // Invoice Preview Component (Refined Typography)
  const InvoicePreview = () => {
    const displayData = (isCustomerMode && selectedItems.length === 0) ? filteredData : selectedData
    const subtotal = displayData.reduce((sum, i) => sum + getJobTotal(i), 0)
    const withholding = Math.round(subtotal * WITHHOLDING_TAX_RATE)
    const netTotal = subtotal - withholding

    const customerInfo = customers.find(c => 
        c.Customer_Name?.trim().toLowerCase() === selectedCustomer?.trim().toLowerCase()
    )

    return (
    <div className="p-12 bg-white text-black max-w-[210mm] mx-auto min-h-[297mm] ring-1 ring-slate-200 shadow-2xl printable-document">
        <div className="flex justify-between items-start mb-10">
            <div className="flex flex-col gap-6 max-w-[60%]">
                {companyProfile?.logo_url && (
                    <div className="relative h-20 w-48">
                        <Image 
                            src={companyProfile.logo_url} 
                            alt="Company Logo" 
                            fill
                            className="object-contain object-left"
                            unoptimized
                        />
                    </div>
                )}
                <div className="space-y-1">
                    {companyProfile ? (
                        <>
                            <h2 className="font-extrabold text-2xl tracking-tight">{companyProfile.company_name}</h2>
                            {companyProfile.company_name_en && (
                                <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">{companyProfile.company_name_en}</p>
                            )}
                            <p className="mt-4 text-slate-500 text-xs leading-relaxed max-w-sm">{companyProfile.address}</p>
                            <div className="flex gap-6 mt-3 text-xs">
                                <p><span className="font-bold">TAX ID:</span> {companyProfile.tax_id}</p>
                                {companyProfile.phone && <p><span className="font-bold">TEL:</span> {companyProfile.phone}</p>}
                            </div>
                        </>
                    ) : (
                        <p className="text-slate-400">Loading Profile Data...</p>
                    )}
                </div>
            </div>

            <div className="text-right">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-1">Billing Note</h1>
                <p className="text-primary font-bold text-lg tracking-[0.2em] mb-4">ใบวางบิล / รายงานสรุป</p>
                <div className="inline-block px-4 py-1.5 bg-slate-900 text-white rounded font-black text-[10px] tracking-widest">
                    ORIGINAL COPY (ต้นฉบับ)
                </div>
            </div>
        </div>

        <div className="h-px bg-slate-200 mb-10" />

        <div className="grid grid-cols-2 gap-12 mb-12">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Customer Entity</h3>
                <p className="font-black text-xl text-slate-900 mb-3">{selectedCustomer}</p>
                {customerInfo ? (
                    <div className="text-xs text-slate-500 space-y-2 leading-relaxed">
                        <p>{customerInfo.Address || '-'}</p>
                        <div className="grid grid-cols-1 gap-1">
                            <p><span className="font-bold text-slate-400">Tax ID:</span> {customerInfo.Tax_ID || '-'}</p>
                            {customerInfo.Phone && <p><span className="font-bold text-slate-400">Tel:</span> {customerInfo.Phone}</p>}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-rose-500 font-bold mt-2 italic">* Identity Verification Pending</p>
                )}
            </div>

            <div className="p-6 rounded-3xl border border-slate-100">
                 <div className="space-y-4 text-xs font-bold">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-slate-400 uppercase tracking-widest">Document Index:</span>
                        <span className="font-black text-slate-900">- (DRAFT)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-slate-400 uppercase tracking-widest">Issue Date:</span>
                        <span className="text-slate-900">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-slate-400 uppercase tracking-widest">Credit Term:</span>
                        <span className="text-primary">30 DAYS</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-slate-400 uppercase tracking-widest">Vector Source:</span>
                        <span className="text-slate-900 uppercase">LOGISPRO COMMAND</span>
                    </div>
                 </div>
            </div>
        </div>

        <div className="mb-12">
            <table className="w-full text-xs text-left border-collapse">
                <thead>
                    <tr className="bg-slate-900 text-white">
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px] w-16">No.</th>
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px] w-32">Date</th>
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">Mission Intelligence</th>
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px] text-right w-40">Value (THB)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {displayData.map((job, index) => {
                    let extraCosts: any[] = []
                    try {
                        if (job.extra_costs_json) {
                            let parsed: any = job.extra_costs_json
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

                    const chargeableExtras = extraCosts.filter((c: any) => Number(c.charge_cust) > 0)

                    return (
                        <React.Fragment key={job.Job_ID}>
                            <tr className="hover:bg-slate-50 transition-colors">
                                <td className="py-5 px-6 font-black text-slate-400 align-top">{index + 1}</td>
                                <td className="py-5 px-6 font-bold text-slate-600 align-top">
                                    {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-'}
                                </td>
                                <td className="py-5 px-6 align-top">
                                    <div className="font-black text-slate-900 uppercase tracking-tight">{job.Job_ID}</div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{job.Route_Name || '-'}</div>
                                    <p className="text-[9px] text-slate-400 font-medium italic mt-0.5">Primary Logistics Service</p>
                                </td>
                                <td className="py-5 px-6 text-right font-black text-slate-900 align-top text-sm">
                                    {job.Price_Cust_Total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                            {chargeableExtras.map((extra, i) => (
                                <tr key={`${job.Job_ID}-extra-${i}`} className="bg-slate-50/20">
                                    <td className="py-2 px-6"></td>
                                    <td className="py-2 px-6"></td>
                                    <td className="py-2 px-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">
                                            <div className="w-1.5 h-px bg-slate-300" />
                                            {extra.type || "Ancillary Charge"}
                                        </div>
                                    </td>
                                    <td className="py-2 px-6 text-right font-bold text-slate-600">
                                        {Number(extra.charge_cust).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    )
                })}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={2} rowSpan={3} className="pt-10 pr-12 align-top">
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Remarks</p>
                                <ul className="text-[10px] text-slate-500 font-bold space-y-1.5 leading-relaxed">
                                    <li>- Verify document authenticity before processing.</li>
                                    <li>- Remittance via central corporate vector only.</li>
                                    <li>- Invoices follow a 30-day tactical settlement cycle.</li>
                                </ul>
                            </div>
                        </td>
                        <td className="pt-10 pb-4 px-6 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">Gross Operations Total</td>
                        <td className="pt-10 pb-4 px-6 text-right font-black text-slate-900 text-lg">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td className="py-3 px-6 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">Withholding Index (1%)</td>
                        <td className="py-3 px-6 text-right font-black text-rose-500 text-lg">-{withholding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-950 text-white rounded-b-3xl">
                        <td className="py-6 px-6 text-right font-black uppercase tracking-[0.4em] text-[10px]">Net Settlement Amount</td>
                        <td className="py-6 px-6 text-right font-black text-primary text-3xl">
                            {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            <span className="text-xs font-bold ml-2 opacity-60">THB</span>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div className="flex justify-between mt-24 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            <div className="text-center w-[250px] space-y-8">
                <div className="h-px bg-slate-200" />
                <div>
                   <p className="text-slate-900 font-black text-xs mb-1">Entity Acceptance</p>
                   <p>(Received By)</p>
                </div>
            </div>
            <div className="text-center w-[250px] space-y-8">
                <div className="h-px bg-slate-900" />
                <div>
                   <p className="text-slate-900 font-black text-xs mb-1">Authorized Commander</p>
                   <p>(Authorized Signature)</p>
                </div>
            </div>
        </div>
        
        <div className="mt-20 text-center">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.8em]">LogisPro Intelligence Matrix • Financial Vector v4.0</p>
        </div>
    </div>
  )}

  return (
    <>
    <div className="print:hidden">
    <DashboardLayout>
      {/* Tactical Financial Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-[#0a0518]/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/5 shadow-2xl relative group ring-1 ring-white/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                    <Receipt className="text-primary" size={20} />
                </div>
                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">AR COMMAND CENTRE</h2>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                {isCustomerMode ? "Supply Hub" : "Invoice Ledger"}
            </h1>
            <p className="text-slate-500 font-bold text-sm tracking-wide opacity-80 uppercase tracking-widest leading-relaxed">
              {isCustomerMode ? "Real-time logistics expenditure & billing summary" : "Accounts receivable, revenue analysis & settlement engine"}
            </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <PremiumButton 
                variant="outline" 
                className="h-16 px-10 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white gap-3 transition-all duration-300 ring-1 ring-white/5"
                onClick={() => router.push('/billing/customer/history')}
            >
                <History className="w-6 h-6" /> 
                <span className="font-black uppercase tracking-widest text-[10px]">{isCustomerMode ? "PAST SHIPMENTS" : "LEDGER HISTORY"}</span>
            </PremiumButton>
        </div>
      </div>

      {/* Intelligence Filters */}
      <div className="glass-panel border-white/5 rounded-[3rem] p-10 mb-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {!isCustomerMode && (
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Target Entity</Label>
              <Select
                value={selectedCustomer}
                onValueChange={(value) => setSelectedCustomer(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-full h-14 bg-white/5 border-white/5 text-white font-black rounded-2xl px-6 uppercase tracking-widest text-xs focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="LOCATE CUSTOMER..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0c061d] border-white/10 text-white font-black">
                  <SelectItem value="all" className="hover:bg-primary/20 focus:bg-primary/20 uppercase tracking-widest text-[10px]">ALL ACCOUNTS</SelectItem>
                  {uniqueCustomerNames.map(c => (
                    <SelectItem key={c} value={c} className="hover:bg-primary/20 focus:bg-primary/20 uppercase tracking-widest text-[10px]">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Mission Start</Label>
              <div className="relative group">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-50 group-hover:opacity-100 transition-opacity" size={18} />
                <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-14 bg-white/5 border-white/5 text-white font-black rounded-2xl pl-14 pr-6 uppercase tracking-widest text-xs focus:bg-white/10 transition-all"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Mission Termination</Label>
              <div className="relative group">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-50 group-hover:opacity-100 transition-opacity" size={18} />
                <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-14 bg-white/5 border-white/5 text-white font-black rounded-2xl pl-14 pr-6 uppercase tracking-widest text-xs focus:bg-white/10 transition-all"
                />
              </div>
            </div>
            {!isCustomerMode && (
            <div className="flex items-end">
              <PremiumButton variant="outline" className="border-white/5 w-full h-14 rounded-2xl gap-3">
                <Search className="w-5 h-5" /> 
                <span className="font-black uppercase tracking-widest text-[10px]">EXECUTE SCAN</span>
              </PremiumButton>
            </div>
            )}
          </div>
      </div>

      {/* Financial Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="p-8 rounded-[3rem] border border-primary/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40">
            <div className="flex items-center justify-between mb-8">
                <div className="p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-primary/20 text-primary">
                    <Clock size={24} strokeWidth={2.5} />
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] text-primary font-black uppercase tracking-widest italic animate-pulse">PENDING MISSION</div>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{isCustomerMode ? "Unbilled Missions" : "Unsettled Node"}</p>
            <p className="text-4xl font-black text-white tracking-tighter leading-none">{pendingItems.length}</p>
        </div>

        <div className="p-8 rounded-[3rem] border border-emerald-500/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40">
            <div className="flex items-center justify-between mb-8">
                <div className="p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-emerald-500/20 text-emerald-500">
                    <Banknote size={24} strokeWidth={2.5} />
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] text-emerald-500 font-black uppercase tracking-widest italic">BASE VALUE</div>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{isCustomerMode ? "Future Liability" : "Revenue Backlog"}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-slate-500 mb-1">THB</span>
                <p className="text-4xl font-black text-white tracking-tighter leading-none">{pendingTotal.toLocaleString()}</p>
            </div>
        </div>

        <div className="p-8 rounded-[3rem] border border-primary/30 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40">
            <div className="flex items-center justify-between mb-8">
                <div className="p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-primary text-white">
                    <CheckCircle2 size={24} strokeWidth={2.5} />
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[9px] text-white font-black uppercase tracking-widest italic">ACTIVE VECTOR</div>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{isCustomerMode ? "Audited Flow" : `Selected Context (${selectedItems.length})`}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-slate-500 mb-1">THB</span>
                <p className="text-4xl font-black text-white tracking-tighter leading-none">{selectedSubtotal.toLocaleString()}</p>
            </div>
        </div>

        <div className="p-8 rounded-[3rem] border border-accent/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40">
            <div className="flex items-center justify-between mb-8">
                <div className="p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-accent/20 text-accent">
                    <Percent size={24} strokeWidth={2.5} />
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] text-accent font-black uppercase tracking-widest italic">WHT RATIO</div>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Government Levy 1%</p>
            <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-slate-500 mb-1">THB</span>
                <p className="text-4xl font-black text-white tracking-tighter leading-none">{selectedWithholding.toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Selected Action Command Bar */}
      {!isCustomerMode && selectedItems.length > 0 && (
        <div className="mb-12 relative group animate-in fade-in slide-in-from-bottom-5">
            <div className="absolute inset-0 bg-primary/20 blur-[80px] pointer-events-none opacity-50" />
            <div className="relative bg-[#0a0518]/80 backdrop-blur-3xl border-2 border-primary/30 p-10 rounded-[4rem] shadow-[0_0_100px_rgba(255,30,133,0.2)] flex flex-wrap items-center justify-between gap-10">
                <div className="flex items-center gap-12">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Aggregated Subtotal</p>
                        <p className="text-3xl font-black text-white tracking-tighter uppercase">฿{selectedSubtotal.toLocaleString()}</p>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="space-y-2 text-rose-500">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-60 text-slate-500">Tax Delta (1%)</p>
                        <p className="text-3xl font-black tracking-tighter uppercase">฿{selectedWithholding.toLocaleString()}</p>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">Net Liquidity Value</p>
                        <p className="text-5xl font-black text-primary tracking-tighter uppercase premium-text-gradient">฿{selectedNetTotal.toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <button onClick={clearSelection} className="px-8 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                        ABORT SELECTION
                    </button>
                    <PremiumButton onClick={handleCreateBilling} disabled={loading} className="h-20 px-12 rounded-[2rem] shadow-[0_20px_40px_rgba(255,30,133,0.3)] text-xl font-black tracking-widest">
                        {loading ? <Loader2 className="w-6 h-6 mr-4 animate-spin" /> : <Zap size={24} className="mr-4" strokeWidth={3} />}
                        GENERATE BILLING
                    </PremiumButton>
                </div>
            </div>
        </div>
      )}

      {/* Data Registry */}
      <div className="glass-panel rounded-[4rem] border-white/5 shadow-2xl overflow-hidden bg-[#0a0518]/20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-12 gap-8 relative z-10">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase premium-text-gradient">Operational Registry</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Audit-Ready Transaction Nodes</p>
          </div>
          <div className="flex items-center flex-wrap gap-4">
            {!isCustomerMode && (
              <PremiumButton variant="outline" size="sm" onClick={selectAll} className="h-12 px-8 rounded-xl border-white/5 bg-white/5 text-[10px] font-black tracking-widest uppercase">
                SELECT COMPLETE VECTOR
              </PremiumButton>
            )}
            
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                    <button 
                        disabled={!isCustomerMode && selectedItems.length === 0}
                        className="h-12 px-8 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black tracking-widest uppercase flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Eye size={16} /> {isCustomerMode ? "SCAN SUMMARY" : "PREVIEW AUDIT"}
                    </button>
                </DialogTrigger>
                <DialogContent className="max-w-[210mm] max-h-[90vh] overflow-y-auto bg-white p-0 rounded-[2rem] ring-0 border-0 shadow-none">
                    <div className="p-4 bg-slate-100 flex items-center justify-between border-b sticky top-0 z-50 print:hidden">
                        <div className="flex items-center gap-3 text-slate-900">
                             <ShieldCheck className="text-primary" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Digital Audit Engine • Pre-Output Verification</span>
                        </div>
                        <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-900 transition-colors">
                            <Activity size={18} />
                        </button>
                    </div>
                    <InvoicePreview />
                </DialogContent>
            </Dialog>

            {!isCustomerMode && (
              <button 
                  disabled={selectedItems.length === 0}
                  onClick={handleExportCSV}
                  className="h-12 px-8 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black tracking-widest uppercase flex items-center gap-3 disabled:opacity-30"
              >
                <Download size={16} /> EXPORT CSV
              </button>
            )}
          </div>
        </div>

        <div className="relative w-full overflow-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
               <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  {!isCustomerMode && (
                    <th className="px-12 py-10 w-20">
                      <input 
                        type="checkbox" 
                        className="w-6 h-6 rounded-lg bg-white/5 border-white/10 checked:bg-primary transition-all cursor-pointer accent-primary"
                        checked={selectedItems.length === pendingItems.length && pendingItems.length > 0}
                        onChange={selectAll}
                      />
                    </th>
                  )}
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Mission ID</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Target Account</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Timestamp</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Vector Path</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-right">Base Vector</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-right">Net Value</th>
                  <th className="px-12 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Flow Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {filteredData.map((item) => (
                  <tr key={item.Job_ID} className="group/row hover:bg-primary/[0.03] transition-all duration-500">
                    {!isCustomerMode && (
                      <td className="px-12 py-8">
                        <input
                          type="checkbox"
                          className="w-6 h-6 rounded-lg bg-white/5 border-white/10 checked:bg-primary transition-all cursor-pointer accent-primary"
                          checked={selectedItems.includes(item.Job_ID)}
                          onChange={() => toggleItem(item.Job_ID)}
                        />
                      </td>
                    )}
                    <td className="px-8 py-8">
                        <span className="font-black text-white text-lg tracking-tighter font-display uppercase group-hover/row:text-primary transition-colors">{item.Job_ID}</span>
                    </td>
                    <td className="px-8 py-8">
                       <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/5 rounded-xl group-hover/row:bg-primary/20 transition-colors">
                            <Building2 className="w-5 h-5 text-slate-500 group-hover/row:text-primary transition-colors" />
                        </div>
                        <span className="font-black text-slate-300 text-sm uppercase tracking-tight">{item.Customer_Name || '-'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        {item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="px-8 py-8">
                        <p className="text-slate-300 font-bold text-[11px] uppercase tracking-tight truncate max-w-[200px]">{item.Route_Name || '-'}</p>
                    </td>
                    <td className="px-8 py-8 text-right font-black text-slate-400 text-sm">
                      <span className="text-[9px] mr-2">THB</span>
                      {(item.Price_Cust_Total || 0).toLocaleString()}
                    </td>
                    <td className="px-8 py-8 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-white tracking-tighter group-hover/row:text-emerald-400 transition-colors bg-white/5 px-4 py-1 rounded-xl">฿{getJobTotal(item).toLocaleString()}</span>
                            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-1">Total Payload</span>
                        </div>
                    </td>
                    <td className="px-12 py-8 text-center">
                      <div className={cn(
                        "inline-flex items-center gap-2.5 px-6 py-2.5 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest border transition-all duration-500 group-hover/row:scale-110",
                        isCustomerMode 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                          : "bg-primary/10 text-primary border-primary/20 shadow-[0_0_20px_rgba(255,30,133,0.1)]"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor]", isCustomerMode ? "bg-emerald-500 animate-pulse" : "bg-primary animate-pulse")} />
                        {isCustomerMode ? "SETTLEMENT DUE" : "UNBILLED MISSION"}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-40">
                      <div className="flex flex-col items-center gap-6 opacity-30">
                         <div className="p-8 bg-white/5 rounded-full border-2 border-white/5 animate-pulse">
                            <FileText size={64} className="text-slate-500" strokeWidth={1} />
                         </div>
                         <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-xs">Zero Mission Vectors Detected</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
        
        <div className="p-10 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-6">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.6em]">Financial Matrix Node Registry v4.0</p>
                <div className="h-4 w-px bg-white/5" />
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">ENCRYPTED</span>
                </div>
            </div>
            <Zap size={18} className="text-primary opacity-20" />
        </div>
      </div>
      
      <div className="mt-20 text-center mb-24">
        <div className="inline-flex items-center gap-4 px-8 py-3 glass-panel rounded-full text-[9px] font-black text-slate-700 uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-opacity">
            <ShieldCheck size={14} className="text-primary" /> LogisPro Ledger Engine • Certified Financial Accuracy
        </div>
      </div>
    </DashboardLayout>
    </div>

    {/* Dedicated Print Matrix */}
    <div className="hidden print:block printable-content fixed inset-0 bg-white z-[9999] p-0 font-sans antialiased">
        <InvoicePreview />
    </div>
    </>
  )
}
