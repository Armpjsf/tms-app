"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RouteRisk } from "@/lib/supabase/predictive-analytics"
import { AlertTriangle, TrendingUp, MapPin } from "lucide-react"

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
                <span className="text-base font-bold bg-slate-700 text-gray-700 px-2 py-0.5 rounded-full normal-case tracking-normal">Beta</span>
            </h2>
            <p className="text-lg font-bold text-gray-400">Historical failure & delay probability per route</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Heatmap List */}
        <Card className="lg:col-span-2 bg-white/80 border-gray-200 backdrop-blur-sm">
           <CardHeader className="border-b border-gray-200 pb-4">
             <CardTitle className="text-xl font-medium text-gray-800 flex items-center gap-2">
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
                                <div className={`text-xl font-bold ${r.risk_level === 'High' ? 'text-red-500' : r.risk_level === 'Medium' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                    {r.risk_score}
                                </div>
                                <div className="text-base font-bold text-gray-500 uppercase">Score</div>
                            </div>
                            
                            <div>
                                <div className="text-gray-800 font-medium text-xl group-hover:text-orange-400 transition-colors">
                                    {r.route_name}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="flex items-center gap-1.5 text-lg font-bold text-gray-500">
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
                     <div className="py-8 text-center text-gray-400 text-xl">ไม่พบข้อมูลความเสี่ยง</div>
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}

