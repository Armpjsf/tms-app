"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Percent, ArrowUpRight, ArrowDownRight, Target } from "lucide-react"

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
    <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {Math.abs(value).toFixed(1)}{isPoints ? ' pts' : '%'}
    </div>
  )
}

export function FinancialSummaryCards({ data }: { data: ExecutiveKPIs }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Revenue */}
      <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-emerald-500/30 transition-all shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-slate-400">รายรับรวม (Revenue)</CardTitle>
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-white">{formatCurrency(data.revenue.current)}</div>
            <GrowthIndicator value={data.revenue.growth} />
          </div>
          {data.revenue.target && (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <span>Target Progress</span>
                <span>{data.revenue.attainment?.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                    className="bg-emerald-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                    style={{ width: `${Math.min(data.revenue.attainment || 0, 100)}%` }} 
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Profit */}
      <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-blue-500/30 transition-all shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-slate-400">กำไรสุทธิ (Net Profit)</CardTitle>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className={`text-3xl font-black ${data.profit.current >= 0 ? 'text-white' : 'text-red-400'}`}>
              {formatCurrency(data.profit.current)}
            </div>
            <GrowthIndicator value={data.profit.growth} />
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">เทียบกับช่วงเวลาที่แล้ว: {formatCurrency(data.profit.previous)}</p>
        </CardContent>
      </Card>

      {/* Profit Margin */}
      <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-indigo-500/30 transition-all shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-slate-400">อัตรากำไร (Margin)</CardTitle>
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Percent className="h-4 w-4 text-indigo-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-white">{data.margin.current.toFixed(1)}%</div>
            <GrowthIndicator value={data.margin.growth} isPoints />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="p-1 bg-slate-800 rounded">
                <Target size={12} className="text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Goal: {data.margin.target}%</p>
          </div>
        </CardContent>
      </Card>

      {/* Operational Efficiency Card (Replace Total Cost with a efficiency metric) */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-bold text-emerald-400 tracking-widest uppercase">Health Score</CardTitle>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black text-white tracking-tighter">GOOD</div>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Operations are within targets</p>
          <div className="flex gap-1 mt-3">
            {[1,2,3,4,5].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= 4 ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
