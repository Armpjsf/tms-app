import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useLanguage } from "@/components/providers/language-provider"
import { Card, CardContent } from "@/components/ui/card"
import { PremiumButton } from "@/components/ui/premium-button"
import { PremiumCard } from "@/components/ui/premium-card"
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
  Eye,
  Zap,
  Activity,
  ShieldCheck,
  TrendingUp,
  Save
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
import { Driver } from "@/lib/supabase/drivers"
import { createDriverPayment } from "@/lib/supabase/billing"

import { CompanyProfile } from "@/lib/supabase/settings"
import { Subcontractor } from "@/types/subcontractor"
import { getBankCode } from "@/lib/constants/banks"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const WITHHOLDING_TAX_RATE = 0.01 // 1%
import { exportToCSV } from "@/lib/utils/export"

interface ExtraCost {
    cost_driver: string | number
    type: string
}

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
                extra = costs.reduce((sum: number, c: ExtraCost) => sum + (Number(c.cost_driver) || 0), 0)
            }
        } catch {
            // Error parsing extra costs
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
  const { t } = useLanguage()
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [paymentModel, setPaymentModel] = useState<'individual' | 'subcontractor'>('individual')
  const [selectedEntityId, setSelectedEntityId] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Filter data (Client-side)
  const filteredData = initialJobs.filter(item => {
    if (paymentModel === 'individual') {
        if (selectedEntityId && item.Driver_Name !== selectedEntityId) return false
    } else {
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
        toast.warning(t('billing_driver.select_recipient_first'))
        return
    }

    if (!confirm(t('billing_driver.payout_confirm').replace('{count}', selectedItems.length.toString()))) return

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
            setSelectedItems([])
            router.refresh()
            toast.success(t('billing_driver.payout_success'))
        } else {
            toast.error("Error: " + result.error)
        }
    } catch (err: any) {
        toast.error("เกิดข้อผิดพลาด: " + err.message)
    } finally {
        setLoading(false)
    }
  }

  const handleExportSCB = () => {
    if (selectedItems.length === 0) return

    const jobsToExport = initialJobs.filter(j => selectedItems.includes(j.Job_ID))
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
            const bankCode = getBankCode(driverInfo.Bank_Name)
            lines.push(`${bankCode},${driverInfo.Bank_Account_No},${netTotal.toFixed(2)},${driverInfo.Bank_Account_Name || driverName},Salary,${new Date().toISOString().split('T')[0]}`)
        })
    } else {
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
            const bankCode = getBankCode(subInfo.Bank_Name)
            lines.push(`${bankCode},${subInfo.Bank_Account_No},${netTotal.toFixed(2)},${subInfo.Bank_Account_Name || subInfo.Sub_Name},Salary,${new Date().toISOString().split('T')[0]}`)
        })
    }

    if (missingBankEntities.length > 0) {
        toast.warning(`Missing Bank Info for: ${missingBankEntities.join(", ")}`)
        if (lines.length === 1) return
    }

    const csvContent = "\ufeff" + lines.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
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
        'ต้นทาง': job.Origin_Location || '-',
        'ปลายทาง': job.Dest_Location || '-',
        'ลูกค้า': job.Customer_Name || '-',
        'ต้นทุนคนขับ (Base)': job.Cost_Driver_Total || 0,
        'ค่าใช้จ่ายเพิ่มเติม': getJobTotal(job) - (job.Cost_Driver_Total || 0),
        'รวมทั้งหมด': getJobTotal(job),
        'สถานะ': job.Job_Status
    }))

    exportToCSV(dataToExport, `Driver_Payment_Selection`)
  }

  // Payment Preview Component
  const PaymentPreview = () => {
    const entityInfo = paymentModel === 'individual' 
        ? drivers.find(d => d.Driver_Name === selectedEntityId)
        : subcontractors.find(s => s.Sub_ID === selectedEntityId)
    
    const entityName = paymentModel === 'individual'
        ? selectedEntityId
        : subcontractors.find(s => s.Sub_ID === selectedEntityId)?.Sub_Name || selectedEntityId

    const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})

    return (
    <div className="p-12 bg-white text-black max-w-[210mm] mx-auto min-h-[297mm] ring-1 ring-slate-200 shadow-2xl printable-document">
        <div className="flex justify-between items-start mb-10">
            <div className="flex flex-col gap-6 max-w-[60%]">
                {companyProfile?.logo_url && (
                    <div className="relative h-20 w-48">
                        <img 
                            src={companyProfile.logo_url} 
                            alt="Company Logo" 
                            className="h-full w-auto object-contain object-left" 
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
                            </div>
                        </>
                    ) : (
                        <p className="text-slate-400">Loading Profile Data...</p>
                    )}
                </div>
            </div>

            <div className="text-right">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-1">Payment Voucher</h1>
                <p className="text-primary font-bold text-lg tracking-[0.2em] mb-4">ใบสำคัญจ่าย / สรุปเที่ยววิ่ง</p>
                <div className="inline-block px-4 py-1.5 bg-slate-900 text-white rounded font-black text-[10px] tracking-widest">
                    {t('common.original_copy')}
                </div>
            </div>
        </div>

        <div className="h-px bg-slate-200 mb-10" />

        <div className="grid grid-cols-2 gap-12 mb-12">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{t('billing_driver.payout_recipient')}</h3>
                <p className="font-black text-xl text-slate-900 mb-3">{entityName}</p>
                {entityInfo ? (
                     <div className="text-xs text-slate-500 space-y-2 leading-relaxed">
                        {entityInfo.Bank_Name && entityInfo.Bank_Account_No ? (
                            <>
                                <p><span className="font-bold text-slate-400">BANK:</span> {entityInfo.Bank_Name}</p>
                                <p><span className="font-bold text-slate-400">ACCOUNT:</span> {entityInfo.Bank_Account_No} <span className="text-[10px] opacity-60 italic">({entityInfo.Bank_Account_Name})</span></p>
                            </>
                        ) : (
                            <p className="text-primary font-bold mt-2 italic">* Financial Vector Path Pending</p>
                        )}
                     </div>
                ) : (
                    <p className="text-xs text-rose-500 font-bold mt-2 italic">* Recipient Identification Failure</p>
                )}
            </div>

            <div className="p-6 rounded-3xl border border-slate-100">
                 <div className="space-y-4 text-xs font-bold">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-slate-400 uppercase tracking-widest">Voucher Index:</span>
                        <span className="font-black text-slate-900">- (DRAFT)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-slate-400 uppercase tracking-widest">Execution Date:</span>
                        <span className="text-slate-900">{today}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-slate-400 uppercase tracking-widest">{t('billing_driver.payout_logic')}:</span>
                        <span className="text-primary uppercase tracking-widest">BANK TRANSFER</span>
                    </div>
                 </div>
            </div>
        </div>

        <div className="mb-12">
            <table className="w-full text-xs text-left border-collapse">
                <thead>
                    <tr className="bg-slate-900 text-white">
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px] w-16">No.</th>
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">{t('billing_driver.mission_hub')}</th>
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px] w-32">{t('billing_customer.timestamp')}</th>
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px] text-right w-40">{t('billing_driver.base_payout')} (THB)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
                            <React.Fragment key={item.Job_ID}>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="py-5 px-6 font-black text-slate-400 align-top">{index + 1}</td>
                                    <td className="py-5 px-6 align-top">
                                        <div className="font-black text-slate-900 uppercase tracking-tight">Mission {item.Job_ID}</div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{item.Route_Name || '-'}</div>
                                    </td>
                                    <td className="py-5 px-6 font-bold text-slate-600 align-top">
                                        {item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}
                                    </td>
                                    <td className="py-5 px-6 text-right font-black text-slate-900 align-top text-sm">
                                        {(item.Cost_Driver_Total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                {extraCosts.map((extra, i) => (
                                    <tr key={`${item.Job_ID}-extra-${i}`} className="bg-slate-50/20">
                                        <td className="py-2 px-6"></td>
                                        <td className="py-2 px-6">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">
                                                <div className="w-1.5 h-px bg-slate-300" />
                                                {extra.type || "Ancillary Cost"}
                                            </div>
                                        </td>
                                        <td className="py-2 px-6 text-center text-slate-300">-</td>
                                        <td className="py-2 px-6 text-right font-bold text-slate-600">
                                            {Number(extra.cost_driver).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">结算说明 (Settlement Notes)</p>
                                <ul className="text-[10px] text-slate-500 font-bold space-y-1.5 leading-relaxed">
                                    <li>- Value includes all primary operational and ancillary logistics costs.</li>
                                    <li>- Payout processed via registered financial vector channel.</li>
                                    <li>- Certified as accurate by LogisPro Matrix Audit v4.2</li>
                                </ul>
                            </div>
                        </td>
                        <td className="pt-10 pb-4 px-6 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">{t('billing_driver.gross_operations')}</td>
                        <td className="pt-10 pb-4 px-6 text-right font-black text-slate-900 text-lg">{selectedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td className="py-3 px-6 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">{t('billing_driver.recipient_wht')}</td>
                        <td className="py-3 px-6 text-right font-black text-rose-500 text-lg">-{selectedWithholding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-950 text-white rounded-b-3xl">
                        <td className="py-6 px-6 text-right font-black uppercase tracking-[0.4em] text-[10px]">{t('billing_driver.net_disbursement_value')}</td>
                        <td className="py-6 px-6 text-right font-black text-indigo-400 text-3xl">
                            {selectedNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                   <p className="text-slate-900 font-black text-xs mb-1">{t('billing_driver.payee_acknowledgment')}</p>
                   <p>(Recipient Signature)</p>
                </div>
            </div>
            <div className="text-center w-[250px] space-y-8">
                <div className="h-px bg-slate-900" />
                <div>
                   <p className="text-slate-900 font-black text-xs mb-1">{t('billing_driver.central_payer')}</p>
                   <p>(Authorized Payer Signature)</p>
                </div>
            </div>
        </div>
        
        <div className="mt-20 text-center">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.8em]">LogisPro Intelligence Matrix • Payout Protocol v5.1</p>
        </div>
    </div>
    )
  }

  return (
    <>
    <div className="print:hidden">
    <DashboardLayout>
      {/* Tactical Payout Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-[#0a0518]/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/5 shadow-2xl relative group ring-1 ring-white/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl shadow-lg">
                    <Wallet className="text-indigo-400" size={20} />
                </div>
                <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">AP COMMAND CENTRE</h2>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                {t('billing_driver.title')}
            </h1>
            <p className="text-slate-500 font-bold text-sm tracking-wide opacity-80 uppercase tracking-widest leading-relaxed">
              {t('billing_driver.subtitle')}
            </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <PremiumButton 
                variant="outline" 
                className="h-16 px-10 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white gap-3 transition-all duration-300 ring-1 ring-white/5"
                onClick={() => router.push('/billing/driver/history')}
            >
                <History className="w-6 h-6" /> 
                <span className="font-black uppercase tracking-widest text-[10px]">{t('billing_driver.payment_history')}</span>
            </PremiumButton>
        </div>
      </div>

      {/* Settlement Intelligence Filters */}
      <div className="glass-panel border-white/5 rounded-[3rem] p-10 mb-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10 items-end">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">{t('billing_driver.settlement_mode')}</Label>
              <Select
                value={paymentModel}
                onValueChange={(value) => {
                    setPaymentModel(value as 'individual' | 'subcontractor')
                    setSelectedEntityId("")
                }}
              >
                <SelectTrigger className="w-full h-14 bg-white/5 border-white/5 text-white font-black rounded-2xl px-6 uppercase tracking-widest text-xs focus:ring-indigo-500/20 transition-all">
                  <SelectValue placeholder={t('billing_driver.settlement_mode').toUpperCase() + "..."} />
                </SelectTrigger>
                <SelectContent className="bg-[#0c061d] border-white/10 text-white font-black">
                  <SelectItem value="individual" className="hover:bg-indigo-500/20 focus:bg-indigo-500/20 uppercase tracking-widest text-[10px]">{t('billing_driver.individual_nodes')}</SelectItem>
                  <SelectItem value="subcontractor" className="hover:bg-indigo-500/20 focus:bg-indigo-500/20 uppercase tracking-widest text-[10px]">{t('billing_driver.partner_cluster')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">{paymentModel === 'individual' ? t('billing_driver.target_driver') : t('billing_driver.target_partner')}</Label>
              <Select
                value={selectedEntityId || "all"}
                onValueChange={(value) => setSelectedEntityId(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-full h-14 bg-white/5 border-white/5 text-white font-black rounded-2xl px-6 uppercase tracking-widest text-xs focus:ring-indigo-500/20 transition-all">
                  <SelectValue placeholder={t('billing_driver.locate_recipient')} />
                </SelectTrigger>
                <SelectContent className="bg-[#0c061d] border-white/10 text-white font-black">
                  <SelectItem value="all" className="hover:bg-indigo-500/20 focus:bg-indigo-500/20 uppercase tracking-widest text-[10px]">{t('billing_driver.all_sectors')}</SelectItem>
                  {paymentModel === 'individual' ? (
                      drivers.map(d => (
                          <SelectItem key={d.Driver_Name || ""} value={d.Driver_Name || ""} className="hover:bg-indigo-500/20 focus:bg-indigo-500/20 uppercase tracking-widest text-[10px]">{d.Driver_Name}</SelectItem>
                      ))
                  ) : (
                      subcontractors.map(s => (
                          <SelectItem key={s.Sub_ID} value={s.Sub_ID} className="hover:bg-indigo-500/20 focus:bg-indigo-500/20 uppercase tracking-widest text-[10px]">{s.Sub_Name}</SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 md:col-span-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Vector Start</Label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full h-14 bg-white/5 border-white/5 text-white font-black rounded-2xl px-6 uppercase tracking-widest text-xs focus:bg-white/10 transition-all"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Vector End</Label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full h-14 bg-white/5 border-white/5 text-white font-black rounded-2xl px-6 uppercase tracking-widest text-xs focus:bg-white/10 transition-all"
                        />
                    </div>
                </div>
            </div>
            <div>
              <PremiumButton variant="outline" className="border-white/5 w-full h-14 rounded-2xl gap-3">
                <Search className="w-5 h-5" /> 
                <span className="font-black uppercase tracking-widest text-[10px]">{t('billing_driver.execute_query')}</span>
              </PremiumButton>
            </div>
          </div>
      </div>

      {/* Payout Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="p-8 rounded-[3rem] border border-primary/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40">
            <div className="flex items-center justify-between mb-8">
                <div className="p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-primary/20 text-primary">
                    <Clock size={24} strokeWidth={2.5} />
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] text-primary font-black uppercase tracking-widest italic animate-pulse">PENDING PAYOUT</div>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Awaiting Settlement</p>
            <p className="text-4xl font-black text-white tracking-tighter leading-none">{pendingItems.length}</p>
        </div>

        <div className="p-8 rounded-[3rem] border border-indigo-500/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40">
            <div className="flex items-center justify-between mb-8">
                <div className="p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-indigo-500/20 text-indigo-400">
                    <Banknote size={24} strokeWidth={2.5} />
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] text-indigo-400 font-black uppercase tracking-widest italic">VALUATION</div>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{t('billing_driver.total_liability')}</p>
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
                <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[9px] text-white font-black uppercase tracking-widest italic">{t('billing_driver.active_target')}</div>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{t('billing_driver.selected_delta')} ({selectedItems.length})</p>
            <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-slate-500 mb-1">THB</span>
                <p className="text-4xl font-black text-white tracking-tighter leading-none">{selectedSubtotal.toLocaleString()}</p>
            </div>
        </div>

        <div className="p-8 rounded-[3rem] border border-rose-500/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40">
            <div className="flex items-center justify-between mb-8">
                <div className="p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-rose-500/20 text-rose-500">
                    <Percent size={24} strokeWidth={2.5} />
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] text-rose-500 font-black uppercase tracking-widest italic">{t('billing_driver.levy_deduction')}</div>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{t('billing_driver.wht_offset')}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-slate-500 mb-1">THB</span>
                <p className="text-4xl font-black text-white tracking-tighter leading-none">{selectedWithholding.toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Selected Command Interface */}
      {selectedItems.length > 0 && (
        <div className="mb-12 relative group animate-in fade-in slide-in-from-bottom-5">
            <div className="absolute inset-0 bg-primary/20 blur-[80px] pointer-events-none opacity-50" />
            <div className="relative bg-[#0a0518]/80 backdrop-blur-3xl border-2 border-primary/30 p-10 rounded-[4rem] shadow-[0_0_100px_rgba(255,30,133,0.2)] flex flex-wrap items-center justify-between gap-10">
                <div className="flex items-center gap-12">
                     <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">{t('billing_driver.settlement_base')}</p>
                        <p className="text-3xl font-black text-white tracking-tighter">฿{selectedSubtotal.toLocaleString()}</p>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="space-y-2 text-rose-500">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-60 text-slate-500">{t('billing_driver.tax_delta')}</p>
                        <p className="text-3xl font-black tracking-tighter">-฿{selectedWithholding.toLocaleString()}</p>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">{t('billing_driver.net_disbursement')}</p>
                        <p className="text-5xl font-black text-primary tracking-tighter premium-text-gradient">฿{selectedNetTotal.toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <button onClick={clearSelection} className="px-8 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                        {t('billing_driver.abort_payout')}
                    </button>
                    <PremiumButton onClick={handleCreatePayment} disabled={loading} className="h-20 px-12 rounded-[2rem] shadow-[0_20px_40px_rgba(255,30,133,0.3)] text-xl font-black tracking-widest">
                        {loading ? <Loader2 className="w-6 h-6 mr-4 animate-spin" /> : <Save size={24} className="mr-4" strokeWidth={3} />}
                        {t('billing_driver.process_disbursement')}
                    </PremiumButton>
                </div>
            </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="glass-panel rounded-[4rem] border-white/5 shadow-2xl overflow-hidden bg-[#0a0518]/20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-12 gap-8 relative z-10">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase premium-text-gradient">{t('billing_driver.ledger_title')}</h3>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">{t('billing_driver.registry_subtitle')}</p>
          </div>
          <div className="flex items-center flex-wrap gap-4">
            <PremiumButton variant="outline" size="sm" onClick={selectAll} className="h-12 px-8 rounded-xl border-white/5 bg-white/5 text-[10px] font-black tracking-widest uppercase">
                {t('billing_driver.select_all_nodes')}
            </PremiumButton>
            
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                    <button 
                        disabled={selectedItems.length === 0}
                        className="h-12 px-8 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all font-black tracking-widest uppercase text-[10px] flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Eye size={16} /> {t('billing_driver.preview_voucher')}
                    </button>
                </DialogTrigger>
                <DialogContent className="max-w-[210mm] max-h-[90vh] overflow-y-auto bg-white p-0 rounded-[2rem] ring-0 border-0">
                    <div className="p-4 bg-slate-100 flex items-center justify-between border-b sticky top-0 z-50 print:hidden text-slate-900">
                        <div className="flex items-center gap-3">
                             <ShieldCheck className="text-primary" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Digital Audit • Payout Verification v5.1</span>
                        </div>
                        <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                            <Activity size={18} />
                        </button>
                    </div>
                    <PaymentPreview />
                </DialogContent>
            </Dialog>

            <button 
                onClick={handleExportSCB}
                disabled={selectedItems.length === 0 || loading}
                className="h-12 px-8 rounded-xl bg-primary/20 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all font-black tracking-widest uppercase text-[10px] flex items-center gap-3 disabled:opacity-30"
            >
              <FileDown size={16} /> EXPORT SCB BULK
            </button>
            <button 
                onClick={handleExportCSV}
                disabled={selectedItems.length === 0}
                className="h-12 px-8 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all font-black tracking-widest uppercase text-[10px] flex items-center gap-3 disabled:opacity-30"
            >
              <Download size={16} /> EXPORT CSV
            </button>
          </div>
        </div>

        <div className="relative w-full overflow-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-12 py-10 w-20">
                    <input 
                      type="checkbox" 
                      className="w-6 h-6 rounded-lg bg-white/5 border-white/10 checked:bg-primary transition-all cursor-pointer accent-primary"
                      checked={selectedItems.length === pendingItems.length && pendingItems.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th className="px-8 py-10 text-[12px] font-black uppercase tracking-[0.1em] text-slate-500">{t('billing_driver.mission_hub')}</th>
                  <th className="px-8 py-10 text-[12px] font-black uppercase tracking-[0.1em] text-slate-500">{t('billing_driver.human_capital')}</th>
                  <th className="px-8 py-10 text-[12px] font-black uppercase tracking-[0.1em] text-slate-500">{t('billing_driver.asset_identity')}</th>
                  <th className="px-8 py-10 text-[12px] font-black uppercase tracking-[0.1em] text-slate-500 text-center">{t('billing_customer.timestamp')}</th>
                  <th className="px-8 py-10 text-[12px] font-black uppercase tracking-[0.1em] text-slate-500 text-right">{t('billing_driver.base_payout')}</th>
                  <th className="px-8 py-10 text-[12px] font-black uppercase tracking-[0.1em] text-slate-500 text-right">{t('billing_driver.disbursement')}</th>
                  <th className="px-12 py-10 text-[12px] font-black uppercase tracking-[0.1em] text-slate-500 text-center">{t('billing_driver.protocol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.map((item) => (
                  <tr key={item.Job_ID} className="group/row hover:bg-primary/[0.03] transition-all duration-500">
                    <td className="px-12 py-8">
                      <input
                        type="checkbox"
                        className="w-6 h-6 rounded-lg bg-white/5 border-white/10 checked:bg-primary transition-all cursor-pointer accent-primary"
                        checked={selectedItems.includes(item.Job_ID)}
                        onChange={() => toggleItem(item.Job_ID)}
                      />
                    </td>
                    <td className="px-8 py-8">
                        <span className="font-black text-white text-lg tracking-tighter group-hover/row:text-primary transition-colors font-display uppercase">{item.Job_ID}</span>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/5 rounded-xl group-hover/row:bg-primary/20 transition-colors">
                            <User className="w-5 h-5 text-slate-500 group-hover/row:text-primary transition-colors" />
                        </div>
                        <span className="font-black text-slate-300 text-sm uppercase tracking-tight">{item.Driver_Name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-4">
                        <Truck className="w-4 h-4 text-slate-600 group-hover/row:text-primary transition-colors" />
                        <span className="text-slate-500 font-black text-[11px] uppercase tracking-[0.2em]">{item.Vehicle_Plate || '-'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        {item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="px-8 py-8 text-right font-black text-slate-400 text-sm">
                      <span className="text-[9px] mr-2">THB</span>
                      {(item.Cost_Driver_Total || 0).toLocaleString()}
                    </td>
                    <td className="px-8 py-8 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-white tracking-tighter group-hover/row:text-indigo-400 transition-colors bg-white/5 px-4 py-1 rounded-xl">฿{getJobTotal(item).toLocaleString()}</span>
                            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-1">Net Flow</span>
                        </div>
                    </td>
                    <td className="px-12 py-8 text-center">
                      <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-[1.5rem] bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,30,133,0.1)] group-hover/row:scale-110 transition-all duration-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        {t('billing_driver.awaiting_cashflow')}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-40">
                      <div className="flex flex-col items-center gap-6 opacity-30">
                         <div className="p-8 bg-white/5 rounded-full border-2 border-white/5 animate-pulse">
                            <Wallet size={64} className="text-slate-500" strokeWidth={1} />
                         </div>
                         <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-xs">Zero Payout Vectors Detected</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>

        <div className="p-10 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-6">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.6em]">Driver Payout Matrix Node Registry v5.1</p>
                <div className="h-4 w-px bg-white/5" />
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">SECURE SETTLEMENT</span>
                </div>
            </div>
            <Zap size={18} className="text-primary opacity-20" />
        </div>
      </div>

      <div className="mt-20 text-center mb-24">
        <div className="inline-flex items-center gap-4 px-8 py-3 glass-panel rounded-full text-[9px] font-black text-slate-700 uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-opacity">
            <ShieldCheck size={14} className="text-primary" /> LogisPro Settlement Engine • Certified Disbursement Accuracy
        </div>
      </div>
    </DashboardLayout>
    </div>

    {/* Dedicated Print Matrix */}
    <div className="hidden print:block printable-content fixed inset-0 bg-white z-[9999] p-0 font-sans antialiased">
        <PaymentPreview />
    </div>
    </>
  )
}
