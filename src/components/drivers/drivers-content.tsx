
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Plus,
  Phone,
  Truck,
} from "lucide-react"
import { getAllDrivers, getDriverStats, getDriverScore } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { getAllSubcontractors } from "@/lib/supabase/subcontractors"
import { DriverDialog } from "@/components/drivers/driver-dialog"
import { DriverActions } from "@/components/drivers/driver-actions"
import { SearchInput } from "@/components/ui/search-input"
import { Branch } from "@/lib/supabase/branches"
import { Pagination } from "@/components/ui/pagination"
import { createBulkDrivers } from "@/app/drivers/actions"
import { ExcelImport } from "@/components/ui/excel-import"
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

  const [{ data: drivers, count }, stats, vehicles, subcontractors] = await Promise.all([
    getAllDrivers(page, limit, query),
    getDriverStats(),
    getAllVehicles(),
    getAllSubcontractors(),
  ])

  // Fetch scores for all drivers
  const driversWithScores = await Promise.all(drivers.map(async (driver) => {
      const score = await getDriverScore(driver.Driver_ID)
      return { ...driver, score }
  }))

  const now = new Date()
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="text-blue-400" />
            จัดการคนขับ
          </h1>
          <p className="text-slate-400">รายชื่อและข้อมูลคนขับรถทั้งหมด</p>
        </div>

        <div className="flex gap-2">
            <ExcelImport 
                trigger={
                    <Button variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800">
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
          <p className="text-xs text-slate-400">ทั้งหมด</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-xs text-slate-400">พร้อมงาน</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.onJob}</p>
          <p className="text-xs text-slate-400">กำลังขับ</p>
        </div>
        <div className="rounded-xl p-4 bg-slate-500/10 border border-slate-500/20">
          <p className="text-2xl font-bold text-slate-400">{stats.total - stats.active}</p>
          <p className="text-xs text-slate-400">ไม่พร้อม/ลา</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหาชื่อ, เบอร์โทร..." />
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            ไม่พบข้อมูลคนขับ
          </div>
        ) : driversWithScores.map((driver) => (
          <Card key={driver.Driver_ID} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {driver.Image_Url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={driver.Image_Url} alt={driver.Driver_Name || ''} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      driver.Driver_Name?.charAt(0) || "?"
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{driver.Driver_Name}</h3>
                    <p className="text-xs text-slate-400">{driver.Driver_ID}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex flex-col items-end px-2 py-1 rounded-md ${
                        driver.score.totalScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                        driver.score.totalScore >= 60 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                    }`}>
                        <span className="text-xs font-bold leading-none">{driver.score.totalScore}</span>
                        <span className="text-[10px] opacity-80">คะแนน</span>
                    </div>
                    <DriverActions driver={driver} vehicles={vehicles.data} subcontractors={subcontractors} branches={branches} />
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-300">
                    <Phone size={14} className="text-slate-500" />
                    <span>{driver.Mobile_No || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                    <Truck size={14} className="text-slate-500" />
                  <span>{driver.Vehicle_Plate || "ไม่มีรถประจำ"}</span>
                </div>
                {driver.License_Expiry && (
                   <div className={`flex items-center gap-2 text-xs ${
                       new Date(driver.License_Expiry) < now ? 'text-red-400 font-bold' :
                       new Date(driver.License_Expiry) < thirtyDaysFromNow ? 'text-amber-400' : 'text-slate-500'
                   }`}>
                       <span>ใบขับขี่: {new Date(driver.License_Expiry).toLocaleDateString('th-TH')}</span>
                       {new Date(driver.License_Expiry) < now && <span>(หมดอายุ)</span>}
                       {new Date(driver.License_Expiry) >= now && new Date(driver.License_Expiry) < thirtyDaysFromNow && <span>(ใกล้หมด)</span>}
                   </div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500">ตรงเวลา</p>
                        <p className={`text-xs font-bold ${
                            driver.score.onTimeScore >= 90 ? 'text-emerald-400' : 'text-slate-300'
                        }`}>{driver.score.onTimeScore}%</p>
                    </div>
                    <div className="text-center border-l border-slate-800">
                        <p className="text-[10px] text-slate-500">ปลอดภัย</p>
                        <p className="text-xs font-bold text-slate-300">{driver.score.safetyScore}%</p>
                    </div>
                    <div className="text-center border-l border-slate-800">
                        <p className="text-[10px] text-slate-500">รับงาน</p>
                        <p className={`text-xs font-bold ${
                            driver.score.acceptanceScore >= 90 ? 'text-emerald-400' : 'text-slate-300'
                        }`}>{driver.score.acceptanceScore}%</p>
                    </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1 text-xs">
                  ดูประวัติ
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">
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
