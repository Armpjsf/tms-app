"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Wallet,
  ArrowLeft,
  Printer,
  Search,
  Calendar,
  FileDown,
  CheckCircle2,
  Undo2,
  Loader2,
  CloudSync
} from "lucide-react"
import { getDriverPayments, DriverPayment, updateDriverPaymentStatus, recallDriverPayment, getDriverPaymentByIdWithJobs } from "@/lib/supabase/billing"
import { isSuperAdmin } from "@/lib/permissions"
import { toast } from "sonner"
import { manualSyncBill } from "@/app/settings/accounting/actions"

export default function DriverPaymentHistory() {
  const router = useRouter()
  const [payments, setPayments] = useState<DriverPayment[]>([])
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
        const data = await getDriverPayments()
        setPayments(data)
    } catch (error) {
        console.error("Failed to load driver payments history", error)
        toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
        setLoading(false)
    }
  }

  const handleSyncToAccounting = async (id: string) => {
    setProcessingId(id)
    try {
        const res = await manualSyncBill(id)
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
    if (!confirm("ยืนยันการเปลี่ยนสถานะเป็น 'จ่ายเงินรวมแล้ว'?")) return
    setProcessingId(id)
    try {
        const res = await updateDriverPaymentStatus(id, "Paid")
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
    if (!confirm("⚠️ คำเตือน: คุณกำลังจะดึงรายการจ่ายเงินนี้กลับไปแก้ไข\\n\\nเอกสารสรุปนี้จะถูกลบ และรายการงานจะกลับไปสถานะ 'รอจ่ายเงิน'\\nยืนยันการดำเนินการ?")) return
    setProcessingId(id)
    try {
        const res = await recallDriverPayment(id)
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

  const handlePrint = (id: string) => {
    window.open(`/billing/driver/print/${id}`, '_blank')
  }

  const handleExportSCB = async (id: string) => {
    setProcessingId(id)
    try {
        const data = await getDriverPaymentByIdWithJobs(id)
        if (!data) throw new Error("Could not fetch details")

        const { payment, jobs, bankInfo } = data
        const WITHHOLDING_TAX_RATE = 0.01

        if (!bankInfo.Bank_Account_No) {
            toast.error("ไม่สามารถ Export ได้เนื่องจากคนขับไม่มีเลขบัญชี")
            return
        }

        const subtotal = jobs.reduce((sum, j) => sum + (j.Cost_Driver_Total || 0), 0)
        const withholding = Math.round(subtotal * WITHHOLDING_TAX_RATE)
        const netTotal = subtotal - withholding

        // Format for SCB Mass Payout (Simple CSV)
        const lines = [
            "Bank Code,Account No,Amount,Beneficiary Name,Ref1,Ref2",
            `${bankInfo.Bank_Name || 'SCB'},${bankInfo.Bank_Account_No},${netTotal.toFixed(2)},${bankInfo.Bank_Account_Name || payment.Driver_Name},Salary,${payment.Driver_Payment_ID}`
        ]

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + lines.join("\n") // Add BOM for Excel Thai support
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `SCB_Export_${payment.Driver_Payment_ID}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success("เตรียมไฟล์ Export เรียบร้อย")
    } catch (e) {
        console.error(e)
        toast.error("Export ไม่สำเร็จ")
    } finally {
        setProcessingId(null)
    }
  }

  const filteredPayments = payments.filter(p => 
    p.Driver_Payment_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.Driver_Name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'Paid':
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">จ่ายเงินแล้ว</span>
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
            <Wallet className="text-indigo-400" />
            ประวัติการจ่ายเงินคนขับ
          </h1>
          <p className="text-sm text-slate-400 mt-1">รายการใบสรุปจ่ายที่สร้างแล้วทั้งหมด</p>
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
                        placeholder="ค้นหาเลขที่เอกสาร หรือ ชื่อคนขับ..." 
                        className="w-full h-10 pl-10 pr-4 rounded-md bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
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
            <CardTitle className="text-white text-lg">รายการใบสรุปจ่าย ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">เลขที่เอกสาร</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">วันที่ทำรายการ</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">คนขับ</th>
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
                ) : filteredPayments.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">ไม่พบข้อมูล</td>
                    </tr>
                ) : (
                    filteredPayments.map((item) => (
                    <tr key={item.Driver_Payment_ID} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-indigo-400 font-mono">{item.Driver_Payment_ID}</td>
                        <td className="py-3 px-4 text-slate-400 flex items-center gap-2">
                             <Calendar className="w-3 h-3" />
                             {new Date(item.Created_At).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">{item.Driver_Name}</td>
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
                                        onClick={() => handleMarkAsPaid(item.Driver_Payment_ID)}
                                        disabled={processingId === item.Driver_Payment_ID}
                                        title="ชำระเงินแล้ว"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                )}

                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-indigo-400 hover:text-indigo-300"
                                    onClick={() => handleSyncToAccounting(item.Driver_Payment_ID)}
                                    disabled={processingId === item.Driver_Payment_ID}
                                    title="ส่งไประบบบัญชี"
                                >
                                    <CloudSync className="w-4 h-4" />
                                </Button>
 
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-slate-400 hover:text-white" 
                                    title="Export SCB"
                                    onClick={() => handleExportSCB(item.Driver_Payment_ID)}
                                    disabled={processingId === item.Driver_Payment_ID}
                                >
                                    {processingId === item.Driver_Payment_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-slate-400 hover:text-white" 
                                    title="พิมพ์"
                                    onClick={() => handlePrint(item.Driver_Payment_ID)}
                                >
                                    <Printer className="w-4 h-4" />
                                </Button>

                                {isAdmin && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => handleRecall(item.Driver_Payment_ID)}
                                        disabled={processingId === item.Driver_Payment_ID}
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
