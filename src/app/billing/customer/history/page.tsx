"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Receipt,
  ArrowLeft,
  Printer,
  Search,
  Calendar,
  Undo2,
  CheckCircle2,
  Mail
} from "lucide-react"
import { getBillingNotes, BillingNote, updateBillingNoteStatus, recallBillingNote } from "@/lib/supabase/billing"
import { toast } from "sonner"
import { isSuperAdmin } from "@/lib/permissions"
import { BillingActions } from "@/components/billing/billing-actions"

export default function CustomerBillingHistory() {
  const router = useRouter()
  const [notes, setNotes] = useState<BillingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
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
        const data = await getBillingNotes()
        setNotes(data)
    } catch (error) {
        console.error("Failed to load billing history", error)
        toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
        setLoading(false)
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
    n.Billing_Note_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.Customer_Name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'Paid':
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ชำระแล้ว</span>
        case 'Pending':
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">รอดำเนินการ</span>
        default:
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">{status}</span>
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Receipt className="text-emerald-400" />
            ประวัติการวางบิลลูกค้า
          </h1>
          <p className="text-sm text-slate-400 mt-1">รายการใบวางบิลที่สร้างแล้วทั้งหมด</p>
        </div>
        <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300"
            onClick={() => router.back()}
        >
            <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardContent className="p-4">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="ค้นหาเลขที่เอกสาร หรือ ชื่อลูกค้า..." 
                        className="w-full h-10 pl-10 pr-4 rounded-md bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
            <CardTitle className="text-white text-lg">รายการใบวางบิล ({filteredNotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">เลขที่เอกสาร</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">วันที่ทำรายการ</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">ลูกค้า</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">ยอดเงิน</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">สถานะ</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">กำลังโหลด...</td>
                    </tr>
                ) : filteredNotes.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">ไม่พบข้อมูล</td>
                    </tr>
                ) : (
                    filteredNotes.map((item) => (
                    <tr key={item.Billing_Note_ID} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-emerald-400 font-mono">{item.Billing_Note_ID}</td>
                        <td className="py-3 px-4 text-slate-400 flex items-center gap-2">
                             <Calendar className="w-3 h-3" />
                             {new Date(item.Created_At).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">{item.Customer_Name}</td>
                        <td className="py-3 px-4 text-right text-white">
                            ฿{item.Total_Amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                            {getStatusBadge(item.Status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1">
                                {item.Status !== 'Paid' && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                        onClick={() => handleMarkAsPaid(item.Billing_Note_ID)}
                                        disabled={processingId === item.Billing_Note_ID}
                                        title="ทำจ่ายแล้ว"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                )}
                                
                                <BillingActions 
                                    billingNoteId={item.Billing_Note_ID}
                                    customerName={item.Customer_Name}
                                    customerEmail={item.Customer_Email}
                                    hidePrint={true}
                                    // Custom trigger since we use it in a table
                                    trigger={
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="text-blue-400 hover:text-blue-300"
                                            title="ส่งอีเมล"
                                        >
                                            <Mail className="w-4 h-4" />
                                        </Button>
                                    }
                                />

                                <Link href={`/billing/print/${item.Billing_Note_ID}`} target="_blank">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-slate-400 hover:text-white"
                                        title="พิมพ์"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </Button>
                                </Link>

                                {isAdmin && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => handleRecall(item.Billing_Note_ID)}
                                        disabled={processingId === item.Billing_Note_ID}
                                        title="ดึงรายการกลับ (Recall)"
                                    >
                                        <Undo2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
