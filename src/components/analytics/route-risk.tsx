"use client"

import { RouteRisk } from "@/lib/supabase/predictive-analytics"
import { AlertTriangle, TrendingUp, MapPin } from "lucide-react"

export function RouteRiskAnalysis({ risks }: { risks: RouteRisk[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-orange-400">
        <div className="p-2 bg-orange-500/20 rounded-xl border border-orange-500/30 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
            <TrendingUp size={20} />
        </div>
        <div>
            <h2 className="text-xl font-black uppercase italic flex items-center gap-3">
                Route Risk Analysis
                <span className="text-[10px] font-black bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full border border-orange-500/30 uppercase">Tactical Beta</span>
            </h2>
            <p className="text-base font-black text-muted-foreground uppercase italic mt-1">Historical failure & delay probability per route</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Heatmap List */}
        <div className="lg:col-span-2 bg-muted/50 border border-border/10 shadow-3xl rounded-br-[5rem] rounded-tl-[3rem] overflow-hidden">
           <div className="p-8 border-b border-border/5 bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent pointer-events-none" />
              <div className="text-xl font-black text-foreground italic uppercase tracking-tight flex items-center gap-3 relative z-10">
                <MapPin size={18} className="text-orange-400" />
                Highest Risk Routes
              </div>
           </div>
           <div className="p-8">
             <div className="divide-y divide-white/5">
                {risks.slice(0, 5).map((r, i) => (
                    <div key={i} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                <div className={`text-xl font-bold ${r.risk_level === 'High' ? 'text-red-500' : r.risk_level === 'Medium' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                    {r.risk_score}
                                </div>
                                <div className="text-base font-black text-muted-foreground/60 uppercase">Score</div>
                            </div>
                            
                            <div>
                                <div className="text-foreground font-black text-2xl tracking-tighter italic group-hover:text-orange-400 transition-all uppercase">
                                    {r.route_name}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="flex items-center gap-1.5 text-lg font-bold text-muted-foreground">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                        {r.total_jobs} Jobs
                                    </div>
                                    <div className="flex items-center gap-1.5 text-lg font-bold text-red-400">
                                        <AlertTriangle size={12} />
                                        {r.failure_count} Incidents ({(r.failure_count / r.total_jobs * 100).toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                             {/* Mini Bar Chart for Risk Factors */}
                             <div className="hidden md:flex flex-col gap-1 w-24">
                                <div className="flex justify-between text-base font-bold text-gray-400">
                                    <span>Reliability</span>
                                    <span>{100 - Math.round(r.failure_count / r.total_jobs * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${r.risk_level === 'High' ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                        style={{ width: `${100 - (r.failure_count / r.total_jobs * 100)}%` }}
                                    ></div>
                                </div>
                             </div>
                             
                             <div className={`px-3 py-1 rounded text-lg font-bold font-medium border ${
                                 r.risk_level === 'High' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                                 r.risk_level === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 
                                 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                             }`}>
                                {r.risk_level} Risk
                             </div>
                        </div>
                    </div>
                ))}
                {risks.length === 0 && (
                     <div className="py-24 text-center">
                        <AlertTriangle size={48} strokeWidth={1} className="mx-auto mb-4 text-muted-foreground/60" />
                        <p className="text-base font-black text-muted-foreground uppercase italic">ไม่พบข้อมูลความเสี่ยงในช่วงเวลานี้</p>
                    </div>
                )}
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}

