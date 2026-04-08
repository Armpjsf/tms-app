import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { getVehicleRiskAssessment, getRouteRiskProfile } from "@/lib/supabase/predictive-analytics"
import { isSuperAdmin } from "@/lib/permissions"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cookies } from "next/headers"
import { IntelligenceClient } from "./intelligence-client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
// ... rest of imports

export default async function IntelligencePage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams.branch || cookieStore.get("selectedBranch")?.value || 'All'
  const superAdmin = await isSuperAdmin()

  if (!superAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 bg-background">
          <PremiumCard className="bg-rose-500/10 border-rose-500/30 max-w-md p-12 text-center space-y-8 rounded-[3rem]">
              <ShieldCheck size={64} className="mx-auto text-rose-500 animate-pulse" />
              <div className="space-y-2">
                  <h1 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">Access Denied</h1>
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-base font-bold leading-relaxed italic">Strategic clearance insufficient. Terminal locked for security protocol.</p>
              </div>
              <Link href="/dashboard" className="block">
                  <PremiumButton variant="outline" className="w-full h-14 rounded-2xl border-border/10 text-white font-black uppercase tracking-[0.2em] italic">
                      RETURN_SAFE_ZONE
                  </PremiumButton>
              </Link>
          </PremiumCard>
        </div>
      </DashboardLayout>
    )
  }

  // Fetch AI Data (Server-side)
  const [vehicleRisks, routeRisks] = await Promise.all([
    getVehicleRiskAssessment(branchId),
    getRouteRiskProfile(branchId)
  ])

  return (
    <IntelligenceClient 
      vehicleRisks={vehicleRisks} 
      routeRisks={routeRisks} 
      branchId={branchId} 
      superAdmin={superAdmin} 
    />
  )
}

