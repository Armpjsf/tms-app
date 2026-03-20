import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BrainCircuit, Zap, ShieldCheck, Activity, Target, Cpu, Clock, Layers, Globe, Gauge } from "lucide-react"

import { getVehicleRiskAssessment, getRouteRiskProfile } from "@/lib/supabase/predictive-analytics"
import { PredictiveMaintenance } from "@/components/analytics/predictive-maintenance"
import { RouteRiskAnalysis } from "@/components/analytics/route-risk"

import { isSuperAdmin } from "@/lib/permissions"
import { BranchFilter } from "@/components/dashboard/branch-filter"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"

import { cookies } from "next/headers"

export default async function IntelligencePage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const branchId = searchParams.branch || cookieStore.get("selectedBranch")?.value || 'All'
  const superAdmin = await isSuperAdmin()

  if (!superAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 bg-[#050110]">
        <PremiumCard className="bg-rose-500/10 border-rose-500/30 max-w-md p-12 text-center space-y-8 rounded-[3rem]">
            <ShieldCheck size={64} className="mx-auto text-rose-500 animate-pulse" />
            <div className="space-y-2">
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Access Denied</h1>
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] leading-relaxed italic">Strategic clearance insufficient. Terminal locked for security protocol.</p>
            </div>
            <Link href="/dashboard" className="block">
                <PremiumButton variant="outline" className="w-full h-14 rounded-2xl border-white/10 text-white font-black uppercase tracking-[0.2em] italic">
                    RETURN_SAFE_ZONE
                </PremiumButton>
            </Link>
        </PremiumCard>
      </div>
    )
  }

  // Fetch AI Data
  const [vehicleRisks, routeRisks] = await Promise.all([
    getVehicleRiskAssessment(branchId),
    getRouteRiskProfile(branchId)
  ])

  return (
    <div className="space-y-12 pb-32 p-4 lg:p-10 bg-[#050110]">
      {/* Tactical Header */}
      <div className="bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div className="space-y-6">
            <Link href="/admin/analytics" className="inline-flex items-center gap-2 text-slate-500 hover:text-purple-400 transition-all font-black uppercase tracking-[0.4em] text-[10px] group/back italic">
              <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
              STRATEGIC_INTELLIGENCE
            </Link>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-purple-500/20 rounded-[2.5rem] border-2 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)] text-purple-400 animate-pulse">
                <BrainCircuit size={40} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">Neural Advisory</h1>
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">AI-Powered Predictive Analytics & Risk Assessment {branchId && branchId !== 'All' ? `// ${branchId}` : ''}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-xl">
              <BranchFilter isSuperAdmin={superAdmin} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-12 space-y-16">
              {/* Section 1: Predictive Maintenance (Vehicles) */}
              <section className="space-y-10 group/maintenance">
                  <div className="flex items-center gap-6 px-4">
                      <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500 border border-amber-500/30 group-hover/maintenance:rotate-12 transition-transform duration-500">
                          <Gauge size={24} />
                      </div>
                      <div>
                          <h2 className="text-3xl font-black text-white tracking-widest uppercase italic leading-none">Fleet Health Matrix</h2>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 italic">Predictive maintenance synchronization & wear analytics</p>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <div className="bg-[#0a0518]/40 p-1 rounded-[4rem] border border-white/5 shadow-3xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-80 h-full bg-amber-500/[0.02] blur-3xl pointer-events-none" />
                    <PredictiveMaintenance risks={vehicleRisks} />
                  </div>
              </section>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent py-4" />

              {/* Section 2: Route Risk Analysis (Operations) */}
              <section className="space-y-10 group/routes">
                  <div className="flex items-center gap-6 px-4">
                      <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 border border-blue-500/30 group-hover/routes:rotate-12 transition-transform duration-500">
                          <Target size={24} />
                      </div>
                      <div>
                          <h2 className="text-3xl font-black text-white tracking-widest uppercase italic leading-none">Route Threat Assessment</h2>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 italic">Operational risk profiling & anomaly detection</p>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <div className="bg-[#0a0518]/40 p-1 rounded-[4rem] border border-white/5 shadow-3xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-80 h-full bg-blue-500/[0.02] blur-3xl pointer-events-none" />
                    <RouteRiskAnalysis risks={routeRisks} />
                  </div>
              </section>
          </div>
      </div>

      {/* Strategic Advisory Footnote */}
      <div className="py-24 border-t border-white/5 flex flex-col items-center opacity-30 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-6 mb-6">
              <Cpu size={28} className="text-purple-500 animate-spin-slow" />
              <div className="h-px w-64 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <BrainCircuit size={28} className="text-primary animate-pulse" />
          </div>
          <p className="text-[12px] font-black text-white uppercase tracking-[0.8em] italic mb-6">Neural Advisory Core // v10.4-TACTICAL</p>
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.5em] italic leading-relaxed text-center max-w-3xl px-12">
              All intelligence vectors are generated via asynchronous neural processing. <br />
              Risk scores are derived from historical telemetry, environmental sensors, and node efficiency deltas.
          </p>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  )
}
