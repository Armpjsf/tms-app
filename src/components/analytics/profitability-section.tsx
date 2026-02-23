"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Coins, TrendingUp, Truck } from "lucide-react"

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

export function ProfitabilitySection({ data, financials }: Props) {
    // Sort by profit for the chart
    const topPerformers = [...data].sort((a, b) => b.netProfit - a.netProfit).slice(0, 5)
    
    const costBreakdownData = [
        { name: 'Driver Payout', value: financials.cost.driver, color: '#10b981' },
        { name: 'Fuel', value: financials.cost.fuel, color: '#3b82f6' },
        { name: 'Maintenance', value: financials.cost.maintenance, color: '#f59e0b' }
    ]

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
                <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="text-emerald-400" size={18} />
                        กำไรรายคัน (Profit per Vehicle)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topPerformers} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                            <XAxis type="number" stroke="#94a3b8" />
                            <YAxis dataKey="plate" type="category" stroke="#94a3b8" width={100} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                                formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'Net Profit']}
                            />
                            <Bar dataKey="netProfit" radius={[0, 4, 4, 0]}>
                                {topPerformers.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.netProfit > 0 ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl">
                <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Coins className="text-blue-400" size={18} />
                        สัดส่วนต้นทุน (Cost Structure)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={costBreakdownData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {costBreakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                                    formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'Cost']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-4 mt-4">
                        {costBreakdownData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs text-slate-400">{item.name}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-200">
                                    {financials.cost.total > 0 ? ((item.value / financials.cost.total) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="lg:col-span-3 bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-slate-900/80">
                    <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
                        <Truck className="text-slate-400" size={16} />
                        ตารางสรุปรายรับ-รายจ่าย รายคัน (Vehicle Performance Ledger)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-800/50 text-slate-400 uppercase font-bold border-b border-slate-700">
                                <tr>
                                    <th className="p-4">ทะเบียนรถ</th>
                                    <th className="p-4 text-right">รายรับ (Revenue)</th>
                                    <th className="p-4 text-right">คนขับ (Driver)</th>
                                    <th className="p-4 text-right">น้ำมัน (Fuel)</th>
                                    <th className="p-4 text-right">ซ่อมบำรุง (Maint.)</th>
                                    <th className="p-4 text-right font-bold text-white">กำไรสุทธิ (Net Profit)</th>
                                    <th className="p-4 text-center">Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.slice(0, 10).map((item) => (
                                    <tr key={item.plate} className="border-b border-slate-800 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-bold text-slate-200">{item.plate}</td>
                                        <td className="p-4 text-right">฿{item.revenue.toLocaleString()}</td>
                                        <td className="p-4 text-right text-slate-400">฿{item.driverCost.toLocaleString()}</td>
                                        <td className="p-4 text-right text-slate-400">฿{item.fuelCost.toLocaleString()}</td>
                                        <td className="p-4 text-right text-slate-400">฿{item.maintenanceCost.toLocaleString()}</td>
                                        <td className={`p-4 text-right font-bold ${item.netProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            ฿{item.netProfit.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                item.revenue > 0 && (item.netProfit / item.revenue) > 0.2 ? 'bg-emerald-500/20 text-emerald-400' :
                                                item.revenue > 0 && (item.netProfit / item.revenue) > 0.1 ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                {item.revenue > 0 ? ((item.netProfit / item.revenue) * 100).toFixed(1) : 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
