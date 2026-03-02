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

import { isSuperAdmin } from "@/lib/permissions"

export default async function FleetDashboardPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const startDate = searchParams.startDate
  const endDate = searchParams.endDate
  const branchId = searchParams.branch
  await isSuperAdmin()

  const [opStats, subPerf, driverRank] = await Promise.all([
    getOperationalStats(branchId, startDate, endDate),
    getSubcontractorPerformance(startDate, endDate, branchId),
    getDriverLeaderboard(startDate, endDate, branchId)
  ])

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-gray-200 pb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics">
            <Button variant="outline" size="icon" className="border-gray-200 bg-white">
               <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Fleet & Efficiency</h1>
            <p className="text-gray-700 font-bold">Asset Optimization & Driver Performance</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white border border-gray-200 p-2 rounded-xl">
            {/* Branch Filter removed (Global Header) */}
            <MonthFilter />
        </div>
      </div>

      {/* Fleet Utilization Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-white border border-gray-100 shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>
              <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-3 font-black">
                      <Activity className="text-emerald-600" size={20} />
                      Fleet Utilization Health
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                          <p className="text-sm font-bold text-gray-700 uppercase tracking-widest">Active Ratio</p>
                          <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-black text-gray-900">{opStats.fleet.utilization.toFixed(1)}%</span>
                              <span className="text-xs text-emerald-600 font-black flex items-center gap-0.5"><TrendingUp size={12} /> Target 85%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
                              <div className="bg-indigo-600 h-full rounded-full shadow-sm" style={{ width: `${opStats.fleet.utilization}%` }} />
                          </div>
                      </div>
                      <div className="space-y-2 lg:border-l lg:border-gray-100 lg:pl-8">
                          <p className="text-sm font-bold text-gray-700 uppercase tracking-widest">On-Time Success</p>
                          <p className="text-5xl font-black text-emerald-600 leading-none">{opStats.fleet.onTimeDelivery.toFixed(1)}%</p>
                          <p className="text-[10px] text-gray-700 mt-2 font-black">Based on Actual vs Plan Delivery</p>
                      </div>
                      <div className="space-y-2 lg:border-l lg:border-gray-100 lg:pl-8">
                          <p className="text-sm font-bold text-gray-700 uppercase tracking-widest">Active Vehicles</p>
                          <p className="text-5xl font-black text-emerald-700 leading-none">{opStats.fleet.active}</p>
                          <p className="text-[10px] text-gray-700 mt-2 font-black">Currently in transit: {opStats.fleet.total - opStats.fleet.active} idle</p>
                      </div>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-xl">
              <CardHeader>
                  <CardTitle className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                      <Truck size={16} className="text-orange-500" /> Crew Mix (Jobs)
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <SubcontractorPerformance data={subPerf} />
              </CardContent>
          </Card>
      </div>

      {/* Driver Performance & Fuel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Card className="lg:col-span-3 bg-white/80 backdrop-blur-sm border-gray-100 shadow-xl">
              <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black">
                        <Users className="text-emerald-600" size={18} /> Driver Yield Leaderboard
                      </div>
                      <span className="text-[10px] text-gray-700 font-black uppercase tracking-widest">Top 10 Performance</span>
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <DriverLeaderboard data={driverRank} />
              </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-white/80 border-gray-100 shadow-xl self-start">
              <CardHeader>
                  <CardTitle className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                      <Fuel size={16} className="text-amber-600" /> Average Fuel Efficiency
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-6 pb-12">
                  <div className="relative">
                      <div className="text-[80px] font-black text-gray-900 leading-none tracking-tighter">{opStats.fleet.fuelEfficiency.toFixed(1)}</div>
                      <div className="absolute -right-12 bottom-2 text-xl font-bold text-gray-700">KM/L</div>
                  </div>
                  <div className="mt-8 flex gap-1 w-full max-w-[200px]">
                      {[1,2,3,4,5,6,7,8].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= (opStats.fleet.fuelEfficiency / 2) ? 'bg-amber-500' : 'bg-gray-100'}`} />
                      ))}
                  </div>
                  <p className="text-[10px] text-gray-700 mt-4 uppercase font-black tracking-widest text-center">Efficiency Rating: {opStats.fleet.fuelEfficiency > 10 ? 'EXCELLENT' : 'AVERAGE'}</p>
              </CardContent>
          </Card>
      </div>
    </div>
  )
}
