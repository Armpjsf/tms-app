"use client"

import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    LineChart, 
    Line,
    Legend
} from 'recharts'
import { PremiumCard } from "@/components/ui/premium-card"
import { Package, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

type PerformanceData = {
  date: string
  revenue: number
  cost: number
  jobCount: number
  onTimeCount: number
}

export function PerformanceCharts({ data }: { data: PerformanceData[] }) {
  const { t } = useLanguage()
  // Pre-process data for charts
  const chartData = data.map(d => ({
    ...d,
    onTimeRate: d.jobCount > 0 ? (d.onTimeCount / d.jobCount) * 100 : 0,
    lateJobs: d.jobCount - d.onTimeCount
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Job Volume Trend */}
      <PremiumCard className="bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
        <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg">
                    <Package size={16} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white tracking-tight italic uppercase">{t('charts.mission_volume')}</h3>
                    <p className="text-emerald-400 text-base font-bold font-bold uppercase tracking-[0.2em]">{t('charts.throughput_trend')}</p>
                </div>
            </div>
        </div>
        <div className="p-10 h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10} 
                fontWeight="900"
                tickLine={false} 
                axisLine={false}
                className="uppercase italic"
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                fontWeight="900"
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ 
                    backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                    borderColor: 'rgba(30, 41, 59, 0.5)', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(12px)'
                }}
                itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}/>
              <Bar dataKey="onTimeCount" name={t('charts.nominal_ops')} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="lateJobs" name={t('charts.delayed')} stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PremiumCard>

      {/* On-Time Efficiency */}
      <PremiumCard className="bg-white border-none shadow-[0_30_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
        <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg">
                    <CheckCircle2 size={16} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white tracking-tight italic uppercase">{t('charts.reliability_index')}</h3>
                    <p className="text-blue-400 text-base font-bold font-bold uppercase tracking-[0.2em]">{t('charts.on_time_efficiency')}</p>
                </div>
            </div>
        </div>
        <div className="p-10 h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10} 
                fontWeight="900"
                tickLine={false} 
                axisLine={false}
                className="uppercase italic"
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                fontWeight="900"
                tickLine={false} 
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                    borderColor: 'rgba(30, 41, 59, 0.5)', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(12px)'
                }}
                itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                formatter={(val) => [`${Number(val).toFixed(1)}%`, t('charts.reliability')]}
              />
              <Line 
                type="monotone" 
                dataKey="onTimeRate" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                dot={{ r: 4, strokeWidth: 2, fill: '#0f172a', stroke: '#3b82f6' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </PremiumCard>
    </div>
  )
}

