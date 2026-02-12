"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

type CostData = {
  driver: number
  fuel: number
  maintenance: number
}

export function CostBreakdownChart({ data }: { data: CostData }) {
  const chartData = [
    { name: 'ค่าจ้างคนขับ', value: data.driver, color: '#3b82f6' }, // blue
    { name: 'ค่าน้ำมัน', value: data.fuel, color: '#f59e0b' },   // amber
    { name: 'ค่าซ่อมบำรุง', value: data.maintenance, color: '#ef4444' }, // red
  ].filter(item => item.value > 0)

  return (
    <div className="h-[350px] w-full flex items-center justify-center">
        {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    formatter={(value: number | undefined) => [new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value || 0), 'ต้นทุน']}
                />
                <Legend />
                </PieChart>
            </ResponsiveContainer>
        ) : (
            <div className="text-slate-500">ไม่มีข้อมูลต้นทุน</div>
        )}
    </div>
  )
}
