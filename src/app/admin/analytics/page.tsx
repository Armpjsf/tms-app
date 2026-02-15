export const dynamic = 'force-dynamic'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  getFinancialStats, 
  getRevenueTrend, 
  getTopCustomers, 
  getOperationalStats 
} from "@/lib/supabase/analytics"
import { FinancialSummaryCards } from "@/components/analytics/summary-cards"
import { RevenueTrendChart } from "@/components/analytics/revenue-chart"
import { CostBreakdownChart } from "@/components/analytics/cost-pie-chart"
import { CustomerRanking } from "@/components/analytics/customer-ranking"
import { MonthFilter } from "@/components/analytics/month-filter"
import { BarChart3, PieChart, TrendingUp, Users, ArrowLeft } from "lucide-react"

export default async function AnalyticsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const startDate = searchParams.startDate
  const endDate = searchParams.endDate

  // Fetch all analytics data in parallel with filters
  const [financials, revenueTrend, topCustomers, opStats] = await Promise.all([
    getFinancialStats(startDate, endDate),
    getRevenueTrend(startDate, endDate),
    getTopCustomers(startDate, endDate),
    getOperationalStats(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="border-slate-700 bg-slate-900">
               <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Executive Dashboard</h1>
            <p className="text-slate-400">ภาพรวมผลประกอบการและประสิทธิภาพการดำเนินงาน</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">ข้อมูลประจำเดือน:</span>
            <MonthFilter />
        </div>
      </div>

      {/* Row 1: Financial Cards */}
      <FinancialSummaryCards data={financials} />

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Revenue Trend (Main Chart) - Takes up 4 columns */}
        <Card className="bg-slate-900 border-slate-800 lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="text-blue-400" size={20} />
              แนวโน้มรายรับ vs ต้นทุน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart data={revenueTrend} />
          </CardContent>
        </Card>

        {/* Cost Breakdown (Pie) - Takes up 3 columns */}
        <Card className="bg-slate-900 border-slate-800 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChart className="text-orange-400" size={20} />
              สัดส่วนต้นทุนดำเนินงาน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CostBreakdownChart data={financials.cost} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Operational & Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="text-emerald-400" size={20} />
              ลูกค้าที่สร้างรายได้สูงสุด (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerRanking data={topCustomers} />
          </CardContent>
        </Card>

        {/* Operational Stats Summary */}
        <Card className="bg-slate-900 border-slate-800">
           <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="text-indigo-400" size={20} />
              ประสิทธิภาพกองรถ (Fleet Efficiency)
            </CardTitle>
           </CardHeader>
           <CardContent className="space-y-6">
              {/* Utilization Bar */}
              <div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-400">การใช้งานรถ (Utilization)</span>
                    <span className="text-sm font-bold text-white">{opStats.fleet.utilization.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5">
                    <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${opStats.fleet.utilization}%` }}
                    ></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    รถที่ใช้งานอยู่ {opStats.fleet.active} คัน จากทั้งหมด {opStats.fleet.total} คัน
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-4 text-center">
                     <div className="p-4 bg-slate-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-400">{opStats.fleet.onTimeDelivery.toFixed(1)}%</p>
                        <p className="text-xs text-slate-500">On-Time Delivery</p>
                     </div>
                     <div className="p-4 bg-slate-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-400">{opStats.fleet.fuelEfficiency.toFixed(1)}</p>
                        <p className="text-xs text-slate-500">Fuel Eff. (km/L)</p>
                     </div>
                  </div>
                  <p className="text-center text-xs text-slate-600 mt-2 italic">
                      *คำนวณจากงานที่สำเร็จและการเติมน้ำมัน
                  </p>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
