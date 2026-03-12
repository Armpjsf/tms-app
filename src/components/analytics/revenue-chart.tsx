"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from "@/lib/utils"

type RevenueData = {
  date: string
  revenue: number
  cost: number
}

export function RevenueTrendChart({ data }: { data: RevenueData[] }) {
  return (
    <div className="h-[450px] w-full min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
          <XAxis 
            dataKey="date" 
            stroke="#475569" 
            fontSize={10} 
            fontWeight="900"
            tickLine={false} 
            axisLine={false}
            dy={10}
            className="uppercase italic tracking-widest"
          />
          <YAxis 
            stroke="#475569" 
            fontSize={10} 
            fontWeight="900"
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `฿${value >= 1000 ? (value / 1000) + 'K' : value}`}
          />
          <Tooltip 
            cursor={{ stroke: '#1e293b', strokeWidth: 1 }}
            contentStyle={{ 
                backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                borderColor: 'rgba(30, 41, 59, 0.5)', 
                borderRadius: '16px', 
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            formatter={(value: number | string | undefined) => [
              new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number(value || 0)), 
              ''
            ]}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', fontStyle: 'italic' }} 
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            name="Gross Revenue" 
            stroke="#10b981" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorRev)" 
            filter="url(#glow)"
            className="drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          />
          <Area 
            type="monotone" 
            dataKey="cost" 
            name="Operational Cost" 
            stroke="#f43f5e" 
            strokeWidth={2}
            strokeDasharray="6 6"
            fillOpacity={1} 
            fill="url(#colorCost)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
