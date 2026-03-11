"use client"

import { 
    ScatterChart, 
    Scatter, 
    XAxis, 
    YAxis, 
    ZAxis,
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Zap } from "lucide-react"

export function EfficiencyCharts({ data }: { data: { date: string; revenue: number; cost: number; jobCount: number }[] }) {
  // Process data for correlation (Revenue vs Cost per Job)
  const correlationData = data.filter(d => d.jobCount > 0).map(d => ({
    name: d.date,
    revenuePerJob: d.revenue / d.jobCount,
    costPerJob: d.cost / d.jobCount,
    jobCount: d.jobCount
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue vs Cost Correlation */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-xl">
        <CardHeader className="border-b border-gray-200 bg-white/80">
            <CardTitle className="text-gray-900 flex items-center gap-3 text-sm font-black">
                <Coins className="text-amber-500" size={18} /> 
                <span>ประสิทธิภาพต้นทุนเฉลี่ยต่อชิ้น <span className="text-gray-700 font-bold font-normal text-xs ml-1">(Cost vs Revenue per Job)</span></span>
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                type="number" 
                dataKey="costPerJob" 
                name="ต้นทุนเฉลี่ย" 
                unit="฿" 
                stroke="#64748b" 
                fontSize={10}
                tickLine={false}
              />
              <YAxis 
                type="number" 
                dataKey="revenuePerJob" 
                name="รายได้เฉลี่ย" 
                unit="฿" 
                stroke="#64748b" 
                fontSize={10}
                tickLine={false}
              />
              <ZAxis type="number" dataKey="jobCount" range={[50, 400]} name="จำนวนงาน" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a', fontWeight: '800' }}
              />
              <Scatter name="Days" data={correlationData} fill="#3b82f6">
                {correlationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.revenuePerJob > entry.costPerJob ? '#10b981' : '#ef4444'} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary KPI for Efficiency */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-xl border-l-4 border-l-indigo-500">
        <CardContent className="p-8 flex flex-col justify-center h-full space-y-6">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-700">
                  <Zap size={32} />
              </div>
              <div>
                  <h3 className="text-gray-700 text-sm font-black uppercase tracking-wider">Efficiency Index</h3>
                  <p className="text-2xl font-black text-gray-900">Cost/Revenue Optimization</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-100/40 p-4 rounded-xl border border-gray-200">
                  <p className="text-[10px] text-gray-700 uppercase font-black mb-1">Avg Margin</p>
                  <p className="text-xl font-black text-emerald-700">
                    {((correlationData.reduce((acc, curr) => acc + (curr.revenuePerJob - curr.costPerJob), 0) / correlationData.length) / (correlationData.reduce((acc, curr) => acc + curr.revenuePerJob, 0) / correlationData.length) * 100).toFixed(1)}%
                  </p>
              </div>
              <div className="bg-gray-100/40 p-4 rounded-xl border border-gray-200">
                  <p className="text-[10px] text-gray-700 uppercase font-black mb-1">Cost Volatility</p>
                  <p className="text-xl font-black text-emerald-700">Low</p>
              </div>
           </div>
           
           <p className="text-xs text-gray-700 font-bold leading-relaxed">
             การวิเคราะห์ความสัมพันธ์ระหว่างรายได้และต้นทุนแสดงให้เห็นว่าจุดคุ้มทุนของงานส่วนใหญ่อยู่ในเกณฑ์มาตรฐาน 
             ควรจับตามองวันที่จุดข้อมูลเป็นสีแดงเพื่อวิเคราะห์หาสาเหตุของต้นทุนที่สูงผิดปกติ
           </p>
        </CardContent>
      </Card>
    </div>
  )
}
