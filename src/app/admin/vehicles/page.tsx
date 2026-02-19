export const dynamic = 'force-dynamic'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  getOperationalStats,
  getSubcontractorPerformance,
  getDriverLeaderboard,
} from "@/lib/supabase/analytics"
import { DriverLeaderboard } from "@/components/analytics/driver-leaderboard"
import { SubcontractorPerformance } from "@/components/analytics/subcontractor-performance"
import { Truck, Users, Fuel, TrendingUp, ArrowLeft, Activity } from "lucide-react"
import { MonthFilter } from "@/components/analytics/month-filter"
import { BranchFilter } from "@/components/dashboard/branch-filter"
import { isSuperAdmin } from "@/lib/permissions"

export default async function FleetDashboardPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const startDate = searchParams.startDate
  const endDate = searchParams.endDate
  const branchId = searchParams.branch
  const superAdmin = await isSuperAdmin()

  const [opStats, subPerf, driverRank] = await Promise.all([
    getOperationalStats(branchId),
    getSubcontractorPerformance(startDate, endDate, branchId),
    getDriverLeaderboard(startDate, endDate, branchId)
  ])

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics">
            <Button variant="outline" size="icon" className="border-slate-700 bg-slate-900">
               <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Fleet & Efficiency</h1>
            <p className="text-slate-500">Asset Optimization & Driver Performance</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-xl">
            <BranchFilter isSuperAdmin={superAdmin} />
            <MonthFilter />
        </div>
      </div>

      {/* Fleet Utilization Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-900/20 to-slate-900 border-indigo-500/20 shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
              <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                      <Activity className="text-indigo-400" size={20} />
                      Fleet Utilization Health
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Ratio</p>
                          <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-black text-white">{opStats.fleet.utilization.toFixed(1)}%</span>
                              <span className="text-xs text-emerald-400 font-bold flex items-center gap-0.5"><TrendingUp size={12} /> Target 85%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
                              <div className="bg-indigo-500 h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${opStats.fleet.utilization}%` }} />
                          </div>
                      </div>
                      <div className="space-y-2 lg:border-l lg:border-slate-800 lg:pl-8">
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">On-Time Success</p>
                          <p className="text-5xl font-black text-emerald-400 leading-none">{opStats.fleet.onTimeDelivery.toFixed(1)}%</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-bold">Based on Actual vs Plan Delivery</p>
                      </div>
                      <div className="space-y-2 lg:border-l lg:border-slate-800 lg:pl-8">
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Vehicles</p>
                          <p className="text-5xl font-black text-blue-400 leading-none">{opStats.fleet.active}</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-bold">Currently in transit: {opStats.fleet.total - opStats.fleet.active} idle</p>
                      </div>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 shadow-xl">
              <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Truck size={16} className="text-orange-400" /> Crew Mix (Jobs)
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <SubcontractorPerformance data={subPerf} />
              </CardContent>
          </Card>
      </div>

      {/* Driver Performance & Fuel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Card className="lg:col-span-3 bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
              <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="text-emerald-400" size={18} /> Driver Yield Leaderboard
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Top 10 Performance</span>
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <DriverLeaderboard data={driverRank} />
              </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 shadow-xl self-start">
              <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Fuel size={16} className="text-amber-500" /> Average Fuel Efficiency
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-6 pb-12">
                  <div className="relative">
                      <div className="text-[80px] font-black text-white leading-none tracking-tighter">{opStats.fleet.fuelEfficiency.toFixed(1)}</div>
                      <div className="absolute -right-12 bottom-2 text-xl font-bold text-slate-600">KM/L</div>
                  </div>
                  <div className="mt-8 flex gap-1 w-full max-w-[200px]">
                      {[1,2,3,4,5,6,7,8].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= (opStats.fleet.fuelEfficiency / 2) ? 'bg-amber-500' : 'bg-slate-800'}`} />
                      ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 uppercase font-bold tracking-widest text-center">Efficiency Rating: {opStats.fleet.fuelEfficiency > 10 ? 'EXCELLENT' : 'AVERAGE'}</p>
              </CardContent>
          </Card>
      </div>
    </div>
  )
}
