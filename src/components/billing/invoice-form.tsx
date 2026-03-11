
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
        <Card className="bg-white border-gray-200">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="text-gray-700">ลูกค้า (Customer)</Label>
                    <CustomerAutocomplete 
                        value={customerId}
                        onChange={setCustomerId}
                        customers={customers}
                        onSelect={(c) => setCustomerId(c.Customer_ID)}
                        className="bg-gray-100 border-gray-200"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-gray-700">วันที่ออกเอกสาร (Issue Date)</Label>
                    <DateCallbackSelect date={issueDate} setDate={setIssueDate} />
                </div>
                <div className="space-y-2">
                    <Label className="text-gray-700">วันครบกำหนด (Due Date)</Label>
                    <DateCallbackSelect date={dueDate} setDate={setDueDate} />
                </div>
            </CardContent>
        </Card>

        {/* Job Selection */}
        <Card className="bg-white border-gray-200">
            <CardContent className="p-0">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-purple-400" />
                        รายการงานที่วางบิลได้ ({availableJobs.length})
                    </h3>
                    <div className="text-xs text-gray-500">
                        เลือก {selectedJobs.length} รายการ
                    </div>
                </div>
                
                {fetchingJobs ? (
                    <div className="p-8 flex justify-center text-gray-400 gap-2">
                        <Loader2 className="animate-spin" /> กำลังโหลด...
                    </div>
                ) : (
                    <div className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Checkbox 
                                            checked={selectedJobIds.length === availableJobs.length && availableJobs.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedJobIds(availableJobs.map(j => j.Job_ID))
                                                else setSelectedJobIds([])
                                            }}
                                            className="border-slate-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                        />
                                    </TableHead>
                                    <TableHead className="text-gray-700">Job ID</TableHead>
                                    <TableHead className="text-gray-700">วันที่</TableHead>
                                    <TableHead className="text-gray-700">เส้นทาง</TableHead>
                                    <TableHead className="text-right text-gray-700">ราคา</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {availableJobs.map((job) => (
                                    <TableRow key={job.Job_ID} className="border-gray-200 hover:bg-gray-50">
                                        <TableCell>
                                            <Checkbox 
                                                checked={selectedJobIds.includes(job.Job_ID)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedJobIds([...selectedJobIds, job.Job_ID])
                                                    else setSelectedJobIds(selectedJobIds.filter(id => id !== job.Job_ID))
                                                }}
                                                className="border-slate-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{job.Job_ID}</TableCell>
                                        <TableCell>{new Date(job.Plan_Date).toLocaleDateString('th-TH')}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={job.Route_Name}>{job.Route_Name}</TableCell>
                                        <TableCell className="text-right font-medium">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
                 <div className="space-y-2">
                    <Label className="text-gray-700">หมายเหตุ (Notes)</Label>
                    <Input 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="bg-white border-gray-200" 
                        placeholder="ระบุหมายเหตุ..."
                    />
                 </div>
            </div>
            <Card className="bg-white border-gray-200 shadow-xl">
                <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>รวมราคา ({selectedJobs.length} รายการ)</span>
                        <span>{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">VAT {vatRate}%</span>
                        <div className="flex items-center gap-2">
                            {/* Toggle VAT? For now assumed on, edit rate 0-7 */}
                        </div>
                        <span>{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                         <div className="flex items-center gap-2">
                            <span className="text-gray-500">หัก ณ ที่จ่าย</span>
                            <select 
                                value={whtRate} 
                                onChange={(e) => setWhtRate(Number(e.target.value))}
                                className="h-6 text-xs bg-gray-100 border-gray-200 rounded text-white"
                            >
                                <option value="0">0%</option>
                                <option value="1">1% (ขนส่ง)</option>
                                <option value="3">3% (บริการ)</option>
                                <option value="5">5% (ค่าเช่า)</option>
                            </select>
                         </div>
                         <span className="text-red-400">-{whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
                        <div className="text-xs text-gray-400">
                            ยอดชำระสุทธิ (Net Total) <br/>
                            <span className="text-[10px]">(Grand Total: {grandTotal.toLocaleString()})</span>
                        </div>
                        <div className="text-xl font-bold text-purple-400">
                            {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <Button 
                        onClick={handleSubmit} 
                        disabled={loading || selectedJobs.length === 0}
                        className="w-full bg-purple-600 hover:bg-purple-700"
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
              "w-full justify-start text-left font-normal bg-gray-100 border-gray-200 hover:bg-slate-700",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: th }) : <span>เลือกวันที่</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white border-gray-200">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className="bg-white text-white"
          />
        </PopoverContent>
      </Popover>
    )
}
