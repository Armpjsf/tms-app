"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RouteRisk } from "@/lib/supabase/predictive-analytics"
import { AlertTriangle, TrendingUp, MapPin, Gauge } from "lucide-react"

export function RouteRiskAnalysis({ risks }: { risks: RouteRisk[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-orange-400">
        <div className="p-2 bg-orange-500/10 rounded-lg">
            <TrendingUp size={20} />
        </div>
        <div>
            <h2 className="text-lg font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                Route Risk Analysis
                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full normal-case tracking-normal">Beta</span>
            </h2>
            <p className="text-xs text-slate-500">Historical failure & delay probability per route</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Heatmap List */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <MapPin size={16} className="text-orange-400" />
               Highest Risk Routes
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {risks.slice(0, 5).map((r, i) => (
                    <div key={i} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                <div className={`text-sm font-bold ${r.risk_level === 'High' ? 'text-red-500' : r.risk_level === 'Medium' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                    {r.risk_score}
                                </div>
                                <div className="text-[10px] text-slate-600 uppercase">Score</div>
                            </div>
                            
                            <div>
                                <div className="text-white font-medium text-sm group-hover:text-orange-400 transition-colors">
                                    {r.route_name}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                        {r.total_jobs} Jobs
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                                        <AlertTriangle size={12} />
                                        {r.failure_count} Incidents ({(r.failure_count / r.total_jobs * 100).toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                             {/* Mini Bar Chart for Risk Factors */}
                             <div className="hidden md:flex flex-col gap-1 w-24">
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>Reliability</span>
                                    <span>{100 - (r.failure_count / r.total_jobs * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${r.risk_level === 'High' ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                        style={{ width: `${100 - (r.failure_count / r.total_jobs * 100)}%` }}
                                    ></div>
                                </div>
                             </div>
                             
                             <div className={`px-3 py-1 rounded text-xs font-medium border ${
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
                     <div className="py-8 text-center text-slate-500 text-sm">ไม่พบข้อมูลความเสี่ยง</div>
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
