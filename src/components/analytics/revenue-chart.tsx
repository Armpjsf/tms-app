"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type RevenueData = {
  date: string
  revenue: number
  cost: number
}

export function RevenueTrendChart({ data }: { data: RevenueData[] }) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `฿${value / 1000}k`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
            cursor={{ fill: '#334155', opacity: 0.2 }}
            formatter={(value: number | undefined) => [new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value || 0), 'บาท']}
          />
          <Legend />
          <Bar dataKey="revenue" name="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cost" name="ต้นทุน (งาน)" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
