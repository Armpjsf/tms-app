"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  Download,
  Search,
  Filter,
  Package,
  Users,
  Truck,
  Fuel,
  Wrench,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
  TrendingUp,
} from "lucide-react"
import { getFilteredReportData, type ReportFilters } from "@/app/reports/actions"
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

// Helper: column display names (Thai)
const columnLabels: Record<string, string> = {
  Job_ID: 'รหัสงาน',
  Plan_Date: 'วันที่',
  Customer_Name: 'ลูกค้า',
  Origin_Location: 'ต้นทาง',
  Dest_Location: 'ปลายทาง',
  Route_Name: 'เส้นทาง',
  Driver_Name: 'คนขับ',
  Driver_ID: 'รหัสคนขับ',
  Vehicle_Plate: 'ทะเบียนรถ',
  Job_Status: 'สถานะ',
  Total_Cost: 'ราคา',
  Mobile_No: 'เบอร์โทร',
  License_No: 'เลขใบขับขี่',
  License_Expiry: 'หมดอายุใบขับขี่',
  Status: 'สถานะ',
  vehicle_plate: 'ทะเบียนรถ',
  vehicle_type: 'ประเภท',
  status: 'สถานะ',
  fuel_type: 'ชนิดน้ำมัน',
  insurance_expiry: 'ประกันหมดอายุ',
  registration_expiry: 'ทะเบียนหมดอายุ',
  fuel_date: 'วันที่เติม',
  driver_name: 'คนขับ',
  liters: 'ลิตร',
  amount: 'จำนวนเงิน',
  station: 'ปั๊ม',
  maintenance_type: 'ประเภทซ่อม',
  description: 'รายละเอียด',
  priority: 'ความเร่งด่วน',
  cost: 'ค่าใช้จ่าย',
  created_at: 'วันที่แจ้ง',
  owner: 'ประเภทรถ/เจ้าของ',
  fuel_cost: 'ค่าน้ำมัน',
  maintenance_cost: 'ค่าซ่อมบำรุง',
  extra_cost: 'ค่าใช้จ่ายอื่นๆ',
  total_cost: 'รวมค่าใช้จ่าย',
  price_per_liter: 'ราคา/ลิตร',
  odometer: 'เลขไมล์',
  Price_Cust_Total: 'ค่าเที่ยว',
  Extra_Cost_Amount: 'ค่าใช้จ่ายพิเศษ',
  Toll_Amount: 'ค่าทางด่วน',
  Distance_Km: 'ระยะทาง (KM)',
}

const reportTypes = [
  { key: 'jobs', label: 'งานจัดส่ง', icon: Package, color: 'indigo', hasDate: true, hasStatus: true },
  { key: 'drivers', label: 'คนขับ', icon: Users, color: 'blue', hasDate: false, hasStatus: true },
  { key: 'vehicles', label: 'รถ', icon: Truck, color: 'purple', hasDate: false, hasStatus: true },
  { key: 'fuel', label: 'น้ำมัน', icon: Fuel, color: 'emerald', hasDate: true, hasStatus: false },
  { key: 'maintenance', label: 'ซ่อมบำรุง', icon: Wrench, color: 'amber', hasDate: true, hasStatus: true },
  { key: 'vehicle_expenses', label: 'ค่าใช้จ่ายรถ', icon: TrendingUp, color: 'rose', hasDate: true, hasStatus: true },
]

const statusOptions: Record<string, { value: string; label: string }[]> = {
  jobs: [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'New', label: 'ใหม่' },
    { value: 'Assigned', label: 'มอบหมายแล้ว' },
    { value: 'In Transit', label: 'กำลังส่ง' },
    { value: 'Completed', label: 'เสร็จสิ้น' },
    { value: 'Delivered', label: 'ส่งแล้ว' },
    { value: 'Failed', label: 'ล้มเหลว' },
    { value: 'Cancelled', label: 'ยกเลิก' },
  ],
  drivers: [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'Active', label: 'พร้อมงาน' },
    { value: 'OnJob', label: 'กำลังทำงาน' },
    { value: 'Inactive', label: 'ไม่ใช้งาน' },
  ],
  vehicles: [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'Active', label: 'ใช้งาน' },
    { value: 'Maintenance', label: 'ซ่อมบำรุง' },
    { value: 'Inactive', label: 'ไม่ใช้งาน' },
  ],
  maintenance: [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'in_progress', label: 'กำลังซ่อม' },
    { value: 'completed', label: 'เสร็จสิ้น' },
  ],
  vehicle_expenses: [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'Company', label: 'รถบริษัท' },
    { value: 'Subcontractor', label: 'รถร่วม' },
  ],
}

