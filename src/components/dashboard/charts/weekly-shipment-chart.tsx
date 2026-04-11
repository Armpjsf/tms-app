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
        <div className="h-[350px] flex items-center justify-center text-muted-foreground font-black uppercase tracking-[0.2em] text-lg font-bold">
            Data Matrix Offline
        </div>
    )
  }

  return (
    <div className="h-[350px] w-full font-sans relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data}>
            <defs>
                <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff1e85" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ff1e85" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="barGradientAccent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333ea" stopOpacity={1} />
                    <stop offset="100%" stopColor="#9333ea" stopOpacity={0.3} />
                </linearGradient>
            </defs>
            <XAxis 
            dataKey="date" 
            stroke="#475569" 
            fontSize={10} 
            fontWeight="900"
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#64748b' }}
            dy={10}
            />
            <YAxis 
            stroke="#475569" 
            fontSize={10} 
            fontWeight="900"
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}`} 
            tick={{ fill: '#64748b' }}
            />
            <Tooltip
                contentStyle={{ 
                    backgroundColor: "rgba(10, 5, 24, 0.95)", 
                    border: "1px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: "20px", 
                    color: "#fff",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                    backdropFilter: "blur(20px)"
                }}
                itemStyle={{ fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
            />
            <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em' }}
                iconType="circle"
            />
            <Bar 
                dataKey="total" 
                name="Total Missions" 
                fill="url(#barGradientAccent)" 
                radius={[8, 8, 0, 0]} 
                barSize={24}
            />
            <Bar 
                dataKey="completed" 
                name="Successful Deliveries" 
                fill="url(#barGradientPrimary)" 
                radius={[8, 8, 0, 0]} 
                barSize={24}
            />
        </BarChart>
        </ResponsiveContainer>
    </div>
  )
}

