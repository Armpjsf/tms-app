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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, CheckCircle2 } from "lucide-react"

type PerformanceData = {
  date: string
  revenue: number
  cost: number
  jobCount: number
  onTimeCount: number
}

export function PerformanceCharts({ data }: { data: PerformanceData[] }) {
  // Pre-process data for charts
  const chartData = data.map(d => ({
    ...d,
    onTimeRate: d.jobCount > 0 ? (d.onTimeCount / d.jobCount) * 100 : 0,
    lateJobs: d.jobCount - d.onTimeCount
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Job Volume Trend */}
      <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
        <CardHeader className="border-b border-slate-800/50 bg-slate-900/40">
            <CardTitle className="text-white flex items-center gap-3 text-sm font-bold">
                <Package className="text-indigo-400" size={18} /> 
                <span>ปริมาณงานสะสม <span className="text-slate-500 font-normal text-xs ml-1">(Job Volume Trend)</span></span>
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} verticalAlign="top" height={36}/>
              <Bar dataKey="onTimeCount" name="ส่งตรงเวลา" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="lateJobs" name="ส่งล่าช้า" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* On-Time Efficiency */}
      <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
        <CardHeader className="border-b border-slate-800/50 bg-slate-900/40">
            <CardTitle className="text-white flex items-center gap-3 text-sm font-bold">
                <CheckCircle2 className="text-emerald-400" size={18} /> 
                <span>เปอร์เซ็นต์ความตรงเวลา <span className="text-slate-500 font-normal text-xs ml-1">(On-Time Reliability)</span></span>
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
                formatter={(val) => [`${Number(val).toFixed(1)}%`, 'ตรงเวลา']}
              />
              <Line 
                type="monotone" 
                dataKey="onTimeRate" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
