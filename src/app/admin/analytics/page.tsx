export const dynamic = 'force-dynamic'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  getFinancialStats, 
  getRevenueTrend, 
  getTopCustomers, 
  getOperationalStats,
  getJobStatusDistribution,
  getBranchPerformance,
  getSubcontractorPerformance,
  getExecutiveKPIs,
  getRouteEfficiency
} from "@/lib/supabase/analytics"
import { getBillingAnalytics } from "@/lib/supabase/billing-analytics"
import { getFuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { getMaintenanceSchedule } from "@/lib/supabase/maintenance-schedule"
import { getSafetyAnalytics } from "@/lib/supabase/safety-analytics"
import { getWorkforceAnalytics } from "@/lib/supabase/workforce-analytics"

import { FinancialSummaryCards } from "@/components/analytics/summary-cards"
import { RevenueTrendChart } from "@/components/analytics/revenue-chart"
import { MonthFilter } from "@/components/analytics/month-filter"
import { ExportAllButton } from "@/components/analytics/export-all-button"
import { ExecutiveSectorHealth } from "@/components/analytics/health-scorecards"
import { BillingSection } from "@/components/analytics/billing-section"
import { FuelSection } from "@/components/analytics/fuel-section"
import { MaintenanceSection } from "@/components/analytics/maintenance-section"
import { SafetySection } from "@/components/analytics/safety-section"
import { WorkforceSection } from "@/components/analytics/workforce-section"
import { CustomerRouteSection } from "@/components/analytics/customer-route-section"

import { BarChart3, TrendingUp, ArrowLeft, Layers, Truck, ShieldAlert } from "lucide-react"

import { isSuperAdmin } from "@/lib/permissions"
import { BranchFilter } from "@/components/dashboard/branch-filter"

export default async function AnalyticsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const startDate = searchParams.startDate
  const endDate = searchParams.endDate
  const branchId = searchParams.branch
  const superAdmin = await isSuperAdmin()

  if (!superAdmin) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <h1 className="text-3xl font-bold text-red-500">Access Denied</h1>
            <p className="text-slate-400">
                คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (สำหรับ Super Admin เท่านั้น) <br/>
                กรุณาติดต่อผู้ดูแลระบบหากต้องการสิทธิ์
            </p>
            <Link href="/dashboard">
                <Button variant="secondary">กลับสู่ Dashboard ปกติ</Button>
            </Link>
        </div>
     )
  }

  // Fetch all analytics data in parallel with filters
  const [
    financials, 
    revenueTrend, 
    topCustomers, 
    opStats, 
    statusDist, 
    branchPerf, 
    subPerf,
    exeKPIs,
    billing,
    fuel,
    maintenance,
    safety,
    workforce,
    routes
  ] = await Promise.all([
    getFinancialStats(startDate, endDate, branchId),
    getRevenueTrend(startDate, endDate, branchId),
    getTopCustomers(startDate, endDate, branchId),
    getOperationalStats(branchId),
    getJobStatusDistribution(startDate, endDate, branchId),
    getBranchPerformance(startDate, endDate),
    getSubcontractorPerformance(startDate, endDate, branchId),
    getExecutiveKPIs(startDate, endDate, branchId),
    getBillingAnalytics(startDate, endDate, branchId),
    getFuelAnalytics(startDate, endDate),
    getMaintenanceSchedule(),
    getSafetyAnalytics(startDate, endDate, branchId),
    getWorkforceAnalytics(startDate, endDate, branchId),
    getRouteEfficiency(startDate, endDate, branchId)
  ])

  return (
    <div className="space-y-12 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-800 pb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="border-slate-700 bg-slate-900 border-2 hover:border-slate-500 transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-400" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Executive Dashboard</h1>
              <p className="text-slate-500 text-lg">Strategic Insights & Operational Performance {branchId && branchId !== 'All' ? `(${branchId})` : ''}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl">
                  <BranchFilter isSuperAdmin={superAdmin} />
                  <span className="text-slate-700">|</span>
                  <MonthFilter />
              </div>
              <ExportAllButton 
                  data={{
                      financials,
                      revenueTrend,
                      topCustomers,
                      statusDist,
                      branchPerf,
                      subPerf,
                      billing,
                      fuel,
                      maintenance,
                      safety,
                      workforce,
                      routes
                  }} 
              />
          </div>
        </div>

        {/* Section 1: Financial & Commercial */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp size={20} />
              </div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Financial & Commercial</h2>
          </div>
          
          <FinancialSummaryCards data={exeKPIs} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-2xl hover:border-slate-700 transition-colors group">
                  <CardHeader className="border-b border-slate-800/50 bg-slate-900/50">
                      <CardTitle className="text-white flex items-center gap-3">
                          <BarChart3 className="text-emerald-400" size={18} /> 
                          <span>ผลประกอบการ <span className="text-slate-500 font-normal text-sm ml-2">(Revenue vs Cost)</span></span>
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 min-h-[400px]"><RevenueTrendChart data={revenueTrend} /></CardContent>
              </Card>
              
              {/* Scorecards moved to side or below */}
             <div className="space-y-6">
                 {/* Can add simplified scorecards here or keep them at bottom. Let's keep distinct sections */}
             </div>
          </div>
          
          <BillingSection data={billing} />
          <CustomerRouteSection customers={topCustomers} routes={routes} />
        </section>
        
        <hr className="border-slate-800" />

        {/* Section 2: Fleet & Operations */}
        <section className="space-y-8">
           <div className="flex items-center gap-3 text-blue-400">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Truck size={20} />
              </div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Fleet & Operations</h2>
           </div>
           
           <FuelSection data={fuel} />
           <MaintenanceSection data={maintenance} />
        </section>

        <hr className="border-slate-800" />

        {/* Section 3: Workforce & Safety */}
        <section className="space-y-8">
           <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 rounded-lg">
                  <ShieldAlert size={20} />
              </div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Workforce & Safety</h2>
           </div>
           
           <div className="grid grid-cols-1 space-y-8">
               <WorkforceSection data={workforce} />
               <SafetySection data={safety} />
           </div>
        </section>

        <hr className="border-slate-800" />

        {/* Section 4: Departmental Health (Scorecards) */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-slate-400">
              <div className="p-2 bg-slate-800 rounded-lg">
                  <Layers size={20} />
              </div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Departmental Health Check</h2>
          </div>
          
          <ExecutiveSectorHealth 
              sectors={[
                  {
                      title: "Operations (Jobs)",
                      icon: "layers",
                      href: "/admin/jobs",
                      metrics: [
                          { label: "On-Time Success", value: `${opStats.fleet.onTimeDelivery.toFixed(1)}%`, status: opStats.fleet.onTimeDelivery > 90 ? 'good' : 'warning' },
                          { label: "Active Pipeline", value: statusDist.reduce((a, b) => a + b.value, 0), status: 'good' }
                      ]
                  },
                  {
                      title: "Fleet (Assets)",
                      icon: "truck",
                      href: "/admin/vehicles/dashboard",
                      metrics: [
                          { label: "Utilization", value: `${opStats.fleet.utilization.toFixed(1)}%`, status: opStats.fleet.utilization > 70 ? 'good' : 'warning' },
                          { label: "Fleet Health", value: "Optimal", status: 'good' }
                      ]
                  },
                  {
                      title: "Regional (Branches)",
                      icon: "building",
                      href: "/admin/analytics/regional",
                      metrics: [
                          { label: "Active Branches", value: branchPerf.length, status: 'good' },
                          { label: "Top Branch", value: branchPerf[0]?.branchName || 'N/A', status: 'good' }
                      ]
                  }
              ]}
          />
        </section>
      </div>
  )
}
