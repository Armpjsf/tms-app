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
import { parseDTCExcel, type DTCAnalysisResult, type DTCRefuelEvent } from "@/lib/parsers/dtc-gps-parser"
import { getFuelBillsForMatching, type FuelBillForMatch } from "@/lib/supabase/fuel"

type DtcSubView = 'trips' | 'daily' | 'weekly' | 'monthly' | 'refuels'

// แปลงวัน-เวลา DTC "DD/MM/YYYY HH:MM:SS" -> ms (รองรับปี พ.ศ.)
function dtcToMs(s: string): number {
  try {
    const [d, t] = s.split(' ')
    const [day, month, yearRaw] = d.split('/').map(Number)
    const year = yearRaw > 2500 ? yearRaw - 543 : yearRaw
    const [hh, mm, ss] = (t || '0:0:0').split(':').map(Number)
    return new Date(year, month - 1, day, hh || 0, mm || 0, ss || 0).getTime()
  } catch {
    return 0
  }
}

// จับคู่เหตุการณ์เติมจาก GPS กับบิลจริง แล้วคำนวณ km/L แบบ full-to-full
function matchRefuelsToBills(events: DTCRefuelEvent[], bills: FuelBillForMatch[]) {
  const pool = bills.map(b => ({ bill: b, used: false }))
  const ODO_TOLERANCE = 300      // กม.
  const DATE_TOLERANCE = 2 * 86400000 // 2 วัน

  const matched: DTCRefuelEvent[] = events.map(ev => {
    const evMs = dtcToMs(ev.dateTime)
    let best: (typeof pool)[number] | null = null
    let bestScore = Infinity

    for (const p of pool) {
      if (p.used) continue
      let score = Infinity
      // 1) จับคู่ด้วยเลขไมล์ (แม่นสุด ไม่ติดปัญหา timezone/พ.ศ.)
      if (p.bill.Odometer && ev.odometer) {
        const od = Math.abs(p.bill.Odometer - ev.odometer)
        if (od <= ODO_TOLERANCE) score = od
      }
      // 2) ถ้าไม่มีเลขไมล์ ใช้วันที่ใกล้สุดภายใน 2 วัน
      if (score === Infinity && p.bill.Date_Time && evMs) {
        const dd = Math.abs(new Date(p.bill.Date_Time).getTime() - evMs)
        if (dd <= DATE_TOLERANCE) score = 1000 + dd / 86400000
      }
      if (score < bestScore) { bestScore = score; best = p }
    }

    if (best && bestScore !== Infinity) {
      best.used = true
      const liters = best.bill.Liters || 0
      const kmPerLiter = liters > 0 && ev.distanceSinceLastKm > 0
        ? +(ev.distanceSinceLastKm / liters).toFixed(2)
        : null
      return {
        ...ev,
        matchedLogId: best.bill.Log_ID,
        matchedLiters: liters,
        matchedCost: best.bill.Price_Total || 0,
        matchedStation: best.bill.Station_Name || '',
        kmPerLiter
      }
    }
    return { ...ev, kmPerLiter: null }
  })

  const scored = matched.filter(m => m.kmPerLiter !== null && (m.matchedLiters || 0) > 0)
  const totalDist = scored.reduce((s, m) => s + m.distanceSinceLastKm, 0)
  const totalLiters = scored.reduce((s, m) => s + (m.matchedLiters || 0), 0)
  const avgKmPerLiter = totalLiters > 0 ? +(totalDist / totalLiters).toFixed(2) : null

  return { matched, avgKmPerLiter, matchedCount: scored.length, totalLiters: +totalLiters.toFixed(2) }
}

