
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
import { ExecutiveSectorHealth } from "@/components/analytics/health-scorecards"
import { BillingSection } from "@/components/analytics/billing-section"
import { FuelSection } from "@/components/analytics/fuel-section"
import { MaintenanceSection } from "@/components/analytics/maintenance-section"
import { SafetySection } from "@/components/analytics/safety-section"
import { WorkforceSection } from "@/components/analytics/workforce-section"
import { CustomerRouteSection } from "@/components/analytics/customer-route-section"
import { ExportAllButton } from "@/components/analytics/export-all-button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Truck, ShieldAlert, Layers } from "lucide-react"

export async function DashboardContent({ 
  startDate, 
  endDate, 
  branchId 
}: { 
  startDate?: string
  endDate?: string
  branchId: string 
}) {
  
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
    <div className="space-y-12">
        {/* Hidden Export Button Interface to lift data up? 
            No, we can pass data down or place the button here if needed.
            But the button was in the header. 
            We can put a *new* specific export button here or pass data back (not possible in server components).
            
            Actually, let's put the Export button logic INSIDE here, but maybe display it?
            Wait, the ExportButton was in the Header. 
            If is in the header, it needs the data. 
            Detailed Plan: The Export Button needs data. If we move fetching here, the Header (parent) won't have data.
            Solution: Put the Export Button HERE in the content area? 
            OR: Keep the Export Button in the header but make it fetch its own data? (Inefficient)
            OR: Use a slot?
            
            Let's place a "Data Actions" bar right below the header? 
            Or... Render the ExportButton here but using CSS Portal? No.
            
            Let's simply move the Export Button to be inside this Content area, perhaps at the top right of the *content* block.
        */}

        {/* Section 1: Financial & Commercial */}
        <section className="space-y-8 relative">
           {/* Re-position Export Button here for now, or finding a way to slot it. 
               Let's put it in a flex row at the top of the content. 
           */}
           <div className="flex justify-end mb-[-2rem]">
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
              
             <div className="space-y-6">
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
