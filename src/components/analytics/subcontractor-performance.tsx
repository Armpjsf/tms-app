"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type SubPerItem = {
    name: string;
    revenue: number;
    cost: number;
    count: number;
}

export function SubcontractorPerformance({ data }: { data: SubPerItem[] }) {
    const COLORS = ['#3b82f6', '#f59e0b'];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={item.name} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-sm font-medium text-white">{item.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">รายรับ (Revenue)</p>
                                <p className="text-sm font-bold text-slate-200">{formatCurrency(item.revenue)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">จำนวนงาน (Jobs)</p>
                                <p className="text-sm font-bold text-slate-200">{item.count} งาน</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
