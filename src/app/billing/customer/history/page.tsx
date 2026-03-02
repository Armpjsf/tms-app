"use client"

import { useEffect, useState } from "react"
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
  Clock,
  AlertCircle,
  FileDown,
  Mail,
  Receipt,
  Undo2,
  CloudSync
} from "lucide-react"
import { getBillingNotes, BillingNote, updateBillingNoteStatus, recallBillingNote } from "@/lib/supabase/billing"
import { toast } from "sonner"
import { isSuperAdmin } from "@/lib/permissions"
import { BillingActions } from "@/components/billing/billing-actions"
import { manualSyncInvoice } from "@/app/settings/accounting/actions"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function CustomerBillingHistory() {
  const router = useRouter()
  const [notes, setNotes] = useState<BillingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const adminStatus = await isSuperAdmin()
    setIsAdmin(adminStatus)
  }

  const loadData = async () => {
    try {
        const data = await getBillingNotes() // Or getBillingNotesByFilter if filtering is done server-side
        setNotes(data)
    } catch (error) {
        console.error("Failed to load billing history", error)
        toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
        setLoading(false)
    }
  }

  const handleSyncToAccounting = async (id: string) => {
    setProcessingId(id)
    try {
        const res = await manualSyncInvoice(id)
        if (res.success) {
            toast.success("ส่งข้อมูลไประบบบัญชีสำเร็จ")
        } else {
            toast.error(res.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ")
        }
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
        toast.error("เกิดข้อผิดพลาด")
    } finally {
        setProcessingId(null)
    }
  }

  const filteredNotes = notes.filter(n =>
    n.Billing_Note_ID.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.Customer_Name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'Paid':
            return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">ชำระแล้ว</Badge>
        case 'Pending':
            return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">รอดำเนินการ</Badge>
        default:
            return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">{status}</Badge>
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
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-3xl shadow-xl shadow-emerald-500/20 text-white">
                <Receipt size={32} />
            </div>
            ประวัติการวางบิล
          </h1>
          <p className="text-gray-500 font-bold mt-2 ml-16 uppercase tracking-widest text-xs">Customer Billing Intelligence</p>
        </motion.div>

        <div className="flex items-center gap-3">
            <PremiumButton variant="outline" className="rounded-2xl">
                <FileDown size={18} className="mr-2" /> Export
            </PremiumButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Search & Filters */}
        <PremiumCard className="bg-white/40 border-white/40">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="ค้นหาตามเลขที่เอกสาร หรือ ชื่อลูกค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-white/50 border-gray-100 rounded-2xl focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-bold text-gray-900"
              />
            </div>
            <PremiumButton className="h-14 px-8">
                <Filter size={18} className="mr-2" /> ตัวกรอง
            </PremiumButton>
          </div>
        </PremiumCard>

        {/* Billing Notes List */}
        <PremiumCard className="p-0 overflow-hidden border-none shadow-2xl">
            <PremiumCardHeader className="p-8 border-b border-gray-50 bg-gray-50/30">
                <PremiumCardTitle icon={<FileText className="text-emerald-500" />}>
                   รายการใบวางบิลล่าสุด
                </PremiumCardTitle>
            </PremiumCardHeader>
            <div className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-gray-100 hover:bg-transparent">
                  <TableHead className="font-black text-gray-500 uppercase tracking-widest text-xs py-6 pl-8">เลขที่เอกสาร</TableHead>
                  <TableHead className="font-black text-gray-500 uppercase tracking-widest text-xs py-6">วันที่เอกสาร</TableHead>
                  <TableHead className="font-black text-gray-500 uppercase tracking-widest text-xs py-6">ลูกค้า</TableHead>
                  <TableHead className="font-black text-gray-500 uppercase tracking-widest text-xs py-6 text-right">จำนวนเงินรวม</TableHead>
                  <TableHead className="font-black text-gray-500 uppercase tracking-widest text-xs py-6 text-center">สถานะ</TableHead>
                  <TableHead className="font-black text-gray-500 uppercase tracking-widest text-xs py-6 text-right pr-8">จัดการ</TableHead>
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
                    <TableRow key={note.Billing_Note_ID} className="border-gray-50 hover:bg-emerald-50/30 transition-colors group">
                      <TableCell className="font-black text-gray-900 py-6 pl-8">
                        {note.Billing_Note_ID}
                      </TableCell>
                      <TableCell className="text-gray-600 font-bold">
                        {format(new Date(note.Billing_Date), "dd MMM yyyy", { locale: th })}
                      </TableCell>
                      <TableCell>
                        <div className="font-black text-gray-900">{note.Customer_Name}</div>
                      </TableCell>
                      <TableCell className="text-right font-black text-gray-900 text-lg">
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
                                    className="h-9 w-9 p-0 rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50"
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
                                trigger={
                                    <PremiumButton size="sm" variant="outline" className="h-9 w-9 p-0 rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50">
                                        <Mail className="w-4 h-4" />
                                    </PremiumButton>
                                }
                            />

                            <PremiumButton 
                                size="sm" 
                                variant="outline" 
                                className="h-9 w-9 p-0 rounded-xl border-blue-100 text-blue-600 hover:bg-blue-50"
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
