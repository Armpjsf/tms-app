"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { TreePine, Leaf, Wind, Activity, TrendingDown } from "lucide-react"
import { ESGStats } from "@/lib/supabase/esg-analytics"
import { cn } from "@/lib/utils"

export function ESGSection({ data }: { data: ESGStats }) {
  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-950 rounded-xl text-emerald-500 shadow-lg border border-slate-800">
          <Leaf size={18} />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight uppercase premium-text-gradient">Sustainability & ESG Intelligence</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main ESG KPI */}
        <PremiumCard className="lg:col-span-2 bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-10 rounded-br-[5rem] rounded-tl-[3rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="space-y-2">
                    <span className="text-emerald-400 text-[12px] font-black uppercase tracking-[0.3em] italic">Environmental Impact Realized</span>
                    <h4 className="text-4xl font-black text-white tracking-tighter">CO2 OFFSET</h4>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-2xl shadow-emerald-500/20">
                    <Wind size={32} className="animate-pulse" />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-10 relative z-10">
                <div>
                     <div className="text-5xl font-black text-white tracking-tighter italic">
                        {data.co2SavedKg.toLocaleString()}<span className="text-xl ml-2 text-slate-500">kg</span>
                     </div>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
                        <TrendingDown size={14} className="text-emerald-500" /> Emission reduction aggregate
                     </p>
                </div>
                <div className="border-l border-white/5 pl-10">
                     <div className="text-5xl font-black text-emerald-500 tracking-tighter italic">
                        {data.treesSaved.toLocaleString()}
                     </div>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
                        <TreePine size={14} className="text-emerald-500" /> Tree Equivalence Index
                     </p>
                </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Optimization Efficiency</span>
                    <span className="text-emerald-400 text-sm font-black italic">+{data.efficiencyRate}% TARGET SYNC</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${data.efficiencyRate}%` }} />
                </div>
            </div>
        </PremiumCard>

        {/* Small Detail Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
             <PremiumCard className="bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.05)] p-8 rounded-br-[3rem] rounded-tl-[1.5rem] group hover:scale-[1.02] transition-transform duration-500">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-2 bg-slate-950 rounded-xl text-blue-500 shadow-lg">
                        <Activity size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Saved Distance</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Fleet Optimization</p>
                    </div>
                </div>
                <div className="text-3xl font-black text-slate-950 tracking-tighter italic">
                    {data.totalSavedKm.toLocaleString()}<span className="text-sm ml-1 text-slate-400">km</span>
                </div>
             </PremiumCard>

             <PremiumCard className="bg-slate-950 border-none shadow-2xl p-8 rounded-br-[3rem] rounded-tl-[1.5rem] group hover:scale-[1.02] transition-transform duration-500 border border-emerald-500/10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                        <Leaf size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight italic">Green Protocol</h4>
                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">ESG Compliance Registry</p>
                    </div>
                </div>
                <div className="text-3xl font-black text-white tracking-tighter italic">
                    ACTIVE
                </div>
             </PremiumCard>

             <PremiumCard className="md:col-span-2 bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.05)] p-8 rounded-br-[4rem] rounded-tl-[2rem] flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Industrial ESG Rating</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Strategic sustainability certification index</p>
                </div>
                <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={cn(
                            "w-4 h-6 rounded-sm bg-slate-100",
                            i <= 4 ? "bg-emerald-500 shadow-sm" : ""
                        )} />
                    ))}
                    <span className="ml-3 text-2xl font-black text-slate-950 italic">A+</span>
                </div>
             </PremiumCard>
        </div>
      </div>
    </div>
  )
}
