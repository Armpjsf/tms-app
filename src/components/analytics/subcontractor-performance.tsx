"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartContainer } from "@/components/ui/chart-container";
import { useLanguage } from '@/components/providers/language-provider';

type SubPerItem = {
    name: string;
    revenue: number;
    cost: number;
    count: number;
}

export function SubcontractorPerformance({ data }: { data: SubPerItem[] }) {
    const { t } = useLanguage()
    const COLORS = ['#3b82f6', '#f59e0b'];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-[250px] w-full">
                <ChartContainer height={250}>
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
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                                border: '2px solid rgba(255,255,255,0.1)', 
                                borderRadius: '20px', 
                                backdropFilter: 'blur(12px)'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            iconType="circle"
                            formatter={(value) => <span className="text-[11px] font-black text-muted-foreground uppercase italic ml-2">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
                </ChartContainer>
            </div>
            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={item.name} className="p-6 bg-muted/40 rounded-2xl border border-border/5 group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-xl font-black text-foreground italic uppercase tracking-tight group-hover:text-blue-400 transition-colors">{item.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase italic">{t('dashboard.aggregate_revenue')}</p>
                                <p className="text-xl font-black text-foreground italic">{formatCurrency(item.revenue)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase italic">{t('dashboard.mission_volume')}</p>
                                <p className="text-xl font-black text-foreground italic">{item.count} <span className="text-base font-bold text-muted-foreground/60">{t('common.units')}</span></p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