function exportToCSV(data: Record<string, unknown>[], columns: string[], fileName: string) {
  const headers = columns.map(c => columnLabels[c] || c)
  const csvContent = [
    headers.join(','),
    ...data.map(row => columns.map(col => {
      const value = row[col]
      if (value === null || value === undefined) return ''
      const s = String(value)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }).join(','))
  ].join('\n')

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function exportToExcel(data: Record<string, unknown>[], columns: string[], fileName: string) {
  const headers = columns.map(c => columnLabels[c] || c)
  const rows = data.map(row => columns.map(col => row[col]))
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Report")
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportToPDF(elementId: string, fileName: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  })
  
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const imgProps = pdf.getImageProperties(imgData)
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
  
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Completed': 'bg-emerald-500/20 text-emerald-700 font-bold',
    'Delivered': 'bg-emerald-500/20 text-emerald-700 font-bold',
    'completed': 'bg-emerald-500/20 text-emerald-700 font-bold',
    'Active': 'bg-emerald-500/15 text-emerald-700 font-bold',
    'In Transit': 'bg-cyan-500/20 text-cyan-700 font-bold',
    'New': 'bg-emerald-500/20 text-emerald-700 font-bold',
    'Assigned': 'bg-violet-500/20 text-violet-700 font-bold',
    'OnJob': 'bg-cyan-500/20 text-cyan-700 font-bold',
    'Failed': 'bg-red-500/20 text-red-700 font-bold',
    'Cancelled': 'bg-red-500/20 text-red-700 font-bold',
    'cancelled': 'bg-red-500/20 text-red-700 font-bold',
    'Inactive': 'bg-slate-500/20 text-gray-700 font-bold',
    'Maintenance': 'bg-amber-500/20 text-amber-700 font-bold',
    'pending': 'bg-amber-500/20 text-amber-700 font-bold',
    'in_progress': 'bg-emerald-500/15 text-emerald-700 font-bold',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-lg font-bold font-medium ${styles[status] || 'bg-slate-500/20 text-gray-500'}`}>
      {status}
    </span>
  )
}

export function ReportBuilder() {
  const [selectedType, setSelectedType] = useState('jobs')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [showFilters, setShowFilters] = useState(true)

  const activeReport = reportTypes.find(r => r.key === selectedType)!

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: ReportFilters = {
        reportType: selectedType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: status !== 'all' ? status : undefined,
      }
      const result = await getFilteredReportData(filters)
      if (result.error) {
          setError(result.error)
          console.error('[Generate Report Error]', result.error, result.debug)
      } else {
          setData(result.data)
          setColumns(result.columns)
          setGenerated(true)
          setSortCol(null)
      }
    } catch (e: any) {
      setError(e.message || 'Error generating report')
      setData([])
      setColumns([])
    } finally {
      setLoading(false)
    }
  }, [selectedType, dateFrom, dateTo, status])

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(col)
      setSortAsc(true)
    }
  }

  // Filter + sort data
  const filteredData = data
    .filter(row => {
      if (!searchTerm) return true
      return columns.some(col => 
        String(row[col] ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
    .sort((a, b) => {
      if (!sortCol) return 0
      const va = a[sortCol] ?? ''
      const vb = b[sortCol] ?? ''
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
      return sortAsc ? cmp : -cmp
    })

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {reportTypes.map(rt => {
          const Icon = rt.icon
          const isActive = selectedType === rt.key
          return (
            <motion.button
              key={rt.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setSelectedType(rt.key); setGenerated(false); setStatus('all') }}
              className={`relative p-4 rounded-xl border transition-all text-left ${
                isActive
                  ? 'bg-blue-500/20 border-blue-400/50 ring-2 ring-blue-500/20'
                  : 'bg-white/5 border-slate-700 hover:border-slate-500 hover:bg-white/10'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-blue-400' : 'text-slate-300'} />
              <p className={`mt-2 text-xl font-black ${isActive ? 'text-white' : 'text-slate-100'}`}>
                {rt.label}
              </p>
              {isActive && (
                <motion.div layoutId="activeReport" className="absolute inset-0 rounded-xl border-2 border-primary/50" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Filter size={16} className="text-primary" />
              ตัวกรอง — {activeReport.label}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date From */}
                  {activeReport.hasDate && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-lg font-bold text-slate-300 font-black">จากวันที่</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="bg-background border-input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-lg font-bold text-slate-300 font-black">ถึงวันที่</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="bg-background border-input"
                        />
                      </div>
                    </>
                  )}

                  {/* Status */}
                  {activeReport.hasStatus && statusOptions[selectedType] && (
                    <div className="space-y-1.5">
                      <Label className="text-lg font-bold text-slate-300 font-black">สถานะ</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="bg-background border-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions[selectedType].map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Generate Button */}
                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/90 h-10"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin mr-2" size={16} />
                      ) : (
                        <BarChart3 className="mr-2" size={16} />
                      )}
                      สร้างรายงาน
                    </Button>
                  </div>
                </div>

                {/* Quick presets */}
                {activeReport.hasDate && (
                  <div className="flex gap-2 mt-3">
                    {[
                      { label: 'วันนี้', from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
                      { label: '7 วัน', from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
                      { label: '30 วัน', from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
                      { label: 'เดือนนี้', from: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`, to: new Date().toISOString().slice(0, 10) },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => { setDateFrom(preset.from); setDateTo(preset.to) }}
                        className="px-3 py-1 text-lg font-bold rounded-full bg-muted/50 hover:bg-muted text-gray-700 font-bold hover:text-foreground transition-colors border border-border"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Results */}
      <AnimatePresence mode="wait">
        {generated && (
          <motion.div
            key="report-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div id="report-to-pdf">
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-md">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2 text-white">
                      <FileSpreadsheet size={16} className="text-primary" />
                      ผลลัพธ์ ({filteredData.length.toLocaleString()} รายการ)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* Search within results */}
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="ค้นหาในผลลัพธ์..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 h-9 w-48 bg-background text-xl border-slate-800"
                        />
                        {searchTerm && (
                          <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      {/* Export Group */}
                      <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-lg border border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportToExcel(filteredData, columns, activeReport.label)}
                          className="h-8 px-2 text-lg font-bold gap-1.5 hover:bg-emerald-500/10 hover:text-emerald-400"
                        >
                          <FileSpreadsheet size={14} />
                          Excel
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportToCSV(filteredData, columns, activeReport.label)}
                          className="h-8 px-2 text-lg font-bold gap-1.5 hover:bg-blue-500/10 hover:text-emerald-500"
                        >
                          <Download size={14} />
                          CSV
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportToPDF('report-to-pdf', activeReport.label)}
                          className="h-8 px-2 text-lg font-bold gap-1.5 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Download size={14} />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredData.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-bold">
                      <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-slate-200">ไม่พบข้อมูล</p>
                      <p className="text-lg font-bold mt-1 text-slate-500">ลองปรับเงื่อนไขการค้นหา</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xl">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5">
                            <th className="px-4 py-3 text-left text-lg font-bold font-black text-slate-400 w-10">#</th>
                            {columns.map(col => (
                              <th
                                key={col}
                                onClick={() => handleSort(col)}
                                className="px-4 py-3 text-left text-lg font-bold font-black text-slate-200 cursor-pointer hover:text-white transition-colors group"
                              >
                                <span className="flex items-center gap-1">
                                  {columnLabels[col] || (col.startsWith('Extra_') ? col.replace('Extra_', '') : col)}
                                  <ArrowUpDown size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sortCol === col ? 'opacity-100 text-primary' : ''}`} />
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {filteredData.slice(0, 500).map((row: any, i) => (
                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2.5 text-lg font-bold text-slate-400">{i + 1}</td>
                              {columns.map(col => (
                                <td key={col} className="px-4 py-2.5 text-slate-200">
                                  {(col === 'Status' || col === 'status' || col === 'Job_Status' || col === 'priority') && row[col] ? (
                                    <StatusBadge status={String(row[col])} />
                                  ) : (col.toLowerCase().includes('cost') || col === 'amount' || col === 'Price_Cust_Total' || col.startsWith('Extra_')) ? (
                                    <span>฿{Number(row[col] || 0).toLocaleString()}</span>
                                  ) : (
                                    <span className="line-clamp-1">{String(row[col] ?? '—')}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-border bg-muted/40 font-bold">
                            <tr>
                                <td className="px-4 py-3 text-lg font-bold text-gray-700 font-black">รวม</td>
                                {columns.map(col => {
                                    const isNumeric = col.toLowerCase().includes('cost') || col === 'amount' || col === 'Price_Cust_Total' || col.startsWith('Extra_') || col === 'Liters';
                                    if (!isNumeric) return <td key={col} className="px-4 py-3"></td>;
                                    
                                    const total = filteredData.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
                                    return (
                                        <td key={col} className="px-4 py-3 text-primary">
                                            {col === 'Liters' ? `${total.toLocaleString()} ลิตร` : `฿${total.toLocaleString()}`}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                      </table>
                      {filteredData.length > 500 && (
                        <div className="px-4 py-3 border-t border-border bg-muted/20 text-center">
                          <p className="text-lg font-bold text-gray-700 font-bold">
                            แสดง 500 จาก {filteredData.length.toLocaleString()} รายการ — ดาวน์โหลด CSV เพื่อดูทั้งหมด
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

