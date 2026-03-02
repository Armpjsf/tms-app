import { Suspense } from "react"
import { getDetailedDriverAnalytics } from "@/lib/supabase/analytics"
import { cookies } from "next/headers"
import { isSuperAdmin } from "@/lib/permissions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Medal, Star, TrendingUp, Package, Clock, ShieldCheck, MapPin, Search } from "lucide-react"
import { MonthFilter } from "@/components/analytics/month-filter"
import { PremiumCard } from "@/components/ui/premium-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function DriverLeaderboardPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams.branch || cookieStore.get("selectedBranch")?.value || "All"
  const isAdmin = await isSuperAdmin()

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <h1 className="text-3xl font-bold text-red-500 font-black">ACCESS DENIED</h1>
        <p className="text-gray-500 font-bold">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงรายงานประสิทธิภาพคนขับ</p>
        <Link href="/dashboard">
          <Button variant="secondary" className="rounded-xl px-10 h-14 font-black">กลับสู่หน้าหลัก</Button>
        </Link>
      </div>
    )
  }

  const startDate = searchParams.startDate
  const endDate = searchParams.endDate

  const drivers = await getDetailedDriverAnalytics(startDate, endDate, branchId)

  const topThree = drivers.slice(0, 3)
  const rest = drivers.slice(3)

  return (
    <div className="space-y-12 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link href="/admin/analytics">
             <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-gray-200 bg-white/50 backdrop-blur-xl hover:bg-white transition-all">
                <ArrowLeft className="h-6 w-6" />
             </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
              <Trophy className="text-amber-500" size={36} />
              Driver Leaderboard
            </h1>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] ml-1">Performance Intelligence & Rewards {branchId !== 'All' ? `• ${branchId}` : ''}</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
            <MonthFilter />
        </div>
      </div>

      {/* Podium Section (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {topThree.map((driver, idx) => (
          <PremiumCard key={driver.driverId} className={cn(
            "relative p-8 overflow-hidden group border-2",
            idx === 0 ? "border-amber-400/50 shadow-amber-500/10 scale-105 z-10" : 
            idx === 1 ? "border-slate-300/50" : "border-amber-700/30"
          )}>
            {/* Rank Badge */}
            <div className={cn(
                "absolute top-4 right-4 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl",
                idx === 0 ? "bg-amber-400 text-white" :
                idx === 1 ? "bg-slate-300 text-slate-700" : "bg-amber-700 text-white"
            )}>
                {idx === 0 ? <Trophy size={20} /> : <Medal size={20} />}
            </div>

            <div className="flex flex-col items-center text-center mt-4">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gray-100 mb-6 flex items-center justify-center text-3xl font-black text-gray-400 border-4 border-white shadow-2xl relative">
                    {driver.name.slice(0, 1)}
                    <Badge className="absolute -bottom-2 bg-emerald-500 text-white border-4 border-white h-8 px-4 font-black">
                        #{idx + 1}
                    </Badge>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">{driver.name}</h3>
                <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-6">{driver.plate} • {driver.type}</p>

                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-gray-50 rounded-2xl p-4 transition-colors group-hover:bg-white border border-transparent group-hover:border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">On-Time</p>
                        <p className="text-xl font-black text-emerald-500">{driver.onTimeRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 transition-colors group-hover:bg-white border border-transparent group-hover:border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Rank</p>
                        <p className="text-xl font-black text-amber-500">{driver.rank}</p>
                    </div>
                </div>

                <div className="mt-6 w-full pt-6 border-t border-gray-100">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Job Completion</span>
                        <span className="text-[10px] font-black text-gray-900">{driver.completionRate.toFixed(1)}%</span>
                     </div>
                     <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-1000" 
                            style={{ width: `${driver.completionRate}%` }}
                        />
                     </div>
                </div>
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <PremiumCard className="p-0 overflow-hidden shadow-2xl border-none">
          <div className="p-8 border-b border-gray-50 bg-gray-50/10 flex justify-between items-center">
              <div>
                  <h3 className="text-lg font-black text-gray-900">Drivers Performance Ranking</h3>
                  <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mt-1">Full fleet analytics for current period</p>
              </div>
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search Driver Name..." 
                    className="pl-10 pr-4 h-10 rounded-xl border-gray-100 bg-white text-xs font-bold focus:ring-emerald-500 focus:border-emerald-500 transition-all w-64"
                  />
              </div>
          </div>

          <Table>
              <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                      <TableHead className="w-[80px] text-[10px] font-black text-gray-400 uppercase tracking-widest pl-8">Rank</TableHead>
                      <TableHead className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Driver</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Jobs (Done/Total)</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">On-Time</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Rating</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Earnings</TableHead>
                      <TableHead className="pr-8 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Points/Tier</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {drivers.map((driver, idx) => (
                      <TableRow key={driver.driverId} className="group border-b border-gray-50 hover:bg-emerald-500/5 transition-colors cursor-pointer">
                          <TableCell className="pl-8">
                             <span className={cn(
                                 "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                                 idx < 3 ? "bg-amber-500/10 text-amber-600" : "bg-gray-100 text-gray-400"
                             )}>
                                {idx + 1}
                             </span>
                          </TableCell>
                          <TableCell>
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center font-black text-gray-400 border border-gray-100 group-hover:border-emerald-500/30 transition-colors">
                                      {driver.name.slice(0, 1)}
                                  </div>
                                  <div>
                                      <p className="font-black text-gray-900 group-hover:text-emerald-600 transition-colors truncate max-w-[150px]">{driver.name}</p>
                                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{driver.plate}</p>
                                  </div>
                              </div>
                          </TableCell>
                          <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                  <span className="font-black text-gray-900">{driver.completedJobs}/{driver.totalJobs}</span>
                                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-blue-500" 
                                        style={{ width: `${(driver.completedJobs / (driver.totalJobs || 1)) * 100}%` }}
                                      />
                                  </div>
                              </div>
                          </TableCell>
                          <TableCell className="text-center">
                              <Badge className={cn(
                                  "rounded-lg font-black text-[10px]",
                                  driver.onTimeRate >= 90 ? "bg-emerald-500/10 text-emerald-600" : 
                                  driver.onTimeRate >= 70 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"
                              )}>
                                  {driver.onTimeRate.toFixed(1)}%
                              </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                  <Star size={12} className={cn(driver.avgRating > 0 ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                                  <span className="font-black text-gray-900">{driver.avgRating > 0 ? driver.avgRating.toFixed(1) : '-'}</span>
                              </div>
                          </TableCell>
                          <TableCell className="text-center font-black text-gray-900">
                               ฿{driver.totalEarnings.toLocaleString()}
                          </TableCell>
                          <TableCell className="pr-8 text-right">
                              <div className="flex flex-col items-end">
                                  <span className="text-xs font-black text-gray-900 tracking-tighter">{driver.points} PTS</span>
                                  <Badge className={cn(
                                      "text-[9px] font-black uppercase tracking-widest h-5",
                                      driver.rank === 'Platinum' ? "bg-slate-900 text-white" :
                                      driver.rank === 'Gold' ? "bg-amber-400 text-white shadow-lg shadow-amber-500/20" :
                                      driver.rank === 'Silver' ? "bg-slate-300 text-slate-700" : "bg-amber-800 text-white"
                                  )}>
                                      {driver.rank}
                                  </Badge>
                              </div>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>

          {drivers.length === 0 && (
              <div className="p-20 text-center text-gray-400 font-bold bg-white/50">
                   ไม่พบข้อมูลประสิทธิภาพคนขับในพรรคนี้นะ
              </div>
          )}

          <div className="p-8 bg-gray-50/30 border-t border-gray-50 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Updated: {new Date().toLocaleString()}</span>
              <span className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Audit Verified Data
              </span>
          </div>
      </PremiumCard>
    </div>
  )
}
