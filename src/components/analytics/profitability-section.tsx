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
import { Coins, TrendingUp, Truck, Activity, Target } from "lucide-react"
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
        <div className="space-y-10">
            {/* Sub-Section Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-950 rounded-xl text-emerald-500 shadow-lg border border-slate-800">
                <TrendingUp size={18} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase premium-text-gradient">Operational Profitability Matrix</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vehicle Profitability Chart */}
                <PremiumCard className="lg:col-span-2 bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
                    <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg">
                                <Truck size={16} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight italic uppercase">Asset Yield COMMAND</h3>
                                <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-[0.2em]">Net Profit Analysis per Operational Unit</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-10 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topPerformers} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                                <YAxis dataKey="plate" type="category" stroke="#1e293b" width={100} fontSize={10} fontWeight="900" tickLine={false} axisLine={false} className="uppercase italic" />
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
                                    formatter={(value: number) => [`฿${Number(value).toLocaleString()}`, 'Net Yield']}
                                />
                                <Bar dataKey="netProfit" radius={[0, 4, 4, 0]} barSize={24}>
                                    {topPerformers.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.netProfit > 0 ? '#10b981' : '#f43f5e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </PremiumCard>

                {/* Cost Structure Analysis */}
                <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-0 rounded-br-[4rem] rounded-tl-[2rem]">
                    <div className="p-8 border-b border-white/5 relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg">
                                <Coins size={16} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight italic uppercase">Cost Composition</h3>
                                <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-[0.2em]">Regional expenditure Allocation</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={costBreakdownData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {costBreakdownData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                                        formatter={(value: number) => [`฿${Number(value).toLocaleString()}`, 'Expenditure']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Total OpEx</span>
                                <span className="text-2xl font-black text-white tracking-tighter italic mt-1">
                                    ฿{(financials.cost.total / 1000).toFixed(0)}K
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mt-6">
                            {costBreakdownData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group-hover/cost:border-white/10 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}50` }} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-white italic">
                                        {financials.cost.total > 0 ? ((item.value / financials.cost.total) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </PremiumCard>

                {/* Performance Ledger Table */}
                <PremiumCard className="lg:col-span-3 bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
                    <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-slate-700 rounded-xl text-white shadow-lg">
                                <Activity size={16} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight italic uppercase">Vehicle Performance Ledger</h3>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em]">Detailed Asset Yield & Expenditure Audit</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset ID</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Revenue Yield</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Driver Payout</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Fuel Expenditure</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Technical Maint.</th>
                                    <th className="p-8 text-[10px] font-black text-slate-950 uppercase tracking-widest italic text-right">Net Margin</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center">Efficiency Rating</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.slice(0, 10).map((item) => (
                                    <tr key={item.plate} className="group/row hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-slate-300">
                                        <td className="p-8 font-black text-slate-900 text-sm tracking-tight uppercase italic group-hover/row:translate-x-1 transition-transform">{item.plate}</td>
                                        <td className="p-8 text-right font-black text-slate-900">฿{item.revenue.toLocaleString()}</td>
                                        <td className="p-8 text-right font-bold text-slate-500 text-xs italic">฿{item.driverCost.toLocaleString()}</td>
                                        <td className="p-8 text-right font-bold text-slate-500 text-xs italic">฿{item.fuelCost.toLocaleString()}</td>
                                        <td className="p-8 text-right font-bold text-slate-500 text-xs italic">฿{item.maintenanceCost.toLocaleString()}</td>
                                        <td className={cn(
                                            "p-8 text-right font-black text-lg tracking-tighter italic",
                                            item.netProfit > 0 ? 'text-emerald-600' : 'text-rose-600'
                                        )}>
                                            ฿{item.netProfit.toLocaleString()}
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className={cn(
                                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic border transition-all",
                                                item.revenue > 0 && (item.netProfit / item.revenue) > 0.2 
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' 
                                                    : item.revenue > 0 && (item.netProfit / item.revenue) > 0.1 
                                                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                        : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
                                            )}>
                                                {item.revenue > 0 ? ((item.netProfit / item.revenue) * 100).toFixed(1) : 0}% YIELD
                                            </span>
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
