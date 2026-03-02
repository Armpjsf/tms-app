import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { 
  Users, 
  Plus,
  Phone,
  Truck,
  Award,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
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
import { cn } from "@/lib/utils"

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
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-white/40 p-10 rounded-[2.5rem] border border-white/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl shadow-blue-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <Users size={32} />
            </div>
            Driver Elite {isSuperAdmin ? <span className="text-xl bg-blue-500/10 text-blue-600 px-3 py-1 rounded-xl align-middle ml-2">ADMIN</span> : ""}
          </h1>
          <p className="text-gray-500 font-bold ml-[4.5rem] uppercase tracking-[0.2em] text-[10px]">Human Resources • Performance Monitoring</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <ExcelImport 
                trigger={
                    <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl">
                        <FileSpreadsheet size={20} className="mr-2" /> 
                        Import Excel
                    </PremiumButton>
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
                        <PremiumButton className="h-14 px-8 rounded-2xl shadow-blue-500/20">
                            <Plus size={24} className="mr-2" />
                            เพิ่มคนขับ
                        </PremiumButton>
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

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "ทั้งหมด", value: stats.total, color: "blue", icon: Users },
          { label: "พร้อมงาน", value: stats.active, color: "emerald", icon: CheckCircle2 },
          { label: "กำลังขับ", value: stats.onJob, color: "amber", icon: Zap },
          { label: "ไม่พร้อม/ลา", value: stats.total - stats.active, color: "slate", icon: AlertCircle },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className="p-8 group text-center">
            <div className="flex flex-col items-center">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 text-white text-xl shadow-xl",
                    stat.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" :
                    stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                    stat.color === 'amber' ? "bg-amber-500 shadow-amber-500/20" : "bg-slate-500 shadow-slate-500/20"
                )}>
                    <stat.icon size={22} />
                </div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput placeholder="ค้นหาชื่อ, เบอร์โทร..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {drivers.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
             <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
             <p className="text-gray-400 font-black uppercase tracking-widest text-xs">ไม่พบข้อมูลคนขับในระบบ</p>
          </div>
        ) : driversWithScores.map((driver) => (
          <PremiumCard key={driver.Driver_ID} className="p-0 overflow-hidden group">
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-2xl shadow-blue-500/20 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 overflow-hidden border-2 border-white">
                    {driver.Image_Url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={driver.Image_Url} alt={driver.Driver_Name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{driver.Driver_Name?.charAt(0) || "?"}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter group-hover:text-blue-600 transition-colors line-clamp-1">{driver.Driver_Name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">{driver.Driver_ID}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                        <span className="text-blue-500 font-black text-[9px] uppercase tracking-wider italic">CERTIFIED</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className={cn(
                        "px-3 py-1.5 rounded-xl border flex flex-col items-center min-w-[60px] transition-all duration-500",
                        driver.score.totalScore >= 80 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/5' :
                        driver.score.totalScore >= 60 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/5' :
                        'bg-red-500/10 text-red-600 border-red-500/20'
                    )}>
                        <span className="text-xl font-black tracking-tighter leading-none">{driver.score.totalScore}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">SCORE</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                        <DriverActions driver={driver} vehicles={vehicles.data} subcontractors={subcontractors} branches={branches} />
                    </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                            <Phone size={14} />
                        </div>
                        <span className="text-sm font-black text-gray-700">{driver.Mobile_No || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600">
                            <Truck size={14} />
                        </div>
                        <span className="text-sm font-black text-gray-700">{driver.Vehicle_Plate || "NO ASSET"}</span>
                    </div>
                </div>

                {driver.License_Expiry && (
                    <div className={cn(
                        "px-4 py-3 rounded-xl border flex items-center justify-between transition-all duration-500",
                        new Date(driver.License_Expiry) < now ? 'bg-red-50 text-red-600 border-red-100' :
                        new Date(driver.License_Expiry) < thirtyDaysFromNow ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        'bg-gray-50 text-gray-500 border-gray-100'
                    )}>
                        <div className="flex items-center gap-2">
                            <Award size={14} className="opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">License Expiry</span>
                        </div>
                        <span className="text-[11px] font-black">{new Date(driver.License_Expiry).toLocaleDateString('th-TH')}</span>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "On Time", value: driver.score.onTimeScore, icon: Zap, color: "blue" },
                        { label: "Safety", value: driver.score.safetyScore, icon: ShieldCheck, color: "emerald" },
                        { label: "Accept", value: driver.score.acceptanceScore, icon: Award, color: "purple" }
                    ].map((metric, mIdx) => (
                        <div key={mIdx} className="text-center p-3 rounded-2xl bg-gray-50/50 border border-transparent group-hover:border-gray-100 group-hover:bg-white transition-all duration-500">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{metric.label}</p>
                            <div className="flex items-center justify-center gap-1">
                                <metric.icon size={10} className={cn(
                                    metric.color === 'blue' ? "text-blue-500" :
                                    metric.color === 'emerald' ? "text-emerald-500" : "text-purple-500"
                                )} />
                                <span className="text-sm font-black text-gray-900 tracking-tighter">{metric.value}%</span>
                            </div>
                        </div>
                    ))}
              </div>
            </div>

            <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50 flex gap-4">
                <PremiumButton variant="outline" size="sm" className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  View History
                </PremiumButton>
                <PremiumButton variant="outline" size="sm" className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 border-blue-100 hover:bg-blue-50">
                  Contact
                </PremiumButton>
            </div>
          </PremiumCard>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />
    </>
  )
}
