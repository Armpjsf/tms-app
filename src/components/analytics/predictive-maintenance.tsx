"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VehicleRisk } from "@/lib/supabase/predictive-analytics"
import { AlertTriangle, CheckCircle2, AlertOctagon, BrainCircuit } from "lucide-react"

export function PredictiveMaintenance({ risks }: { risks: VehicleRisk[] }) {
  const critical = risks.filter(r => r.risk_level === 'Critical')
  const warning = risks.filter(r => r.risk_level === 'Warning')
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-purple-400">
        <div className="p-2 bg-purple-500/10 rounded-lg animate-pulse">
            <BrainCircuit size={20} />
        </div>
        <div>
            <h2 className="text-lg font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                AI Predictive Maintenance
                <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full normal-case tracking-normal">BETA</span>
            </h2>
            <p className="text-xs text-slate-500">Machine Learning analyzing usage patterns & repair history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Critical Risk</span>
                    <AlertOctagon size={16} className="text-red-500" />
                </div>
                <div className="text-3xl font-bold text-red-500">{critical.length}</div>
                <p className="text-xs text-slate-500 mt-1">Vehicles needing immediate attention</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Warning Risk</span>
                    <AlertTriangle size={16} className="text-yellow-500" />
                </div>
                <div className="text-3xl font-bold text-yellow-500">{warning.length}</div>
                <p className="text-xs text-slate-500 mt-1">Show signs of potential failure</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Healthy Fleet</span>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
                <div className="text-3xl font-bold text-emerald-500">{risks.length - critical.length - warning.length}</div>
                <p className="text-xs text-slate-500 mt-1">Operating within optimal parameters</p>
            </CardContent>
          </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <AlertOctagon size={16} className="text-red-400" />
               High Probability Failure Predictions
             </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {[...critical, ...warning].slice(0, 5).map((r, i) => (
                    <div key={i} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${r.risk_level === 'Critical' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                {r.risk_score}
                            </div>
                            <div>
                                <div className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors">
                                    {r.vehicle_plate} <span className="text-slate-500 font-normal">({r.vehicle_type})</span>
                                </div>
                                <div className="text-xs text-red-300 mt-1 flex items-center gap-1">
                                    <BrainCircuit size={12} />
                                    Prediction: {r.predicted_issue || 'Unknown Issue'}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-slate-400 text-xs">Est. Service In</div>
                             <div className={`font-bold text-sm ${r.days_to_service < 14 ? 'text-red-400' : 'text-white'}`}>
                                {r.days_to_service} Days
                             </div>
                             <div className="text-[10px] text-slate-500 mt-0.5">{r.current_mileage.toLocaleString()} km</div>
                        </div>
                    </div>
                ))}
                {[...critical, ...warning].length === 0 && (
                     <div className="py-8 text-center text-slate-500 text-sm">AI ตรวจไม่พบความเสี่ยงในขณะนี้</div>
                )}
             </div>
        </CardContent>
      </Card>
    </div>
  )
}
