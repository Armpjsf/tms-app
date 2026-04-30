"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CustomerAutocomplete } from "@/components/customer-autocomplete"
import { toast } from "sonner"
import { getBillableJobsAction } from "@/app/billing/invoices/actions"
import { createInvoiceAction } from "@/app/billing/invoices/actions"
import { CalendarIcon, Loader2, Calculator, Zap, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

interface InvoiceFormProps {
    customers: { Customer_ID: string; Customer_Name: string }[]
    initialData?: {
        customerId?: string
        jobIds?: string[]
    }
    onSuccess?: () => void
}

export function InvoiceForm({ customers, initialData, onSuccess }: InvoiceFormProps) {
  const searchParams = useSearchParams()
  const initialCustomerId = initialData?.customerId || searchParams.get('customer') || ""
  const initialJobIds = initialData?.jobIds || searchParams.get('jobs')?.split(',') || []
  
  const { t } = useLanguage()
  const router = useRouter()

  const [customerId, setCustomerId] = useState(initialCustomerId)
  const [availableJobs, setAvailableJobs] = useState<(Record<string, any>)[]>([])
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>(initialJobIds)
  
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 30)))
  const [vatRate, setVatRate] = useState(0)
  const [discountRate, setDiscountRate] = useState<number>(0)
  const [whtRate, setWhtRate] = useState(0)
  const [notes, setNotes] = useState("")

  const [fetchingJobs, setFetchingJobs] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (customerId) {
        setFetchingJobs(true)
        getBillableJobsAction(customerId).then(jobs => {
            // Recalculate Price_Cust_Total for jobs where it's 0 OR where we want to trust the dynamic Price_Per_Unit
            const enriched = (jobs || []).map(j => {
                const qty = Number(j.Weight_Kg || j.Volume_Cbm || j.Loaded_Qty || 0)
                const unitPrice = Number(j.Price_Per_Unit || 0)
                const storedTotal = Number(j.Price_Cust_Total || 0)
                
                // If we have a unit price and either no total OR a mismatch, we suggest recalculation
                // However for initial load, if Price_Cust_Total exists and > 0, we respect it 
                // UNLESS it looks like it was using the old 16 rate while new rate is 17
                let finalTotal = storedTotal
                if (unitPrice > 0 && qty > 0) {
                    const expectedTotal = Number((qty * unitPrice).toFixed(2))
                    if (storedTotal === 0 || Math.abs(storedTotal - expectedTotal) > 0.1) {
                        finalTotal = expectedTotal
                    }
                }

                return {
                    ...j,
                    Price_Cust_Total: finalTotal
                }
            })

            setAvailableJobs(enriched)
            setFetchingJobs(false)
            if (initialJobIds.length > 0 && selectedJobIds.length === 0) {
                setSelectedJobIds(initialJobIds)
            }
        })
    } else {
        setAvailableJobs([])
        setSelectedJobIds([])
    }
  }, [customerId, initialJobIds.length])

  const parsePrice = (val: string | number | null | undefined) => {
    if (typeof val === 'number') return val
    if (typeof val === 'string') return Number(val.replace(/,/g, '')) || 0
    return 0
  }

  const selectedJobs = availableJobs.filter(j => selectedJobIds.includes(j.Job_ID))
  const subtotal = selectedJobs.reduce((sum, job) => {
      const storedPrice = parsePrice(job.Price_Cust_Total)
      if (storedPrice > 0) return sum + storedPrice
      const calculatedPrice = (Number(job.Price_Per_Unit || 0) * Number(job.Loaded_Qty || 0))
      return sum + calculatedPrice
  }, 0)
  
  const discountAmount = subtotal * (Number(discountRate || 0) / 100)
  const totalAfterDiscount = subtotal - discountAmount
  const vatAmount = totalAfterDiscount * (vatRate / 100)
  const grandTotal = totalAfterDiscount + vatAmount
  const whtAmount = totalAfterDiscount * (whtRate / 100)
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
            Discount_Amount: discountAmount,
            Discount_Rate: discountRate,
            VAT_Rate: vatRate,
            VAT_Amount: vatAmount,
            Grand_Total: grandTotal,
            WHT_Rate: whtRate,
            WHT_Amount: whtAmount,
            Net_Total: netTotal,
            Status: 'Draft',
            Notes: notes,
            Items_JSON: selectedJobs.map(job => {
                const storedPrice = parsePrice(job.Price_Cust_Total)
                const qty = Number(job.Weight_Kg || job.Volume_Cbm || job.Loaded_Qty || 0)
                const unitPrice = Number(job.Price_Per_Unit || 0)
                
                return {
                    ...job,
                    Price_Cust_Total: storedPrice > 0 ? storedPrice : (unitPrice * qty)
                }
            }), // Enhanced Snapshot
        })

        if (!result || !result.success) {
            toast.error("Error creating invoice: " + ((result?.error as Error)?.message || JSON.stringify(result?.error || 'Unknown error')))
        } else {
            toast.success("สร้างใบแจ้งหนี้เรียบร้อยแล้ว")
            if (onSuccess) {
                onSuccess()
            } else {
                router.push('/billing/invoices')
                router.refresh()
            }
        }
    } catch (e) {
        toast.error("Exception: " + e)
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
        <Card className="relative z-20 bg-card/50 border-border/10 shadow-xl backdrop-blur-xl rounded-2xl">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] font-bold ml-1">ลูกค้า (Customer)</Label>
                    <CustomerAutocomplete 
                        value={customerId}
                        onChange={setCustomerId}
                        customers={customers as any}
                        onSelect={(c) => setCustomerId(c.Customer_ID)}
                        className="bg-muted/50 border-border/10 rounded-xl h-11 text-xs font-bold text-muted-foreground placeholder:text-muted-foreground focus:ring-purple-500/20"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] font-bold ml-1">วันที่ออกเอกสาร (Issue Date)</Label>
                    <DateCallbackSelect date={issueDate} setDate={(d) => d && setIssueDate(d)} />
                </div>
                <div className="space-y-2">
                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] font-bold ml-1">วันครบกำหนด (Due Date)</Label>
                    <DateCallbackSelect date={dueDate} setDate={(d) => d && setDueDate(d)} />
                </div>
            </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/10 shadow-xl overflow-hidden rounded-2xl">
            <CardContent className="p-0">
                <div className="p-4 border-b border-border/5 flex justify-between items-center bg-muted/50">
                    <h3 className="font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest text-sm font-bold">
                        <Calculator className="w-4 h-4 text-purple-400" />
                        รายการงานที่วางบิลได้ ({availableJobs.length})
                    </h3>
                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            disabled={availableJobs.length === 0}
                            onClick={() => {
                                // We now force recalculate Price_Cust_Total based on Price_Per_Unit for ALL selected items
                                // specifically focusing on those that might have changed due to fuel rates
                                if (confirm(`คุณต้องการปรับปรุงราคาสำหรับ ${selectedJobs.length} รายการที่เลือก ตามราคาต่อหน่วยแนะนำหรือไม่?`)) {
                                    setAvailableJobs(prev => prev.map(j => {
                                        if (selectedJobIds.includes(j.Job_ID)) {
                                            const qty = Number(j.Weight_Kg || j.Volume_Cbm || j.Loaded_Qty || 0)
                                            const unitPrice = Number(j.Price_Per_Unit || 0)
                                            if (unitPrice > 0 && qty > 0) {
                                                return { ...j, Price_Cust_Total: Number((qty * unitPrice).toFixed(2)) }
                                            }
                                        }
                                        return j
                                    }))
                                    toast.success("ปรับปรุงราคาตามเรทน้ำมันเรียบร้อย")
                                }
                            }}
                            className="bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 group"
                        >
                            <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-700" />
                            Sync Item Prices
                        </button>
                        <div className="text-[10px] font-bold font-black text-muted-foreground uppercase tracking-widest bg-muted p-1.5 rounded-md border border-border/5">
                            เลือก {selectedJobIds.length} รายการ
                        </div>
                    </div>
                </div>
                
                {fetchingJobs ? (
                    <div className="p-10 flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Loader2 className="animate-spin w-6 h-6 text-purple-500" />
                        <span className="font-bold uppercase tracking-widest text-xs">กำลังโหลดข้อมูลงาน...</span>
                    </div>
                ) : (
                    <div className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="border-border/5 hover:bg-transparent">
                                    <TableHead className="w-12 pl-4">
                                            <Checkbox 
                                                checked={selectedJobIds.length === availableJobs.length && availableJobs.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedJobIds(availableJobs.map(j => j.Job_ID))
                                                    } else {
                                                        setSelectedJobIds([])
                                                    }
                                                }}
                                                className="border-border/20 scale-90 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                            />
                                        </TableHead>
                                        <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] py-3">Job ID</TableHead>
                                        <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] py-3">วันที่</TableHead>
                                        <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] py-3 text-center">จำนวน</TableHead>
                                        <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] py-3 text-right">ราคา/หน่วย</TableHead>
                                        <TableHead className="text-right text-muted-foreground font-black uppercase tracking-widest text-[10px] py-3 pr-6">ราคารวม</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {availableJobs.map((job) => {
                                        const isSelected = selectedJobIds.includes(job.Job_ID);
                                        const toggleSelection = () => {
                                            setSelectedJobIds(prev => 
                                                prev.includes(job.Job_ID) 
                                                    ? prev.filter(id => id !== job.Job_ID) 
                                                    : [...new Set([...prev, job.Job_ID])]
                                            );
                                        };

                                        const qty = Number(job.Weight_Kg || job.Volume_Cbm || job.Loaded_Qty || 1)
                                        const unitPrice = Number(job.Price_Per_Unit || 0)
                                        const storedPrice = Number(job.Price_Cust_Total || 0)
                                        const isPerItem = unitPrice > 0

                                        return (
                                            <TableRow 
                                                key={job.Job_ID} 
                                                className={cn(
                                                    "border-border/5 hover:bg-muted/50 transition-colors group cursor-pointer",
                                                    isSelected && "bg-purple-500/5 hover:bg-purple-500/10"
                                                )}
                                                onClick={toggleSelection}
                                            >
                                                <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox 
                                                        checked={isSelected}
                                                        onCheckedChange={toggleSelection}
                                                        className="border-border/20 scale-90 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-black text-muted-foreground text-xs py-3">
                                                    <div className="flex flex-col">
                                                        <span>{job.Job_ID}</span>
                                                        <span className="text-[8px] uppercase opacity-50 truncate max-w-[120px]">{job.Route_Name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground font-bold text-[10px]">{new Date(job.Plan_Date).toLocaleDateString('th-TH')}</TableCell>
                                                <TableCell className="text-center font-bold text-muted-foreground text-[10px]">
                                                    {isPerItem ? qty.toLocaleString() : '1 (เที่ยว)'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-muted-foreground text-[10px]">
                                                    {isPerItem ? unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-black text-muted-foreground pr-6">
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex items-center gap-1.5">
                                                            {storedPrice === 0 && isPerItem && (
                                                                <div className="p-0.5 px-1 bg-amber-500/20 text-amber-500 rounded-[2px] text-[7px] font-black animate-pulse flex items-center gap-0.5 uppercase tracking-tight">
                                                                    <Zap size={8} /> Auto
                                                                </div>
                                                            )}
                                                            <span className={cn("text-xs", storedPrice === 0 && !isPerItem ? "opacity-30" : "text-foreground")}>
                                                                {(storedPrice || (isPerItem ? qty * unitPrice : 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] font-bold ml-1">ภาษี (%)</Label>
                        <Select
                            value={String(vatRate)}
                            onValueChange={(v: string) => setVatRate(Number(v))}
                        >
                            <SelectTrigger className="bg-card/50 border-border/10 rounded-xl h-11 text-xs font-bold text-muted-foreground focus:ring-purple-500/20">
                                <SelectValue placeholder="เลือกอัตราภาษี" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border/10">
                                <SelectItem value="0" className="text-xs font-bold">ไม่มี (0%)</SelectItem>
                                <SelectItem value="7" className="text-xs font-bold">ภาษี 7%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] font-bold ml-1">ส่วนลด (Discount %)</Label>
                        <Input 
                            type="number"
                            value={discountRate} 
                            onChange={(e) => setDiscountRate(Number(e.target.value) || 0)} 
                            className="bg-card/50 border-border/10 rounded-xl h-11 text-xs font-bold text-muted-foreground focus:ring-purple-500/20" 
                            placeholder="0%"
                        />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-muted-foreground font-black uppercase tracking-widest text-[10px] font-bold ml-1">หมายเหตุ (Notes)</Label>
                    <Input 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="bg-card/50 border-border/10 rounded-xl h-11 text-xs font-bold text-muted-foreground placeholder:text-muted-foreground focus:ring-purple-500/20" 
                        placeholder="ระบุหมายเหตุ..."
                    />
                 </div>
            </div>
            <Card className="bg-card border-border/10 shadow-xl overflow-hidden rounded-2xl border-t-emerald-500/30 border-t-2">
                <CardContent className="p-6 space-y-4">
                     <div className="space-y-1.5 pb-3">
                        <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            <span>ราคารับจ้างขนส่ง</span>
                            <span>฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {Number(discountRate) > 0 && (
                            <div className="flex justify-between text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                <span>ส่วนลด ({discountRate}%)</span>
                                <span>-฿{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {vatRate > 0 && (
                            <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                <span>ภาษีมูลค่าเพิ่ม ({vatRate}%)</span>
                                <span>฿{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between text-xl font-black text-muted-foreground uppercase tracking-widest pt-3 border-t border-border/10">
                        <span className="text-xs">ยอดรวมสุทธิ</span>
                        <span className="text-foreground italic">฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="border-t border-border/5 pt-4">
                        <Button 
                            onClick={handleSubmit} 
                            disabled={loading || selectedJobs.length === 0}
                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-[0.98]"
                        >
                            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            สร้างใบแจ้งหนี้ (CREATE)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}

function DateCallbackSelect({ date, setDate }: { date: Date | undefined, setDate: (d: Date | undefined) => void }) {
    const { t } = useLanguage()
    return (
        <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full h-11 justify-start text-left font-black text-xs bg-muted/50 border-border/10 hover:bg-muted/80 rounded-xl text-muted-foreground transition-all uppercase tracking-widest",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-purple-400" />
            {date ? format(date, "PPP", { locale: th }) : <span>เลือกวันที่</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-card border-border/10 rounded-2xl shadow-xl overflow-hidden" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className="bg-card"
          />
        </PopoverContent>
      </Popover>
    )
}
