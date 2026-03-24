"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import { Coins, TrendingUp, Truck, Activity, Target, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

type VehicleProfitData = {
    plate: string
    revenue: number
    driverCost: number
    fuelCost: number
    maintenanceCost: number
    totalCost: number
    netProfit: number
}

type Props = {
    data: VehicleProfitData[]
    financials: {
        revenue: number
        cost: {
            total: number
            driver: number
            fuel: number
            maintenance: number
        }
    }
}

export function ProfitabilitySection({ data = [], financials }: Props) {
    // Sort by profit for the chart
    const topPerformers = [...data].sort((a, b) => b.netProfit - a.netProfit).slice(0, 5)
    
    const costBreakdownData = [
        { name: 'Driver Payout', value: financials.cost.driver, color: '#10b981' },
        { name: 'Fuel Intelligence', value: financials.cost.fuel, color: '#3b82f6' },
        { name: 'Technical Maint.', value: financials.cost.maintenance, color: '#f59e0b' }
    ]

    return (
        <div className="space-y-12">
            {/* Sub-Section Header */}
            <div className="flex items-center gap-6 group/h">
                <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-emerald-500/30 group-hover/h:scale-110 transition-transform duration-500">
                    <TrendingUp size={24} strokeWidth={2.5} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-black text-white tracking-widest uppercase italic premium-text-gradient">Operational Profitability Matrix</h3>
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] italic opacity-60">Strategic Fleet realization audit // COLD_STORAGE_01</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Vehicle Profitability Chart */}
                <PremiumCard className="lg:col-span-2 bg-[#0a0518] border-2 border-white/5 shadow-3xl p-0 overflow-hidden rounded-br-[6rem] rounded-tl-[3rem] group/chart">
                    <div className="p-10 border-b border-white/5 bg-black/40 relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                <Truck size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tighter italic uppercase">Asset Yield COMMAND</h3>
                                <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em]">Net Profit Analysis per Operational Unit</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-12 h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topPerformers} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="#475569" fontSize={11} fontWeight="900" tickLine={false} axisLine={false} />
                                <YAxis dataKey="plate" type="category" stroke="#fff" width={100} fontSize={11} fontWeight="900" tickLine={false} axisLine={false} className="uppercase italic" />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                                        borderColor: 'rgba(255, 255, 255, 0.1)', 
                                        borderRadius: '24px', 
                                        border: '2px solid rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(12px)',
                                        padding: '20px'
                                    }}
                                    itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}
                                    formatter={(value: number) => [`฿${Number(value).toLocaleString()}`, 'Net Yield']}
                                />
                                <Bar dataKey="netProfit" radius={[0, 8, 8, 0]} barSize={32}>
                                    {topPerformers.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.netProfit > 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </PremiumCard>

                {/* Cost Structure Analysis */}
                <PremiumCard className="bg-[#0a0518] border-2 border-white/5 shadow-3xl relative overflow-hidden group/cost p-0 rounded-br-[5rem] rounded-tl-[3rem]">
                    <div className="p-10 border-b border-white/5 bg-black/40 relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-transparent" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-500 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                <Coins size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tighter italic uppercase">Cost Composition</h3>
                                <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.4em]">Regional expenditure Allocation</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-10">
                        <div className="h-[280px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={costBreakdownData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={75}
                                        outerRadius={105}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {costBreakdownData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.95)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '24px', backdropFilter: 'blur(12px)' }}
                                        itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}
                                        formatter={(value: number) => [`฿${Number(value).toLocaleString()}`, 'Expenditure']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Total OpEx</span>
                                <span className="text-3xl font-black text-white tracking-tighter italic">
                                    ฿{(financials.cost.total / 1000).toFixed(0)}K
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mt-8">
                            {costBreakdownData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 15px ${item.color}50` }} />
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-white italic">
                                        {financials.cost.total > 0 ? ((item.value / financials.cost.total) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </PremiumCard>

                {/* Performance Ledger Table */}
                <PremiumCard className="lg:col-span-3 bg-[#0a0518] border-2 border-white/5 shadow-3xl p-0 overflow-hidden rounded-br-[6rem] rounded-tl-[3rem]">
                    <div className="p-10 border-b border-white/5 bg-black/40 relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 to-transparent" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-3 bg-white/10 rounded-2xl text-white border border-white/10">
                                <Activity size={22} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-white tracking-tighter italic uppercase underline decoration-primary/30 underline-offset-8">Vehicle Performance Ledger</h4>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Detailed Asset Yield & Expenditure Audit // LOGIS_TERMINAL_01</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md">
                            <Zap size={14} className="text-primary animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Data Uplink</span>
                        </div>
                    </div>
                    <div className="p-0 overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-white/5 bg-white/[0.02]">
                                    <th className="p-10 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em] italic">Asset ID</th>
                                    <th className="p-10 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em] italic text-right">Revenue Yield</th>
                                    <th className="p-10 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em] italic text-right">Driver Payout</th>
                                    <th className="p-10 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em] italic text-right">Fuel Expenditure</th>
                                    <th className="p-10 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em] italic text-right">Technical Maint.</th>
                                    <th className="p-10 text-[12px] font-black text-white uppercase tracking-[0.1em] italic text-right">Net Margin</th>
                                    <th className="p-10 text-[12px] font-black text-slate-500 uppercase tracking-[0.1em] italic text-center">Efficiency Rating</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.slice(0, 10).map((item) => (
                                    <tr key={item.plate} className="group/row hover:bg-white/[0.04] transition-all border-l-4 border-transparent hover:border-primary/50">
                                        <td className="p-10 font-black text-white text-lg tracking-tighter uppercase italic group-hover/row:translate-x-2 transition-transform duration-500">{item.plate}</td>
                                        <td className="p-10 text-right font-black text-primary text-xl tracking-tighter italic">฿{item.revenue.toLocaleString()}</td>
                                        <td className="p-10 text-right font-black text-slate-400 text-sm italic">฿{item.driverCost.toLocaleString()}</td>
                                        <td className="p-10 text-right font-black text-slate-400 text-sm italic">฿{item.fuelCost.toLocaleString()}</td>
                                        <td className="p-10 text-right font-black text-slate-400 text-sm italic">฿{item.maintenanceCost.toLocaleString()}</td>
                                        <td className={cn(
                                            "p-10 text-right font-black text-2xl tracking-tighter italic",
                                            item.netProfit > 0 ? 'text-emerald-500' : 'text-rose-500'
                                        )}>
                                            ฿{item.netProfit.toLocaleString()}
                                        </td>
                                        <td className="p-10 text-center">
                                            <div className={cn(
                                                "inline-block px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic border transition-all duration-500",
                                                item.revenue > 0 && (item.netProfit / item.revenue) > 0.2 
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                                                    : item.revenue > 0 && (item.netProfit / item.revenue) > 0.1 
                                                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' 
                                                        : 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse'
                                            )}>
                                                {item.revenue > 0 ? ((item.netProfit / item.revenue) * 100).toFixed(1) : 0}% YIELD
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </PremiumCard>
            </div>
        </div>
    )
}
