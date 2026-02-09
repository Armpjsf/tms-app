"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Receipt,
  Download,
  Calendar,
  Building2,
  FileText,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  Banknote,
  Percent
} from "lucide-react"

interface BillingItem {
  Job_ID: string
  Customer_Name: string
  Plan_Date: string
  Route_Name: string
  Price_Cust_Total: number
  Extra_Charge_Cust: number
  Billing_Status: string
}

// Mock data - will be replaced with real Supabase data
const mockBillingData: BillingItem[] = [
  { Job_ID: "JOB-001", Customer_Name: "บริษัท ABC จำกัด", Plan_Date: "2026-02-01", Route_Name: "กรุงเทพ - ชลบุรี", Price_Cust_Total: 3500, Extra_Charge_Cust: 500, Billing_Status: "รอวางบิล" },
  { Job_ID: "JOB-002", Customer_Name: "บริษัท ABC จำกัด", Plan_Date: "2026-02-03", Route_Name: "กรุงเทพ - ระยอง", Price_Cust_Total: 4200, Extra_Charge_Cust: 200, Billing_Status: "รอวางบิล" },
  { Job_ID: "JOB-003", Customer_Name: "บริษัท XYZ จำกัด", Plan_Date: "2026-02-04", Route_Name: "กรุงเทพ - อยุธยา", Price_Cust_Total: 2800, Extra_Charge_Cust: 0, Billing_Status: "รอวางบิล" },
  { Job_ID: "JOB-004", Customer_Name: "บริษัท XYZ จำกัด", Plan_Date: "2026-02-05", Route_Name: "กรุงเทพ - นครปฐม", Price_Cust_Total: 2500, Extra_Charge_Cust: 300, Billing_Status: "วางบิลแล้ว" },
]

const WITHHOLDING_TAX_RATE = 0.01 // 1%

export default function CustomerBillingPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  // Get unique customers
  const customers = [...new Set(mockBillingData.map(item => item.Customer_Name))]

  // Filter data
  const filteredData = mockBillingData.filter(item => {
    if (selectedCustomer && item.Customer_Name !== selectedCustomer) return false
    if (dateFrom && item.Plan_Date < dateFrom) return false
    if (dateTo && item.Plan_Date > dateTo) return false
    return true
  })

  // Calculate totals
  const pendingItems = filteredData.filter(i => i.Billing_Status === "รอวางบิล")
  const pendingTotal = pendingItems.reduce((sum, i) => sum + i.Price_Cust_Total + i.Extra_Charge_Cust, 0)
  
  // Selected items calculations
  const selectedData = filteredData.filter(i => selectedItems.includes(i.Job_ID))
  const selectedSubtotal = selectedData.reduce((sum, i) => sum + i.Price_Cust_Total + i.Extra_Charge_Cust, 0)
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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Receipt className="text-emerald-400" />
            สรุปวางบิลลูกค้า
          </h1>
          <p className="text-sm text-slate-400 mt-1">สร้างเอกสารสรุปสำหรับวางบิลลูกค้า (หัก ณ ที่จ่าย 1%)</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm">ลูกค้า</Label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">ทั้งหมด</option>
                {customers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" /> วันที่เริ่มต้น
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm">วันที่สิ้นสุด</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="border-slate-700 w-full text-slate-300">
                <Search className="w-4 h-4 mr-2" /> ค้นหา
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{pendingItems.length}</p>
              <p className="text-xs text-slate-400">รอวางบิล</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">฿{pendingTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400">ยอดรอวางบิล</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">฿{selectedSubtotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400">ยอดที่เลือก ({selectedItems.length} รายการ)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Percent className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">฿{selectedWithholding.toLocaleString()}</p>
              <p className="text-xs text-slate-400">หัก ณ ที่จ่าย 1%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Summary Box */}
      {selectedItems.length > 0 && (
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/30 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-slate-400 text-xs">ยอดรวม</p>
                  <p className="text-white font-bold text-lg">฿{selectedSubtotal.toLocaleString()}</p>
                </div>
                <div className="text-slate-500">-</div>
                <div>
                  <p className="text-slate-400 text-xs">หัก ณ ที่จ่าย 1%</p>
                  <p className="text-red-400 font-bold text-lg">฿{selectedWithholding.toLocaleString()}</p>
                </div>
                <div className="text-slate-500">=</div>
                <div>
                  <p className="text-slate-400 text-xs">ยอดสุทธิ</p>
                  <p className="text-emerald-400 font-bold text-xl">฿{selectedNetTotal.toLocaleString()}</p>
                </div>
              </div>
              <Button onClick={clearSelection} variant="ghost" className="text-slate-400 hover:text-white">
                ล้างการเลือก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-white">รายการงาน</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="border-slate-700 text-slate-300">
              เลือกทั้งหมด
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={selectedItems.length === 0}>
              <FileText className="w-4 h-4 mr-2" /> สร้างใบวางบิล
            </Button>
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" disabled={selectedItems.length === 0}>
              <Printer className="w-4 h-4 mr-2" /> พิมพ์
            </Button>
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" disabled={selectedItems.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                    <input 
                      type="checkbox" 
                      className="rounded bg-slate-800 border-slate-700"
                      checked={selectedItems.length === pendingItems.length && pendingItems.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Job ID</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">ลูกค้า</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">วันที่</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">เส้นทาง</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">ค่าขนส่ง</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">ค่าอื่นๆ</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">รวม</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.Job_ID} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        className="rounded bg-slate-800 border-slate-700"
                        checked={selectedItems.includes(item.Job_ID)}
                        onChange={() => toggleItem(item.Job_ID)}
                        disabled={item.Billing_Status !== "รอวางบิล"}
                      />
                    </td>
                    <td className="py-3 px-4 text-white font-medium">{item.Job_ID}</td>
                    <td className="py-3 px-4 text-slate-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      {item.Customer_Name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.Plan_Date}</td>
                    <td className="py-3 px-4 text-slate-300">{item.Route_Name}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">
                      ฿{item.Price_Cust_Total.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400">
                      {item.Extra_Charge_Cust > 0 ? `฿${item.Extra_Charge_Cust.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-medium">
                      ฿{(item.Price_Cust_Total + item.Extra_Charge_Cust).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.Billing_Status === "รอวางบิล"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {item.Billing_Status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
