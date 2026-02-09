"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

type WeeklyStats = {
  date: string
  total: number
  completed: number
}

export function WeeklyShipmentChart({ data }: { data: WeeklyStats[] }) {
  if (!data || data.length === 0) {
    return (
        <div className="h-[300px] flex items-center justify-center text-slate-500">
            No data available
        </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis 
          dataKey="date" 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(value) => `${value}`} 
        />
        <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
            cursor={{ fill: 'transparent' }}
        />
        <Legend />
        <Bar 
            dataKey="total" 
            name="งานทั้งหมด" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]} 
            barSize={30}
        />
        <Bar 
            dataKey="completed" 
            name="ส่งสำเร็จ" 
            fill="#10b981" 
            radius={[4, 4, 0, 0]} 
            barSize={30}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
