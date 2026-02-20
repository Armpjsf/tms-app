

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BrainCircuit } from "lucide-react"

import { getVehicleRiskAssessment, getRouteRiskProfile } from "@/lib/supabase/predictive-analytics"
import { PredictiveMaintenance } from "@/components/analytics/predictive-maintenance"
import { RouteRiskAnalysis } from "@/components/analytics/route-risk"

import { isSuperAdmin } from "@/lib/permissions"
import { BranchFilter } from "@/components/dashboard/branch-filter"

import { cookies } from "next/headers"

export default async function IntelligencePage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams.branch || cookieStore.get("selectedBranch")?.value || 'All'
  const superAdmin = await isSuperAdmin()

  if (!superAdmin) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <h1 className="text-3xl font-bold text-red-500">Access Denied</h1>
            <p className="text-slate-400">
                คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (สำหรับ Super Admin เท่านั้น)
            </p>
            <Link href="/dashboard">
                <Button variant="secondary">กลับสู่ Dashboard ปกติ</Button>
            </Link>
        </div>
     )
  }

  // Fetch AI Data
  const [vehicleRisks, routeRisks] = await Promise.all([
    getVehicleRiskAssessment(branchId),
    getRouteRiskProfile(branchId)
  ])

  return (
    <div className="space-y-10 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-border pb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/analytics">
              <Button variant="outline" size="icon" className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-1 flex items-center gap-3">
                <BrainCircuit className="text-purple-600 dark:text-purple-500" size={36} />
                Intelligent System
              </h1>
              <p className="text-muted-foreground text-lg">AI-Powered Predictive Analytics & Risk Assessment {branchId && branchId !== 'All' ? `(${branchId})` : ''}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border p-2 rounded-xl">
                  <BranchFilter isSuperAdmin={superAdmin} />
              </div>
          </div>
        </div>

        {/* Section 1: Predictive Maintenance (Vehicles) */}
        <section className="space-y-8">
            <PredictiveMaintenance risks={vehicleRisks} />
        </section>

        <hr className="border-border" />

        {/* Section 2: Route Risk Analysis (Operations) */}
        <section className="space-y-8">
            <RouteRiskAnalysis risks={routeRisks} />
        </section>
    </div>
  )
}
