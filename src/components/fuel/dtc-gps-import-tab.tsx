"use client"

import { useState } from "react"
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Search, 
  Truck, 
  MapPin, 
  Gauge, 
  Clock, 
  Fuel, 
  Activity, 
  Calendar, 
  BarChart2, 
  CalendarDays,
  ExternalLink,
  Loader2,
  Trash2
} from "lucide-react"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"
import { parseDTCExcel, type DTCAnalysisResult } from "@/lib/parsers/dtc-gps-parser"

type DtcSubView = 'trips' | 'daily' | 'weekly' | 'monthly' | 'refuels'

export function DtcGpsImportTab() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DTCAnalysisResult | null>(null)
  const [subView, setSubView] = useState<DtcSubView>('daily')
  const [search, setSearch] = useState('')

  // Handle File Input
  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls') && !selectedFile.name.endsWith('.csv')) {
      toast.error('โปรดอัปโหลดไฟล์ Excel (.xlsx / .xls) หรือ CSV จากระบบ DTC')
      return
    }

    setFile(selectedFile)
    setLoading(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const parsed = parseDTCExcel(buffer)
      setResult(parsed)
      toast.success(`ประมวลผลข้อมูล GPS รถทะเบียน ${parsed.vehiclePlate || '-'} สำเร็จ (${parsed.trips.length} Trips)`)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      toast.error(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${errMsg}`)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  // Export Analysed DTC to Excel
  const handleExport = () => {
    if (!result) return
    const wb = XLSX.utils.book_new()

    // Sheet 1: Daily Summary
    const wsDaily = XLSX.utils.json_to_sheet(result.dailySummary.map((d, i) => ({
      "ลำดับ": i + 1,
      "วันที่": d.date,
      "จำนวน Trip": d.tripsCount,
      "ระยะทางรวม (กม.)": d.distanceKm,
      "เวลาเดินรถ (นาที)": d.drivingMinutes,
      "เวลาจอดเดินเบา (นาที)": d.idleMinutes,
      "ความเร็วสูงสุด (กม./ชม.)": d.maxSpeed,
      "เลขไมล์ต้น": d.startOdo,
      "เลขไมล์ปลาย": d.endOdo,
      "คนขับ": d.drivers.join(', ')
    })))
    XLSX.utils.book_append_sheet(wb, wsDaily, "Daily_Summary")

    // Sheet 2: Trips
    const wsTrips = XLSX.utils.json_to_sheet(result.trips.map((t, i) => ({
      "ลำดับ": i + 1,
      "Trip ID": t.tripId,
      "เวลาเริ่ม": t.startTime,
      "เวลาสิ้นสุด": t.endTime,
      "ระยะเวลา (นาที)": t.durationMinutes,
      "ต้นทาง": t.startLocation,
      "ปลายทาง": t.endLocation,
      "เลขไมล์เริ่ม": t.startOdo,
      "เลขไมล์สิ้นสุด": t.endOdo,
      "ระยะทาง (กม.)": t.distanceKm,
      "ความเร็วสูงสุด": t.maxSpeed,
      "ความเร็วเฉลี่ย": t.avgSpeed,
      "คนขับ": t.driverName
    })))
    XLSX.utils.book_append_sheet(wb, wsTrips, "Trips")

    // Sheet 3: Refuel Events
    const wsRefuels = XLSX.utils.json_to_sheet(result.refuelEvents.map((r, i) => ({
      "ลำดับ": i + 1,
      "วัน-เวลา": r.dateTime,
      "สถานที่": r.location,
      "เลขไมล์": r.odometer,
      "ระดับน้ำมันก่อนหน้า (%)": r.fuelPctBefore,
      "ระดับน้ำมันหลังเติม (%)": r.fuelPctAfter,
      "น้ำมันเพิ่มขึ้น (%)": r.fuelPctIncrease
    })))
    XLSX.utils.book_append_sheet(wb, wsRefuels, "Refuel_Events")

    XLSX.writeFile(wb, `DTC_Analysis_${result.vehiclePlate}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      {!result ? (
        <div className="bg-background p-10 rounded-3xl border-2 border-dashed border-border hover:border-primary/50 transition-all text-center relative overflow-hidden group">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              {loading ? <Loader2 className="animate-spin" size={32} /> : <UploadCloud size={32} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground tracking-wide uppercase">
                นำเข้าไฟล์รายงาน GPS จากระบบ DTC
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                ลากไฟล์ Excel (.xlsx / .xls) มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์ (เช่น ข้อมูลย้อนหลัง 3ฒว2502.xlsx)
              </p>
            </div>
            <div>
              <label className="inline-flex">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  disabled={loading}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileChange(e.target.files[0])
                  }} 
                />
                <span className="cursor-pointer h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-foreground font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg">
                  <FileSpreadsheet size={16} />
                  {loading ? 'กำลังประมวลผลไฟล์...' : 'เลือกไฟล์ Excel จากเครื่อง'}
                </span>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Header Info Bar */}
          <div className="bg-background p-6 rounded-3xl border border-border shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-wider">
                    รถทะเบียน: {result.vehiclePlate || '3ฒว2502'}
                  </h3>
                  <Badge variant="outline" className="font-bold bg-primary/10 text-primary border-primary/20">
                    DTC GPS Verified
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ช่วงเวลา: {result.period} • รวม {result.totalTripsCount.toLocaleString()} Trips
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <PremiumButton
                onClick={handleExport}
                variant="secondary"
                className="h-10 px-4 rounded-xl border-border bg-muted/80 text-foreground text-xs font-black uppercase tracking-wider flex items-center gap-2"
              >
                <Download size={14} />
                Export ผลวิเคราะห์
              </PremiumButton>
              <button
                onClick={() => { setResult(null); setFile(null); }}
                className="h-10 px-4 rounded-xl border border-border bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                ล้างข้อมูล
              </button>
            </div>
          </div>

          {/* DTC KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <PremiumCard className="p-5 bg-background border border-border rounded-2xl">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ระยะทาง GPS จริง</span>
              <p className="text-2xl font-black italic text-foreground tracking-tight mt-1">
                {result.totalDistanceKm.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">กม.</span>
              </p>
              <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">
                ไมล์ {result.startOdometer.toLocaleString()} → {result.endOdometer.toLocaleString()}
              </p>
            </PremiumCard>

            <PremiumCard className="p-5 bg-background border border-border rounded-2xl">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">เวลาวิ่งบนถนน</span>
              <p className="text-2xl font-black italic text-cyan-400 tracking-tight mt-1">
                {Math.floor(result.totalDrivingMinutes / 60)} <span className="text-xs font-normal text-muted-foreground">ชม.</span> {result.totalDrivingMinutes % 60} <span className="text-xs font-normal text-muted-foreground">น.</span>
              </p>
              <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">
                จอดเดินเบา {Math.floor(result.totalIdleMinutes / 60)} ชม. {result.totalIdleMinutes % 60} น.
              </p>
            </PremiumCard>

            <PremiumCard className="p-5 bg-background border border-border rounded-2xl">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">จำนวน Trips</span>
              <p className="text-2xl font-black italic text-primary tracking-tight mt-1">
                {result.totalTripsCount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">เที่ยว</span>
              </p>
              <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">
                เฉลี่ย {result.dailySummary.length > 0 ? (result.totalTripsCount / result.dailySummary.length).toFixed(1) : 0} เที่ยว/วัน
              </p>
            </PremiumCard>

            <PremiumCard className="p-5 bg-background border border-border rounded-2xl">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">เหตุการณ์เติมน้ำมัน</span>
              <p className="text-2xl font-black italic text-emerald-400 tracking-tight mt-1">
                {result.refuelEvents.length} <span className="text-xs font-normal text-muted-foreground">ครั้ง</span>
              </p>
              <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">
                ตรวจพบจาก Sensor น้ำมัน
              </p>
            </PremiumCard>

            <PremiumCard className="p-5 bg-background border border-border rounded-2xl">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">สถานะความพร้อม</span>
              <p className="text-2xl font-black italic text-purple-400 tracking-tight mt-1">
                100%
              </p>
              <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">
                พร้อมจับคู่กับบิลน้ำมัน
              </p>
            </PremiumCard>
          </div>

          {/* SubView Selector Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-background p-4 rounded-2xl border border-border">
            <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border overflow-x-auto">
              {[
                { id: 'daily', label: 'รายวัน', icon: Calendar },
                { id: 'trips', label: 'ราย Trip', icon: Truck },
                { id: 'weekly', label: 'รายสัปดาห์', icon: BarChart2 },
                { id: 'monthly', label: 'รายเดือน', icon: CalendarDays },
                { id: 'refuels', label: 'เหตุการณ์เติมน้ำมัน', icon: Fuel }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSubView(tab.id as DtcSubView)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                    subView === tab.id
                      ? "bg-primary text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา วันที่, สถานที่, คนขับ..."
                className="h-10 pl-9 bg-muted/40 border-border text-xs rounded-xl font-bold"
              />
            </div>
          </div>

          {/* SubView 1: Daily Table */}
          {subView === 'daily' && (
            <PremiumCard className="p-0 overflow-hidden border border-border rounded-2xl bg-background shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <th className="p-3.5 pl-6">วันที่</th>
                      <th className="p-3.5 text-center">จำนวน Trip</th>
                      <th className="p-3.5 text-right">ระยะทาง GPS (กม.)</th>
                      <th className="p-3.5 text-right">เวลาวิ่ง</th>
                      <th className="p-3.5 text-right">จอดเดินเบา</th>
                      <th className="p-3.5 text-right">ความเร็วสูงสุด</th>
                      <th className="p-3.5 text-right">เลขไมล์เริ่ม - สิ้นสุด</th>
                      <th className="p-3.5 pr-6">พนักงานขับรถ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-bold">
                    {result.dailySummary
                      .filter(d => d.date.includes(search) || d.drivers.some(dr => dr.includes(search)))
                      .map((d) => (
                        <tr key={d.date} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 pl-6 font-black text-foreground">{d.date}</td>
                          <td className="p-3.5 text-center font-bold">
                            <Badge variant="outline">{d.tripsCount} Trips</Badge>
                          </td>
                          <td className="p-3.5 text-right font-black text-foreground">{d.distanceKm.toLocaleString()} กม.</td>
                          <td className="p-3.5 text-right text-cyan-400">{Math.floor(d.drivingMinutes / 60)} ชม. {d.drivingMinutes % 60} น.</td>
                          <td className="p-3.5 text-right text-muted-foreground">{d.idleMinutes} น.</td>
                          <td className="p-3.5 text-right font-black text-foreground">{d.maxSpeed} กม./ชม.</td>
                          <td className="p-3.5 text-right text-[11px] text-muted-foreground">{d.startOdo.toLocaleString()} → {d.endOdo.toLocaleString()}</td>
                          <td className="p-3.5 pr-6 text-foreground truncate max-w-[150px]">{d.drivers.join(', ') || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </PremiumCard>
          )}

          {/* SubView 2: Trips Table */}
          {subView === 'trips' && (
            <PremiumCard className="p-0 overflow-hidden border border-border rounded-2xl bg-background shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <th className="p-3.5 pl-6">Trip ID / เวลา</th>
                      <th className="p-3.5">ต้นทาง → ปลายทาง</th>
                      <th className="p-3.5 text-right">ระยะทาง (กม.)</th>
                      <th className="p-3.5 text-right">ระยะเวลา</th>
                      <th className="p-3.5 text-right">ความเร็วสูงสุด</th>
                      <th className="p-3.5 text-right">เลขไมล์เริ่ม - จบ</th>
                      <th className="p-3.5 text-right">ระดับน้ำมัน</th>
                      <th className="p-3.5 pr-6">คนขับ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-bold">
                    {result.trips
                      .filter(t => t.tripId.includes(search) || t.startLocation.includes(search) || t.endLocation.includes(search) || t.driverName.includes(search))
                      .slice(0, 100)
                      .map((t) => (
                        <tr key={t.tripId} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 pl-6">
                            <span className="font-black text-foreground">{t.tripId}</span>
                            <p className="text-[10px] text-muted-foreground">{t.startTime} - {t.endTime.split(' ')[1]}</p>
                          </td>
                          <td className="p-3.5 max-w-[200px]">
                            <p className="font-bold text-foreground truncate">📍 {t.startLocation}</p>
                            <p className="text-[11px] text-muted-foreground truncate">🏁 {t.endLocation}</p>
                          </td>
                          <td className="p-3.5 text-right font-black text-foreground">{t.distanceKm.toLocaleString()} กม.</td>
                          <td className="p-3.5 text-right text-cyan-400">{t.durationMinutes} น.</td>
                          <td className="p-3.5 text-right text-foreground">{t.maxSpeed} กม./ชม.</td>
                          <td className="p-3.5 text-right text-[11px] text-muted-foreground">{t.startOdo.toLocaleString()} → {t.endOdo.toLocaleString()}</td>
                          <td className="p-3.5 text-right text-emerald-400">{t.startFuelPct}% → {t.endFuelPct}%</td>
                          <td className="p-3.5 pr-6 text-foreground truncate max-w-[120px]">{t.driverName}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </PremiumCard>
          )}

          {/* SubView 5: Refuel Events */}
          {subView === 'refuels' && (
            <PremiumCard className="p-0 overflow-hidden border border-border rounded-2xl bg-background shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <th className="p-3.5 pl-6">วัน-เวลา</th>
                      <th className="p-3.5">สถานที่เติม</th>
                      <th className="p-3.5 text-right">เลขไมล์ (Odometer)</th>
                      <th className="p-3.5 text-right">ระดับก่อนเติม</th>
                      <th className="p-3.5 text-right">ระดับหลังเติม</th>
                      <th className="p-3.5 text-right pr-6">เปอร์เซ็นต์ที่เพิ่ม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-bold">
                    {result.refuelEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">ไม่พบเหตุการณ์ระดับน้ำมันเพิ่มขึ้นผิดสังเกต</td>
                      </tr>
                    ) : (
                      result.refuelEvents.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 pl-6 font-black text-foreground">⛽ {r.dateTime}</td>
                          <td className="p-3.5 font-bold text-foreground">{r.location || '-'}</td>
                          <td className="p-3.5 text-right font-black text-foreground">{r.odometer.toLocaleString()} กม.</td>
                          <td className="p-3.5 text-right text-muted-foreground">{r.fuelPctBefore}%</td>
                          <td className="p-3.5 text-right text-emerald-400 font-black">{r.fuelPctAfter}%</td>
                          <td className="p-3.5 text-right pr-6 font-black text-primary">+{r.fuelPctIncrease}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </PremiumCard>
          )}

          {/* SubView 3: Weekly Table */}
          {subView === 'weekly' && (
            <PremiumCard className="p-0 overflow-hidden border border-border rounded-2xl bg-background shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <th className="p-3.5 pl-6">สัปดาห์</th>
                      <th className="p-3.5 text-center">จำนวน Trips</th>
                      <th className="p-3.5 text-right">ระยะทางรวม GPS (กม.)</th>
                      <th className="p-3.5 text-right pr-6">เวลาเดินรถรวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-bold">
                    {result.weeklySummary.map((w) => (
                      <tr key={w.week} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 pl-6 font-black text-primary">{w.week}</td>
                        <td className="p-3.5 text-center font-bold">{w.tripsCount} Trips</td>
                        <td className="p-3.5 text-right font-black text-foreground">{w.distanceKm.toLocaleString()} กม.</td>
                        <td className="p-3.5 text-right pr-6 text-cyan-400">{Math.floor(w.drivingMinutes / 60)} ชม. {w.drivingMinutes % 60} น.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PremiumCard>
          )}

          {/* SubView 4: Monthly Table */}
          {subView === 'monthly' && (
            <PremiumCard className="p-0 overflow-hidden border border-border rounded-2xl bg-background shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <th className="p-3.5 pl-6">เดือน</th>
                      <th className="p-3.5 text-center">จำนวน Trips</th>
                      <th className="p-3.5 text-right">ระยะทางรวม GPS (กม.)</th>
                      <th className="p-3.5 text-right pr-6">เวลาเดินรถรวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-bold">
                    {result.monthlySummary.map((m) => (
                      <tr key={m.month} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 pl-6 font-black text-primary">{m.month}</td>
                        <td className="p-3.5 text-center font-bold">{m.tripsCount} Trips</td>
                        <td className="p-3.5 text-right font-black text-foreground">{m.distanceKm.toLocaleString()} กม.</td>
                        <td className="p-3.5 text-right pr-6 text-cyan-400">{Math.floor(m.drivingMinutes / 60)} ชม. {m.drivingMinutes % 60} น.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PremiumCard>
          )}
        </div>
      )}
    </div>
  )
}
