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
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2
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
  isAdmin?: boolean
}

export async function DriversContent({ searchParams, branches = [], isAdmin = false }: Props) {
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 12

  const branchId = searchParams.branch as string
  const [{ data: drivers, count }, stats, vehicles, subcontractors, leaderboard, compliance, efficiency] = await Promise.all([
    getAllDrivers(page, limit, query, branchId),
    getDriverStats(branchId),
    getAllVehicles(undefined, undefined, undefined, branchId),
    getAllSubcontractors(),
    getDriverLeaderboard(undefined, undefined, branchId), 
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
      {/* Bespoke Elite Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl shadow-blue-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <Users size={32} />
            </div>
            Driver ELITE {isAdmin ? <span className="text-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-xl align-middle ml-2 font-black">COMMAND</span> : ""}
            <span className="text-[8px] text-white/5 ml-4 uppercase tracking-tighter">V:200320-1048</span>
          </h1>
          <p className="text-blue-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Human Capital & Tactical Performance Control</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <span className="text-[10px] text-white/5 uppercase">d:area-start</span>
            <ExcelImport 
                trigger={
                    <PremiumButton variant="secondary" className="h-14 px-8 rounded-2xl">
                        <FileSpreadsheet size={20} className="mr-2" /> 
                        Fleet Import
                    </PremiumButton>
                }
                title="Import Personnel Data"
                onImport={createBulkDrivers}
                templateData={[
                    { 
                        Driver_ID: "DRV-001",
                        Driver_Name: "นาย สมชาย ใจดี", 
                        Mobile_No: "0812345678", 
                        Password: "password123",
                        Vehicle_Plate: "1กข-1234",
                        Expire_Date: "2025-12-31",
                        Sub_ID: "", 
                        Bank_Name: "KBank",
                        Bank_Account_No: "000-0-00000-0",
                        Bank_Account_Name: "นาย สมชาย ใจดี"
                    }
                ]}
                templateFilename="template_drivers.xlsx"
            />

            <DriverDialog 
                mode="create" 
                vehicles={vehicles.data}
                branches={branches}
                subcontractors={subcontractors}
                trigger={
                    <PremiumButton className="h-14 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20">
                        <Plus size={24} className="mr-2" />
                        REGISTER DRIVER (V2)
                    </PremiumButton>
                }
            />
            <span className="text-[10px] text-white/10 uppercase">d:area-end</span>
        </div>
      </div>

      <DriverPerformanceSummary 
        leaderboard={leaderboard} 
        compliance={compliance} 
        efficiency={efficiency} 
      />

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Fleet Personnel", value: stats.total, color: "blue", icon: Users },
          { label: "Active Operational", value: stats.active, color: "emerald", icon: CheckCircle2 },
          { label: "Deployment Live", value: stats.onJob, color: "amber", icon: Zap },
          { label: "Offline / Standby", value: stats.total - stats.active, color: "slate", icon: AlertCircle },
        ].map((stat, idx) => (
          <PremiumCard key={idx} className="p-8 group border-none bg-white/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className={cn(
                    "p-4 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 text-white",
                    stat.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" :
                    stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                    stat.color === 'amber' ? "bg-amber-500 shadow-amber-500/20" : "bg-slate-500 shadow-slate-500/20"
                )}>
                    <stat.icon size={24} />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/5 rounded-full border border-black/5">
                    <TrendingUp size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">REALTIME</span>
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{stat.value}</p>
            </div>
            {/* High-end numeric glow */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 text-7xl font-black text-slate-100/50 pointer-events-none select-none">
                0{idx + 1}
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Search Field */}
      <div className="mb-10">
        <SearchInput placeholder="Search Operator Name, Ident No..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {drivers.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-slate-950/5 rounded-br-[5rem] rounded-tl-[3rem] border border-dashed border-slate-200">
             <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active personnel found in the directory</p>
          </div>
        ) : driversWithScores.map((driver) => (
          <PremiumCard key={driver.Driver_ID} className="p-0 overflow-hidden group border-none bg-white rounded-br-[4rem] rounded-tl-[2rem] shadow-2xl relative">
            <div className="absolute top-4 right-4 opacity-100 z-20 bg-slate-950/10 rounded-full backdrop-blur-md border border-white/50 shadow-sm">
                 <DriverActions driver={driver} vehicles={vehicles.data} subcontractors={subcontractors} branches={branches} />
            </div>
            
            <div className="p-10">
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-3xl bg-slate-950 flex items-center justify-center text-white font-bold shadow-2xl transform group-hover:scale-110 transition-all duration-700 overflow-hidden border-2 border-slate-800 relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent pointer-events-none" />
                    {driver.Image_Url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={driver.Image_Url} alt={driver.Driver_Name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-black text-slate-500">{driver.Driver_Name?.charAt(0) || "?"}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-950 tracking-tighter group-hover:text-blue-600 transition-colors line-clamp-1 truncate max-w-[180px] uppercase">{driver.Driver_Name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-slate-400 font-black text-[10px] font-mono tracking-widest uppercase italic">ID: {driver.Driver_ID}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="text-blue-500 font-black text-[9px] uppercase tracking-widest leading-none bg-blue-500/10 px-2 py-0.5 rounded-full">ACTIVE DUTY</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 pr-10">
                    <div className={cn(
                        "p-4 rounded-[1.5rem] border flex flex-col items-center min-w-[80px] transition-all duration-500 shadow-2xl relative overflow-hidden group/score",
                        driver.score.totalScore >= 80 ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' :
                        driver.score.totalScore >= 60 ? 'bg-amber-500/5 text-amber-600 border-amber-500/20' :
                        'bg-red-500/5 text-red-600 border-red-500/20'
                    )}>
                        <span className="text-3xl font-black tracking-tighter leading-none relative z-10">{driver.score.totalScore}</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] relative z-10 mt-1 opacity-70">RATING</span>
                    </div>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                        <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
                            <Phone size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Digital Contact</span>
                            <span className="text-sm font-black text-slate-700 tracking-tight">{driver.Mobile_No || "-"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <Truck size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assigned Asset</span>
                            <span className="text-sm font-black text-slate-700 tracking-tight">{driver.Vehicle_Plate || "NONE"}</span>
                        </div>
                    </div>
                </div>
 
                {driver.Expire_Date && (
                    <div className={cn(
                        "px-6 py-4 rounded-2xl border flex items-center justify-between transition-all duration-500 relative overflow-hidden",
                        new Date(driver.Expire_Date) < now ? 'bg-red-500/5 text-red-600 border-red-500/20' :
                        new Date(driver.Expire_Date) < thirtyDaysFromNow ? 'bg-amber-500/5 text-amber-600 border-amber-500/20' : 
                        'bg-slate-50 text-slate-500 border-slate-100'
                    )}>
                        <div className="flex items-center gap-3">
                            <Award size={16} className="opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Qualification Expiry</span>
                        </div>
                        <span className="text-xs font-black tracking-widest font-mono">{new Date(driver.Expire_Date).toLocaleDateString('th-TH')}</span>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Stability", value: driver.score.onTimeScore, icon: Zap, color: "blue" },
                        { label: "Safety Ops", value: driver.score.safetyScore, icon: ShieldCheck, color: "emerald" },
                        { label: "Acceptance", value: driver.score.acceptanceScore, icon: Award, color: "purple" }
                    ].map((metric, mIdx) => (
                        <div key={mIdx} className="text-center p-4 rounded-3xl bg-slate-50/50 border border-transparent group-hover:border-slate-100 group-hover:bg-white transition-all duration-500">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{metric.label}</p>
                            <div className="flex items-center justify-center gap-1.5">
                                <metric.icon size={12} className={cn(
                                    metric.color === 'blue' ? "text-blue-500" :
                                    metric.color === 'emerald' ? "text-emerald-500" : "text-purple-500"
                                )} />
                                <span className="text-lg font-black text-slate-900 tracking-tighter">{metric.value}%</span>
                            </div>
                        </div>
                    ))}
              </div>
            </div>

            <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-50 flex gap-4">
                <PremiumButton variant="outline" size="sm" className="flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-lg transition-all">
                  Performance DNA
                </PremiumButton>
                <PremiumButton variant="secondary" size="sm" className="flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">
                  Tactical Call
                </PremiumButton>
            </div>
          </PremiumCard>
        ))}
      </div>
      
      <Pagination totalItems={count || 0} limit={limit} />
    </>
  )
}