export function DtcGpsImportTab() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DTCAnalysisResult | null>(null)
  const [subView, setSubView] = useState<DtcSubView>('daily')
  const [search, setSearch] = useState('')
  const [matchedRefuels, setMatchedRefuels] = useState<DTCRefuelEvent[]>([])
  const [avgKmPerLiter, setAvgKmPerLiter] = useState<number | null>(null)
  const [matchedCount, setMatchedCount] = useState(0)

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

      // จับคู่เหตุการณ์เติมกับบิลจริง เพื่อคำนวณ km/L full-to-full
      try {
        const bills = await getFuelBillsForMatching(parsed.vehiclePlate)
        const { matched, avgKmPerLiter: avg, matchedCount: mc } = matchRefuelsToBills(parsed.refuelEvents, bills)
        setMatchedRefuels(matched)
        setAvgKmPerLiter(avg)
        setMatchedCount(mc)
      } catch {
        setMatchedRefuels(parsed.refuelEvents)
        setAvgKmPerLiter(null)
        setMatchedCount(0)
      }

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

    // Sheet 3: Refuel Events (พร้อม km/L full-to-full จากบิลจริง)
    const refuelsForExport = matchedRefuels.length > 0 ? matchedRefuels : result.refuelEvents
    const wsRefuels = XLSX.utils.json_to_sheet(refuelsForExport.map((r, i) => ({
      "ลำดับ": i + 1,
      "วัน-เวลา": r.dateTime,
      "สถานที่ (GPS)": r.location,
      "เลขไมล์ GPS": r.odometer,
      "ระยะตั้งแต่เติมก่อน (กม.)": r.distanceSinceLastKm || '',
      "ลิตร (บิลจริง)": r.matchedLiters ?? '',
      "ค่าน้ำมัน (บาท)": r.matchedCost ?? '',
      "ปั๊ม (บิล)": r.matchedStation ?? '',
      "km/L (full-to-full)": r.kmPerLiter ?? '',
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
                onClick={() => { setResult(null); setFile(null); setMatchedRefuels([]); setAvgKmPerLiter(null); setMatchedCount(0); }}
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
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">อัตราสิ้นเปลืองเฉลี่ย</span>
              <p className="text-2xl font-black italic text-purple-400 tracking-tight mt-1">
                {avgKmPerLiter !== null ? avgKmPerLiter.toFixed(2) : '—'} <span className="text-xs font-normal text-muted-foreground">km/L</span>
              </p>
              <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">
                {avgKmPerLiter !== null
                  ? `เติมเต็ม-ถึง-เติมเต็ม • จับคู่บิล ${matchedCount} รอบ`
                  : 'ยังไม่มีบิลน้ำมันจับคู่'}
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
                      <th className="p-3.5 text-right">เลขไมล์ GPS</th>
                      <th className="p-3.5 text-right">ระยะตั้งแต่เติมก่อน</th>
                      <th className="p-3.5 text-right">ลิตร (บิลจริง)</th>
                      <th className="p-3.5 text-right">%เพิ่ม</th>
                      <th className="p-3.5 text-right pr-6">km/L (full-to-full)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-bold">
                    {matchedRefuels.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">ไม่พบเหตุการณ์ระดับน้ำมันเพิ่มขึ้นผิดสังเกต</td>
                      </tr>
                    ) : (
                      matchedRefuels.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 pl-6 font-black text-foreground">⛽ {r.dateTime}</td>
                          <td className="p-3.5 font-bold text-foreground">
                            {r.location || '-'}
                            {r.matchedStation ? <span className="block text-[10px] text-muted-foreground font-normal">บิล: {r.matchedStation}</span> : null}
                          </td>
                          <td className="p-3.5 text-right font-black text-foreground">{r.odometer.toLocaleString()} กม.</td>
                          <td className="p-3.5 text-right text-cyan-400">{r.distanceSinceLastKm > 0 ? `${r.distanceSinceLastKm.toLocaleString()} กม.` : '—'}</td>
                          <td className="p-3.5 text-right">
                            {r.matchedLiters ? (
                              <span className="text-emerald-400 font-black">{r.matchedLiters.toLocaleString()} ล.</span>
                            ) : (
                              <span className="text-amber-400/70 text-[11px] font-normal">ไม่พบบิล</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right text-primary">+{r.fuelPctIncrease}%</td>
                          <td className="p-3.5 text-right pr-6 font-black">
                            {r.kmPerLiter != null ? (
                              <span className="text-purple-400">{r.kmPerLiter.toFixed(2)}</span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
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
