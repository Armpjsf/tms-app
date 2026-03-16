"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PremiumCard, PremiumCardHeader, PremiumCardTitle } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input" // Assuming Input is from ui/input
import {
  FileText,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  FileDown,
  ArrowLeft,
  Mail,
  Receipt,
  Undo2,
  CloudSync
} from "lucide-react"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getBillingNotes, BillingNote, updateBillingNoteStatus, recallBillingNote } from "@/lib/supabase/billing"
import { toast } from "sonner"
import { isAdmin as checkIsAdmin } from "@/lib/permissions"
import { BillingActions } from "@/components/billing/billing-actions"
import { manualSyncInvoice } from "@/app/settings/accounting/actions"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { exportToCSV } from "@/lib/utils/export"

export default function CustomerBillingHistory() {
  const router = useRouter()
  const [notes, setNotes] = useState<BillingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Filters State
  const [dateFrom, setDateFrom] = useState<string | undefined>("")
  const [dateTo, setDateTo] = useState<string | undefined>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const checkAdmin = useCallback(async () => {
    const adminStatus = await checkIsAdmin()
    setIsAdmin(adminStatus)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
        const filters = {
           dateFrom: dateFrom || undefined,
           dateTo: dateTo || undefined,
           status: statusFilter !== 'all' ? statusFilter : undefined
        }
        const data = await getBillingNotes(filters)
        setNotes(data)
    } catch {
        toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
        setLoading(false)
    }
  }, [dateFrom, dateTo, statusFilter])

  useEffect(() => {
    loadData()
    checkAdmin()
  }, [loadData, checkAdmin])

  const handleSyncToAccounting = async (id: string) => {
    setProcessingId(id)
    try {
        const res = await manualSyncInvoice(id)
        if (res.success) {
            toast.success("ส่งข้อมูลไประบบบัญชีสำเร็จ")
        } else {
            toast.error(res.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ")
        }
    } catch {
        toast.error("เกิดข้อผิดพลาด")
    } finally {
        setProcessingId(null)
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm("ยืนยันการเปลี่ยนสถานะเป็น 'ชำระเงินแล้ว'?")) return
    setProcessingId(id)
    try {
        const res = await updateBillingNoteStatus(id, "Paid")
        if (res.success) {
            toast.success("อัปเดตสถานะเรียบร้อย")
            loadData()
        } else {
            toast.error(res.error || "เกิดข้อผิดพลาด")
        }
    } catch {
        toast.error("เกิดข้อผิดพลาด")
    } finally {
        setProcessingId(null)
    }
  }

  const handleRecall = async (id: string) => {
    if (!confirm("⚠️ คำเตือน: คุณกำลังจะดึงรายการบิลนี้กลับไปแก้ไข\\n\\nเอกสารนี้จะถูกลบ และรายการงานในบิลจะกลับไปสถานะ 'รอวางบิล'\\nยืนยันการดำเนินการ?")) return
    setProcessingId(id)
    try {
        const res = await recallBillingNote(id)
        if (res.success) {
            toast.success("ดึงรายการกลับสำเร็จ")
            loadData()
        } else {
            toast.error(res.error || "เกิดข้อผิดพลาด")
        }
    } catch {
        toast.error("เกิดข้อผิดพลาด")
    } finally {
        setProcessingId(null)
    }
  }

  const filteredNotes = notes.filter(n =>
    n.Billing_Note_ID.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.Customer_Name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleExport = () => {
    if (filteredNotes.length === 0) {
      toast.error("ไม่มีข้อมูลให้ Export")
      return
    }
    const dataToExport = filteredNotes.map(note => ({
      'เลขที่เอกสาร': note.Billing_Note_ID,
      'วันที่เอกสาร': format(new Date(note.Billing_Date), "dd/MM/yyyy"),
      'ลูกค้า': note.Customer_Name,
      'จำนวนเงินรวม': note.Total_Amount,
      'สถานะ': note.Status === 'Paid' ? 'ชำระแล้ว' : note.Status === 'Pending' ? 'รอดำเนินการ' : note.Status,
    }))
    exportToCSV(dataToExport, `Billing_History_${new Date().toISOString().split('T')[0]}`)
    toast.success(`Export ${filteredNotes.length} รายการสำเร็จ`)
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'Paid':
            return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">ชำระแล้ว</Badge>
        case 'Pending':
            return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">รอดำเนินการ</Badge>
        default:
            return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">{status}</Badge>
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors mb-3 text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
          </button>
          <h1 className="text-4xl font-black text-slate-100 tracking-tighter flex items-center gap-4">
            <span className="p-3 bg-emerald-500 rounded-3xl shadow-xl shadow-emerald-500/20 text-white">
                <Receipt size={32} />
            </span>
            ประวัติการวางบิล
          </h1>
          <p className="text-slate-400 font-bold mt-2 ml-16 uppercase tracking-widest text-xs">Customer Billing Intelligence</p>
        </motion.div>

        <div className="flex items-center gap-3">
            <PremiumButton variant="outline" className="rounded-2xl" onClick={handleExport}>
                <FileDown size={18} className="mr-2" /> Export
            </PremiumButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Search & Filters */}
        <PremiumCard dark className="border-white/10">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="ค้นหาตามเลขที่เอกสาร หรือ ชื่อลูกค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-white/10 border-white/20 rounded-2xl focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-bold text-slate-100 placeholder:text-slate-500 shadow-inner"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <PremiumButton className="h-14 px-8 relative">
                    <Filter size={18} className="mr-2" /> ตัวกรอง
                    {(dateFrom || dateTo || statusFilter !== 'all') && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900" />
                    )}
                </PremiumButton>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-6 bg-slate-900 border-white/10 rounded-3xl shadow-2xl" align="end">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-100 uppercase tracking-widest text-xs">ตัวกรองข้อมูล</h4>
                    {(dateFrom || dateTo || statusFilter !== 'all') && (
                        <button 
                            onClick={() => {
                                setDateFrom("")
                                setDateTo("")
                                setStatusFilter("all")
                            }}
                            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase"
                        >
                            ล้างทั้งหมด
                        </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">สถานะ</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-12 font-bold text-slate-200">
                                <SelectValue placeholder="เลือกสถานะ" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 rounded-xl">
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                <SelectItem value="Pending">รอดำเนินการ</SelectItem>
                                <SelectItem value="Paid">ชำระแล้ว</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">ตั้งแต่วันที่</Label>
                            <Input 
                                type="date" 
                                value={dateFrom} 
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="bg-white/5 border-white/10 rounded-xl h-12 font-bold text-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">ถึงวันที่</Label>
                            <Input 
                                type="date" 
                                value={dateTo} 
                                onChange={(e) => setDateTo(e.target.value)}
                                className="bg-white/5 border-white/10 rounded-xl h-12 font-bold text-slate-200"
                            />
                        </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </PremiumCard>

        {/* Billing Notes List */}
        <PremiumCard dark className="p-0 overflow-hidden border-none shadow-2xl">
            <PremiumCardHeader className="p-8 border-b border-white/5 bg-white/5">
                <PremiumCardTitle dark icon={<FileText className="text-emerald-500" />}>
                   รายการใบวางบิลล่าสุด
                </PremiumCardTitle>
            </PremiumCardHeader>
            <div className="p-0">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="font-black text-slate-200 uppercase tracking-widest text-xs py-6 pl-8">เลขที่เอกสาร</TableHead>
                  <TableHead className="font-black text-slate-300 uppercase tracking-widest text-xs py-6">วันที่เอกสาร</TableHead>
                  <TableHead className="font-black text-slate-300 uppercase tracking-widest text-xs py-6">ลูกค้า</TableHead>
                  <TableHead className="font-black text-slate-300 uppercase tracking-widest text-xs py-6 text-right">จำนวนเงินรวม</TableHead>
                  <TableHead className="font-black text-slate-300 uppercase tracking-widest text-xs py-6 text-center">สถานะ</TableHead>
                  <TableHead className="font-black text-slate-300 uppercase tracking-widest text-xs py-6 text-right pr-8">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">กำลังโหลด...</TableCell>
                    </TableRow>
                 ) : filteredNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 gap-4">
                        <div className="p-4 bg-gray-50 rounded-full">
                           <FileText size={48} className="opacity-20" />
                        </div>
                        <p className="font-bold">ไม่พบรายการใบวางบิล</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotes.map((note) => (
                    <TableRow key={note.Billing_Note_ID} className="border-white/5 hover:bg-emerald-500/5 transition-colors group">
                      <TableCell className="font-black text-slate-100 py-6 pl-8">
                        {note.Billing_Note_ID}
                      </TableCell>
                      <TableCell className="text-slate-400 font-bold">
                        {format(new Date(note.Billing_Date), "dd MMM yyyy", { locale: th })}
                      </TableCell>
                      <TableCell>
                        <div className="font-black text-slate-100">{note.Customer_Name}</div>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-100 text-lg">
                        ฿{note.Total_Amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(note.Status)}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-2 transition-opacity">
                            {note.Status !== 'Paid' && (
                                <PremiumButton 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-9 w-9 p-0 rounded-xl"
                                    onClick={() => handleMarkAsPaid(note.Billing_Note_ID)}
                                    disabled={processingId === note.Billing_Note_ID}
                                    title="ทำจ่ายแล้ว"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </PremiumButton>
                            )}

                            <BillingActions 
                                billingNoteId={note.Billing_Note_ID}
                                customerEmail={note.Customer_Email}
                                customerName={note.Customer_Name}
                                hidePrint={true}
                                trigger={
                                    <PremiumButton size="sm" className="h-9 w-9 p-0 rounded-xl">
                                        <Mail className="w-4 h-4" />
                                    </PremiumButton>
                                }
                            />

                            <PremiumButton 
                                size="sm" 
                                variant="outline" 
                                className="h-9 w-9 p-0 rounded-xl"
                                onClick={() => handleSyncToAccounting(note.Billing_Note_ID)}
                                disabled={processingId === note.Billing_Note_ID}
                                title="ส่งไประบบบัญชี"
                            >
                                <CloudSync className="w-4 h-4" />
                            </PremiumButton>

                            <Link href={`/billing/print/${note.Billing_Note_ID}`} target="_blank">
                                <PremiumButton size="sm" variant="secondary" className="h-9 px-4 rounded-xl">
                                    <ArrowRight className="w-4 h-4 mr-2" /> รายละเอียด
                                </PremiumButton>
                            </Link>

                            {isAdmin && (
                                <PremiumButton 
                                    size="sm" 
                                    variant="danger" 
                                    className="h-9 w-9 p-0 rounded-xl"
                                    onClick={() => handleRecall(note.Billing_Note_ID)}
                                    disabled={processingId === note.Billing_Note_ID}
                                    title="ดึงรายการกลับ (Recall)"
                                >
                                    <Undo2 className="w-4 h-4" />
                                </PremiumButton>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
        </PremiumCard>
      </div>
    </DashboardLayout>
  )
}
