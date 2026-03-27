"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { TreePine, Leaf, Wind, Activity, TrendingDown } from "lucide-react"
import { ESGStats } from "@/lib/supabase/esg-analytics"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

export function ESGSection({ data }: { data: ESGStats }) {
  const { t } = useLanguage()

  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted/60 rounded-xl text-emerald-500 shadow-lg border border-border/10">
          <Leaf size={18} />
        </div>
        <h3 className="text-xl font-black text-foreground tracking-tight uppercase premium-text-gradient">{t('dashboard.esg_intel')}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main ESG KPI */}
        <PremiumCard className="lg:col-span-2 bg-muted/50 border border-border/10 shadow-2xl relative overflow-hidden group p-10 rounded-br-[5rem] rounded-tl-[3rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="space-y-2">
                    <span className="text-emerald-400 text-[12px] font-black uppercase italic">{t('dashboard.env_impact_realized')}</span>
                    <h4 className="text-4xl font-black text-foreground tracking-tighter">{t('dashboard.co2_offset')}</h4>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-2xl shadow-emerald-500/20">
                    <Wind size={32} className="animate-pulse" />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-10 relative z-10">
                <div>
                     <div className="text-5xl font-black text-foreground tracking-tighter italic">
                        {data.co2SavedKg.toLocaleString()}<span className="text-xl ml-2 text-muted-foreground">kg</span>
                     </div>
                     <p className="text-base font-bold text-muted-foreground font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
                        <TrendingDown size={14} className="text-emerald-500" /> {t('dashboard.emission_reduction_aggregate')}
                     </p>
                </div>
                <div className="border-l border-border/5 pl-10">
                     <div className="text-5xl font-black text-emerald-500 tracking-tighter italic">
                        {data.treesSaved.toLocaleString()}
                     </div>
                     <p className="text-base font-bold text-muted-foreground font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
                        <TreePine size={14} className="text-emerald-500" /> {t('dashboard.tree_equivalence_index')}
                     </p>
                </div>
            </div>

            <div className="mt-10 pt-8 border-t border-border/5 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-base font-bold text-muted-foreground font-black uppercase italic">{t('dashboard.optimization_efficiency')}</span>
                    <span className="text-emerald-400 text-xl font-black italic">+{data.efficiencyRate}% {t('dashboard.target_sync')}</span>
                </div>
                <div className="h-2 w-full bg-card rounded-full overflow-hidden border border-border/5 p-0.5">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${data.efficiencyRate}%` }} />
                </div>
            </div>
        </PremiumCard>

        {/* Small Detail Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
             <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl p-8 rounded-br-[3rem] rounded-tl-[1.5rem] group hover:scale-[1.02] transition-transform duration-500">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-2 bg-background rounded-xl text-blue-400 shadow-lg border border-border/5">
                        <Activity size={18} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-foreground uppercase italic">{t('dashboard.saved_distance')}</h4>
                        <p className="text-base font-bold text-muted-foreground font-bold uppercase">{t('dashboard.fleet_optimization')}</p>
                    </div>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tighter italic">
                    {data.totalSavedKm.toLocaleString()}<span className="text-xl ml-1 text-muted-foreground">km</span>
                </div>
             </PremiumCard>

             <PremiumCard className="bg-muted/50 border border-border/10 shadow-2xl p-8 rounded-br-[3rem] rounded-tl-[1.5rem] group hover:scale-[1.02] transition-transform duration-500">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                        <Leaf size={18} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-foreground uppercase italic">{t('dashboard.green_protocol')}</h4>
                        <p className="text-base font-bold text-emerald-500 font-bold uppercase">{t('dashboard.esg_compliance_registry')}</p>
                    </div>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tighter italic">
                    {t('dashboard.active_label')}
                </div>
             </PremiumCard>

             <PremiumCard className="md:col-span-2 bg-muted/50 border border-border/10 shadow-2xl p-8 rounded-br-[4rem] rounded-tl-[2rem] flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="text-lg font-bold font-black text-foreground uppercase italic">{t('dashboard.industrial_esg_rating')}</h4>
                    <p className="text-base font-bold text-muted-foreground font-bold uppercase">{t('dashboard.structural_sustainability_index')}</p>
                </div>
                <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={cn(
                            "w-4 h-6 rounded-sm bg-muted/50",
                            i <= 4 ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : ""
                        )} />
                    ))}
                    <span className="ml-3 text-2xl font-black text-foreground italic">A+</span>
                </div>
             </PremiumCard>
        </div>
      </div>
    </div>
  )
}

