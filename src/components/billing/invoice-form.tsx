
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CustomerAutocomplete } from "@/components/customer-autocomplete"
import { toast } from "sonner"
import { getBillableJobsAction } from "@/app/billing/invoices/actions"
import { createInvoiceAction } from "@/app/billing/invoices/actions"
import { CalendarIcon, Loader2, Save, Trash2, Calculator } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { cn } from "@/lib/utils"

export function InvoiceForm({ customers }: { customers: { Customer_ID: string; Customer_Name: string }[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchingJobs, setFetchingJobs] = useState(false)
  
  // Data State
  const [customerId, setCustomerId] = useState("")
  const [availableJobs, setAvailableJobs] = useState<{ Job_ID: string; Customer_Name: string; Price_Cust_Total: number }[]>([])
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  
  // Invoice Details
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 30)))
  const [vatRate, setVatRate] = useState(7)
  const [whtRate, setWhtRate] = useState(0)
  const [notes, setNotes] = useState("")

  // Fetch Jobs when Customer Changes
  useEffect(() => {
    if (customerId) {
        setFetchingJobs(true)
        getBillableJobsAction(customerId).then(jobs => {
            setAvailableJobs(jobs || [])
            setFetchingJobs(false)
            // Auto Select All? Maybe not.
            setSelectedJobIds([])
        })
    } else {
        setAvailableJobs([])
        setSelectedJobIds([])
    }
  }, [customerId])

  // Calculation
  const selectedJobs = availableJobs.filter(j => selectedJobIds.includes(j.Job_ID))
  
  const subtotal = selectedJobs.reduce((sum, job) => sum + (Number(job.Price_Cust_Total) || 0), 0)
  const vatAmount = subtotal * (vatRate / 100)
  const grandTotal = subtotal + vatAmount
  const whtAmount = subtotal * (whtRate / 100)
  const netTotal = grandTotal - whtAmount

  const handleSubmit = async () => {
    if (!customerId || selectedJobs.length === 0) return

    setLoading(true)
    try {
        const result = await createInvoiceAction({
            Customer_ID: customerId,
            Issue_Date: issueDate.toISOString(),
            Due_Date: dueDate.toISOString(),
            Subtotal: subtotal,
            VAT_Rate: vatRate,
            VAT_Amount: vatAmount,
            Grand_Total: grandTotal,
            WHT_Rate: whtRate,
            WHT_Amount: whtAmount,
            Net_Total: netTotal,
            Status: 'Draft',
            Notes: notes,
            Items_JSON: selectedJobs as Record<string, unknown>[], // Snapshot
            Created_By: 'System' as string // Should be user ID
        })

        if (!result || !result.success) {
            toast.error("Error creating invoice: " + ((result?.error as Error)?.message || JSON.stringify(result?.error || 'Unknown error')))
        } else {
            router.push('/billing/invoices')
            router.refresh()
        }
    } catch (e) {
        toast.error("Exception: " + e)
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
        {/* Customer & Dates */}
        <Card className="bg-slate-900/50 border-white/10 shadow-2xl backdrop-blur-xl">
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                    <Label className="text-slate-400 font-black uppercase tracking-widest text-[10px]">ลูกค้า (Customer)</Label>
                    <CustomerAutocomplete 
                        value={customerId}
                        onChange={setCustomerId}
                        customers={customers}
                        onSelect={(c) => setCustomerId(c.Customer_ID)}
                        className="bg-white/5 border-white/10 rounded-2xl h-14 font-bold text-slate-100 placeholder:text-slate-500 focus:ring-purple-500/20"
                    />
                </div>
                <div className="space-y-3">
                    <Label className="text-slate-400 font-black uppercase tracking-widest text-[10px]">วันที่ออกเอกสาร (Issue Date)</Label>
                    <DateCallbackSelect date={issueDate} setDate={setIssueDate} />
                </div>
                <div className="space-y-3">
                    <Label className="text-slate-400 font-black uppercase tracking-widest text-[10px]">วันครบกำหนด (Due Date)</Label>
                    <DateCallbackSelect date={dueDate} setDate={setDueDate} />
                </div>
            </CardContent>
        </Card>

        {/* Job Selection */}
        <Card className="bg-slate-900/50 border-white/10 shadow-2xl overflow-hidden rounded-3xl">
            <CardContent className="p-0">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-black text-slate-100 flex items-center gap-3 uppercase tracking-widest text-xs">
                        <Calculator className="w-5 h-5 text-purple-400" />
                        รายการงานที่วางบิลได้ ({availableJobs.length})
                    </h3>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        เลือก {selectedJobs.length} รายการ
                    </div>
                </div>
                
                {fetchingJobs ? (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
                        <Loader2 className="animate-spin w-8 h-8 text-purple-500" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">กำลังโหลดข้อมูลงาน...</span>
                    </div>
                ) : (
                    <div className="p-0">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="w-16 pl-6">
                                        <Checkbox 
                                            checked={selectedJobIds.length === availableJobs.length && availableJobs.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedJobIds(availableJobs.map(j => j.Job_ID))
                                                else setSelectedJobIds([])
                                            }}
                                            className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                        />
                                    </TableHead>
                                    <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px] py-6">Job ID</TableHead>
                                    <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px] py-6">วันที่</TableHead>
                                    <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px] py-6">เส้นทาง</TableHead>
                                    <TableHead className="text-right text-slate-400 font-black uppercase tracking-widest text-[10px] py-6 pr-8">ราคา</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {availableJobs.map((job) => (
                                    <TableRow key={job.Job_ID} className="border-white/5 hover:bg-white/5 transition-colors group">
                                        <TableCell className="pl-6">
                                            <Checkbox 
                                                checked={selectedJobIds.includes(job.Job_ID)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedJobIds([...selectedJobIds, job.Job_ID])
                                                    else setSelectedJobIds(selectedJobIds.filter(id => id !== job.Job_ID))
                                                }}
                                                className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                            />
                                        </TableCell>
                                        <TableCell className="font-black text-slate-100 text-xs py-5">{job.Job_ID}</TableCell>
                                        <TableCell className="text-slate-400 font-bold">{new Date(job.Plan_Date).toLocaleDateString('th-TH')}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-slate-300 font-medium" title={job.Route_Name}>{job.Route_Name}</TableCell>
                                        <TableCell className="text-right font-black text-slate-100 pr-8">
                                            {Number(job.Price_Cust_Total).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Totals & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                 <div className="space-y-3">
                    <Label className="text-slate-400 font-black uppercase tracking-widest text-[10px]">หมายเหตุ (Notes)</Label>
                    <Input 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="bg-slate-900/50 border-white/10 rounded-2xl h-16 font-bold text-slate-100 placeholder:text-slate-600 focus:ring-purple-500/20" 
                        placeholder="ระบุหมายเหตุ หรือ รายละเอียดเพิ่มเติม..."
                    />
                 </div>
            </div>
            <Card className="bg-slate-900 border-white/10 shadow-2xl overflow-hidden rounded-3xl border-t-purple-500/30 border-t-2">
                <CardContent className="p-8 space-y-6">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>รวมราคา ({selectedJobs.length} รายการ)</span>
                        <span className="text-slate-300">฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="text-slate-500">VAT {vatRate}%</span>
                        <span className="text-slate-300">฿{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                         <div className="flex items-center gap-3">
                            <span className="text-slate-500">หัก ณ ที่จ่าย</span>
                            <select 
                                value={whtRate} 
                                onChange={(e) => setWhtRate(Number(e.target.value))}
                                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-[10px] font-black outline-none focus:border-purple-500/50 transition-colors"
                            >
                                <option value="0" className="bg-slate-900">0%</option>
                                <option value="1" className="bg-slate-900">1% (ขนส่ง)</option>
                                <option value="3" className="bg-slate-900">3% (บริการ)</option>
                                <option value="5" className="bg-slate-900">5% (ค่าเช่า)</option>
                            </select>
                         </div>
                         <span className="text-rose-400">-฿{whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="border-t border-white/5 pt-6 flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest underline decoration-purple-500/30 underline-offset-4">ยอดชำระสุทธิ (Net Total)</div>
                            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">(Grand Total: {grandTotal.toLocaleString()})</div>
                        </div>
                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-sm">
                            {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <Button 
                        onClick={handleSubmit} 
                        disabled={loading || selectedJobs.length === 0}
                        className="w-full h-14 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-[0.98]"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        สร้างใบกำกับภาษี (Create Invoice)
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}

function DateCallbackSelect({ date, setDate }: { date: Date | undefined, setDate: (d: Date | undefined) => void }) {
    return (
        <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full h-14 justify-start text-left font-bold bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl text-slate-100 transition-all",
              !date && "text-slate-500"
            )}
          >
            <CalendarIcon className="mr-3 h-5 w-5 text-purple-400" />
            {date ? format(date, "PPP", { locale: th }) : <span>เลือกวันที่</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 rounded-3xl shadow-2xl overflow-hidden" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className="bg-slate-900"
          />
        </PopoverContent>
      </Popover>
    )
}
