export const dynamic = 'force-dynamic'

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BrainCircuit } from "lucide-react"

import { getVehicleRiskAssessment, getRouteRiskProfile } from "@/lib/supabase/predictive-analytics"
import { PredictiveMaintenance } from "@/components/analytics/predictive-maintenance"
import { RouteRiskAnalysis } from "@/components/analytics/route-risk"

import { isSuperAdmin } from "@/lib/permissions"
import { BranchFilter } from "@/components/dashboard/branch-filter"

export default async function IntelligencePage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const branchId = searchParams.branch
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-800 pb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/analytics">
              <Button variant="outline" size="icon" className="border-slate-700 bg-slate-900 border-2 hover:border-slate-500 transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-400" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1 bg-gradient-to-r from-white to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
                <BrainCircuit className="text-purple-500" size={36} />
                Intelligent System
              </h1>
              <p className="text-slate-500 text-lg">AI-Powered Predictive Analytics & Risk Assessment {branchId && branchId !== 'All' ? `(${branchId})` : ''}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl">
                  <BranchFilter isSuperAdmin={superAdmin} />
              </div>
          </div>
        </div>

        {/* Section 1: Predictive Maintenance (Vehicles) */}
        <section className="space-y-8">
            <PredictiveMaintenance risks={vehicleRisks} />
        </section>

        <hr className="border-slate-800" />

        {/* Section 2: Route Risk Analysis (Operations) */}
        <section className="space-y-8">
            <RouteRiskAnalysis risks={routeRisks} />
        </section>
    </div>
  )
}
