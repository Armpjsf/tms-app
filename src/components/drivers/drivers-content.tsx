
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Plus,
  Phone,
  Truck,
} from "lucide-react"
import { getAllDrivers, getDriverStats, getDriverScore, getDriverComplianceStats, getDriverEfficiencySummary } from "@/lib/supabase/drivers"
import { getDriverLeaderboard } from "@/lib/supabase/analytics"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { getAllSubcontractors } from "@/lib/supabase/subcontractors"
import { DriverDialog } from "@/components/drivers/driver-dialog"
import { DriverActions } from "@/components/drivers/driver-actions"
import { SearchInput } from "@/components/ui/search-input"
import { Branch } from "@/lib/supabase/branches"
import { Pagination } from "@/components/ui/pagination"
import { createBulkDrivers } from "@/app/drivers/actions"
import { ExcelImport } from "@/components/ui/excel-import"
import { DriverPerformanceSummary } from "@/components/analytics/driver-performance-summary"
import { FileSpreadsheet } from "lucide-react"

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
  branches?: Branch[]
  isSuperAdmin?: boolean
}

export async function DriversContent({ searchParams, branches = [], isSuperAdmin = false }: Props) {
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 12

  const branchId = searchParams.branch as string
  const [{ data: drivers, count }, stats, vehicles, subcontractors, leaderboard, compliance, efficiency] = await Promise.all([
    getAllDrivers(page, limit, query, branchId),
    getDriverStats(branchId),
    getAllVehicles(undefined, undefined, undefined, branchId),
    getAllSubcontractors(),
    getDriverLeaderboard(undefined, undefined), 
    getDriverComplianceStats(branchId),
    getDriverEfficiencySummary(branchId)
  ])

  // Fetch scores for all drivers
  const driversWithScores = await Promise.all(drivers.map(async (driver) => {
      const score = await getDriverScore(driver.Driver_ID)
      return { ...driver, score }
  }))

  // Pure date calculations for reference
  const getReferenceDates = () => {
    const d = new Date()
    const future = new Date()
    future.setDate(d.getDate() + 30)
    return { now: d, thirtyDaysFromNow: future }
  }
  const { now, thirtyDaysFromNow } = getReferenceDates()

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Users className="text-blue-500" />
            จัดการคนขับ {isSuperAdmin ? "(Super Admin)" : ""}
          </h1>
          <p className="text-muted-foreground">รายชื่อและข้อมูลคนขับรถทั้งหมด</p>
        </div>

      <div className="flex gap-2">
            <ExcelImport 
                trigger={
                    <Button variant="outline" className="gap-2 border-border hover:bg-muted">
                        <FileSpreadsheet size={16} /> 
                        นำเข้า Excel
                    </Button>
                }
                title="นำเข้าข้อมูลคนขับ"
                onImport={createBulkDrivers}
                templateData={[
                    { Driver_Name: "นาย สมชาย ใจดี", Mobile_No: "0812345678", Vehicle_Plate: "1กข-1234" },
                    { Driver_Name: "นางสาว สมหญิง รักงาน", Mobile_No: "0898765432", Vehicle_Plate: "" }
                ]}
                templateFilename="template_drivers.xlsx"
            />
            {isSuperAdmin && (
                <DriverDialog 
                    mode="create" 
                    vehicles={vehicles.data}
                    branches={branches}
                    subcontractors={subcontractors}
                    trigger={
                        <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                            <Plus size={20} />
                            เพิ่มคนขับ
                        </Button>
                    }
                />
            )}
        </div>
      </div>

      {isSuperAdmin && (
        <DriverPerformanceSummary 
          leaderboard={leaderboard} 
          compliance={compliance} 
          efficiency={efficiency} 
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20 shadow-sm">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
          <p className="text-xs text-muted-foreground">ทั้งหมด</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
          <p className="text-xs text-muted-foreground">พร้อมงาน</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20 shadow-sm">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.onJob}</p>
          <p className="text-xs text-muted-foreground">กำลังขับ</p>
        </div>
        <div className="rounded-xl p-4 bg-slate-500/10 border border-slate-500/20 shadow-sm">
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.total - stats.active}</p>
          <p className="text-xs text-muted-foreground">ไม่พร้อม/ลา</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหาชื่อ, เบอร์โทร..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            ไม่พบข้อมูลคนขับ
          </div>
        ) : driversWithScores.map((driver) => (
          <Card key={driver.Driver_ID} className="bg-card border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden">
                    {driver.Image_Url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={driver.Image_Url} alt={driver.Driver_Name || ''} className="w-full h-full object-cover" />
                    ) : (
                      driver.Driver_Name?.charAt(0) || "?"
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{driver.Driver_Name}</h3>
                    <p className="text-xs text-muted-foreground">{driver.Driver_ID}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex flex-col items-end px-2 py-1 rounded-md ${
                        driver.score.totalScore >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        driver.score.totalScore >= 60 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                        <span className="text-xs font-bold leading-none">{driver.score.totalScore}</span>
                        <span className="text-[10px] opacity-80">คะแนน</span>
                    </div>
                    <DriverActions driver={driver} vehicles={vehicles.data} subcontractors={subcontractors} branches={branches} />
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-foreground/80">
                    <Phone size={14} className="text-muted-foreground" />
                    <span>{driver.Mobile_No || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/80">
                    <Truck size={14} className="text-muted-foreground" />
                  <span>{driver.Vehicle_Plate || "ไม่มีรถประจำ"}</span>
                </div>
                 {driver.License_Expiry && (
                    <div className={`flex items-center gap-2 text-xs ${
                        new Date(driver.License_Expiry) < now ? 'text-red-600 dark:text-red-400 font-bold' :
                        new Date(driver.License_Expiry) < thirtyDaysFromNow ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                    }`}>
                        <span>ใบขับขี่: {new Date(driver.License_Expiry).toLocaleDateString('th-TH')}</span>
                        {new Date(driver.License_Expiry) < now && <span>(หมดอายุ)</span>}
                        {new Date(driver.License_Expiry) >= now && new Date(driver.License_Expiry) < thirtyDaysFromNow && <span>(ใกล้หมด)</span>}
                    </div>
                 )}
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border">
                    <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">ตรงเวลา</p>
                        <p className={`text-xs font-bold ${
                            driver.score.onTimeScore >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground/80'
                        }`}>{driver.score.onTimeScore}%</p>
                    </div>
                    <div className="text-center border-l border-border">
                        <p className="text-[10px] text-muted-foreground">ปลอดภัย</p>
                        <p className="text-xs font-bold text-foreground/80">{driver.score.safetyScore}%</p>
                    </div>
                    <div className="text-center border-l border-border">
                        <p className="text-[10px] text-muted-foreground">รับงาน</p>
                        <p className={`text-xs font-bold ${
                            driver.score.acceptanceScore >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground/80'
                        }`}>{driver.score.acceptanceScore}%</p>
                    </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1 text-xs bg-muted hover:bg-muted/80 text-foreground">
                  ดูประวัติ
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs border-border text-foreground">
                  ติดต่อ
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />
    </>
  )
}
