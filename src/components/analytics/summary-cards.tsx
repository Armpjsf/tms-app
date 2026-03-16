"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { DollarSign, TrendingUp, Percent, ArrowUpRight, ArrowDownRight, Target, ShieldCheck, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

type KPIData = {
  current: number;
  previous: number;
  growth: number;
  target?: number;
  attainment?: number;
}

type ExecutiveKPIs = {
  revenue: KPIData;
  profit: KPIData;
  margin: KPIData;
}

const GrowthIndicator = ({ value, isPoints = false }: { value: number, isPoints?: boolean }) => {
  const isPositive = value >= 0
  return (
    <div className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter italic transition-all group-hover:scale-105",
        isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
    )}>
      {isPositive ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
      {Math.abs(value).toFixed(1)}{isPoints ? ' PTS' : '%'}
    </div>
  )
}

export function FinancialSummaryCards({ data }: { data: ExecutiveKPIs }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {/* Revenue COMMAND */}
      <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-0 rounded-br-[3rem] rounded-tl-[1.5rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <div className="space-y-1">
              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">Gross Revenue</h3>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest italic">Operational Output Index</p>
           </div>
           <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 shadow-lg shadow-emerald-500/10">
              <DollarSign size={18} />
           </div>
        </div>
        <div className="p-8">
          <div className="flex flex-col gap-2">
            <div className="text-4xl font-black text-white tracking-tighter">{formatCurrency(data.revenue.current)}</div>
            <div className="flex items-center justify-between mt-2">
                <GrowthIndicator value={data.revenue.growth} />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic border-l border-slate-800 pl-3">Live Feed</span>
            </div>
          </div>
          {data.revenue.target && (
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black italic">
                <span>TARGET THRESHOLD</span>
                <span className="text-emerald-400">{data.revenue.attainment?.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                <div 
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                    style={{ width: `${Math.min(data.revenue.attainment || 0, 100)}%` }} 
                />
              </div>
            </div>
          )}
        </div>
      </PremiumCard>

      {/* Net Profit COMMAND */}
      <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-0 rounded-br-[3rem] rounded-tl-[1.5rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <div className="space-y-1">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] italic">Net Yield</h3>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest italic">Commercial Integrity Marker</p>
           </div>
           <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shadow-lg shadow-blue-500/10">
              <TrendingUp size={18} />
           </div>
        </div>
        <div className="p-8">
          <div className="flex flex-col gap-2">
            <div className={cn("text-4xl font-black tracking-tighter", data.profit.current >= 0 ? 'text-white' : 'text-red-500')}>
              {formatCurrency(data.profit.current)}
            </div>
            <div className="flex items-center justify-between mt-2">
                <GrowthIndicator value={data.profit.growth} />
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest italic border-l border-slate-800 pl-3">
                   PREV: {formatCurrency(data.profit.previous)}
                </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* Profit Margin COMMAND */}
      <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-0 rounded-br-[3rem] rounded-tl-[1.5rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <div className="space-y-1">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Operational Margin</h3>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest italic">Strategic Efficiency Ratio</p>
           </div>
           <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 shadow-lg shadow-indigo-500/10">
              <Percent size={18} />
           </div>
        </div>
        <div className="p-8">
          <div className="flex flex-col gap-2">
            <div className="text-4xl font-black text-white tracking-tighter">{data.margin.current.toFixed(1)}%</div>
            <div className="flex items-center justify-between mt-2">
                <GrowthIndicator value={data.margin.growth} isPoints />
                <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                    <Target size={10} className="text-indigo-400" />
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest italic">GOAL: {data.margin.target}%</span>
                </div>
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* INTELLIGENCE Health Score */}
      <PremiumCard className="bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
           <div className="space-y-0.5">
             <h3 className="text-[11px] font-black text-emerald-600 tracking-[0.2em] uppercase italic">System Integrity</h3>
             <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest italic">Autonomous Tactical Audit</p>
           </div>
           <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40 border-4 border-white animate-pulse" />
        </div>

        <div className="flex flex-col items-start gap-1 relative z-10">
            <div className="text-5xl font-black text-emerald-600 tracking-tighter italic flex items-center gap-2">
                NOMINAL <ShieldCheck className="text-emerald-500" size={32} />
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight mt-2 italic shadow-sm bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">Performance Threshold: OPTIMAL</p>
        </div>

        <div className="flex gap-1.5 mt-8 relative z-10">
            {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    i <= 7 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-100'
                )} />
            ))}
        </div>
      </PremiumCard>
    </div>
  )
}
