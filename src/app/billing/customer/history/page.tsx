"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Receipt,
  ArrowLeft,
  Printer,
  FileText,
  Search,
  Calendar
} from "lucide-react"
import { getBillingNotes, BillingNote } from "@/lib/supabase/billing"

export default function CustomerBillingHistory() {
  const router = useRouter()
  const [notes, setNotes] = useState<BillingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
        const data = await getBillingNotes()
        setNotes(data)
    } catch (error) {
        console.error("Failed to load billing history", error)
    } finally {
        setLoading(false)
    }
  }

  const filteredNotes = notes.filter(n => 
    n.Billing_Note_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.Customer_Name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                                {item.Status}
                            </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-slate-400 hover:text-white"
                                onClick={() => window.open(`/billing/print/${item.Billing_Note_ID}`, '_blank')}
                            >
                                <Printer className="w-4 h-4" />
                            </Button>
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
