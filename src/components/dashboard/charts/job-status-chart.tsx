"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"

type StatusData = {
  name: string
  value: number
  fill: string
}

export function JobStatusChart({ data }: { data: StatusData[] }) {
  if (!data || data.length === 0) {
    return (
        <div className="h-[300px] flex items-center justify-center text-slate-500">
            No data available
        </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip 
            contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
            itemStyle={{ color: "#fff" }}
        />
        <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
