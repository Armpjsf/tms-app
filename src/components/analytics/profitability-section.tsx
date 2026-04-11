"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { useLanguage } from "@/components/providers/language-provider"
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
import { Coins, TrendingUp, Truck, Activity, Zap, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getVehicleJobDetails } from "@/lib/supabase/analytics"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

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
    startDate?: string
    endDate?: string
}

interface JobDetail {
    Job_ID: string
    Customer_Name: string
    Route_Name: string
    Price_Cust_Total: number
    Job_Status: string
}

function JobDetailsModal({ 
    plate, 
    isOpen, 
    onClose,
    startDate,
    endDate 
}: { 
    plate: string | null, 
    isOpen: boolean, 
    onClose: () => void,
    startDate?: string,
    endDate?: string
}) {
    const { t } = useLanguage()
    const [jobs, setJobs] = useState<JobDetail[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && plate) {
            const timer = setTimeout(() => {
                setLoading(true)
                getVehicleJobDetails(plate, startDate, endDate)
                    .then(res => setJobs(res as JobDetail[]))
                    .finally(() => setLoading(false))
            }, 0)
            return () => clearTimeout(timer)
        }
    }, [isOpen, plate, startDate, endDate])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-background border-2 border-border/10 text-foreground rounded-[2rem] overflow-hidden p-0 shadow-3xl">
                <DialogHeader className="p-8 border-b border-border/5 bg-black/40">
                    <DialogTitle className="text-2xl font-black italic uppercase flex items-center gap-4">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary border border-primary/30">
                            <Truck size={20} />
                        </div>
                        {t('analytics.vehicle_audit') || 'Vehicle Mission Audit'}: <span className="text-primary">{plate}</span>
                    </DialogTitle>
                </DialogHeader>
                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest">{t('common.loading') || 'Accessing Data...'}</div>
                    ) : (
                        <div className="space-y-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/10">
                                        <th className="py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('common.job_id') || 'JOB ID'}</th>
                                        <th className="py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('common.customer') || 'CUSTOMER'}</th>
                                        <th className="py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">{t('common.revenue') || 'REVENUE'}</th>
                                        <th className="py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">{t('common.status') || 'STATUS'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {jobs.map(job => (
                                        <tr key={job.Job_ID} className="group hover:bg-muted/50 transition-colors">
                                            <td className="py-4 font-bold text-muted-foreground">{job.Job_ID}</td>
                                            <td className="py-4">
                                                <div className="font-bold text-foreground">{job.Customer_Name}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase font-black">{job.Route_Name}</div>
                                            </td>
                                            <td className="py-4 text-right font-black text-primary italic">฿{job.Price_Cust_Total?.toLocaleString()}</td>
                                            <td className="py-4 text-center">
                                                <Badge className={cn(
                                                    "bg-transparent border-2 uppercase font-black text-[9px] tracking-tighter",
                                                    job.Job_Status === 'Completed' ? "border-emerald-500/50 text-emerald-500" : "border-amber-500/50 text-amber-500"
                                                )}>
                                                    {job.Job_Status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function ProfitabilitySection({ data = [], financials, startDate, endDate }: Props) {
    const { t } = useLanguage()
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

    // Sort by profit for the chart
    const topPerformers = [...data].sort((a, b) => b.netProfit - a.netProfit).slice(0, 5)
    
    const costBreakdownData = [
        { name: t('common.driver_payout'), value: financials.cost.driver, color: '#10b981' },
        { name: t('dashboard.fuel_intelligence') || 'Fuel Intelligence', value: financials.cost.fuel, color: '#3b82f6' },
        { name: t('common.technical_maint'), value: financials.cost.maintenance, color: '#f59e0b' }
    ]

    return (
        <div className="space-y-12">
            <JobDetailsModal 
                plate={selectedVehicle} 
                isOpen={!!selectedVehicle} 
                onClose={() => setSelectedVehicle(null)}
                startDate={startDate}
                endDate={endDate}
            />

            {/* Sub-Section Header */}
            <div className="flex items-center gap-6 group/h">
                <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-emerald-500/30 group-hover/h:scale-110 transition-transform duration-500">
                    <TrendingUp size={24} strokeWidth={2.5} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-black text-foreground tracking-widest uppercase italic premium-text-gradient">{t('analytics.profitability_matrix')}</h3>
                    <p className="text-base font-bold font-black text-emerald-500 uppercase tracking-[0.4em] italic opacity-60">{t('analytics.fleet_audit')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Vehicle Profitability Chart */}
                <PremiumCard className="lg:col-span-2 bg-muted/50 border border-border/10 shadow-3xl p-0 overflow-hidden rounded-br-[6rem] rounded-tl-[3rem] group/chart">
                    <div className="p-10 border-b border-border/5 bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                <Truck size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground italic uppercase">{t('dashboard.asset_yield_spectrum')}</h3>
                                <p className="text-primary text-base font-bold font-black uppercase italic">{t('dashboard.strategic_revenue_distribution')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-12 h-[450px] relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={topPerformers} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="#1e293b" fontSize={11} fontWeight="900" tickLine={false} axisLine={false} />
                                <YAxis dataKey="plate" type="category" stroke="#1e293b" width={100} fontSize={11} fontWeight="900" tickLine={false} axisLine={false} className="uppercase italic" />
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
                                    labelStyle={{ color: '#fff', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', fontWeight: '900' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}
                                    formatter={(value: number | string) => [`฿${Number(value || 0).toLocaleString()}`, t('common.net_margin')]}
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
                <PremiumCard className="bg-muted/50 border border-border/10 shadow-3xl relative overflow-hidden group/cost p-0 rounded-br-[5rem] rounded-tl-[3rem]">
                    <div className="p-10 border-b border-border/5 bg-gradient-to-r from-indigo-500/20 via-indigo-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-500 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                <Coins size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground italic uppercase">{t('dashboard.cost_composition_matrix')}</h3>
                                <p className="text-amber-400 text-base font-bold font-black uppercase italic">{t('dashboard.operational_expenditure_analytics')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-10">
                        <div className="h-[280px] relative">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                        labelStyle={{ color: '#fff', fontWeight: '900', marginBottom: '4px' }}
                                        itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}
                                        formatter={(value: number | string) => [`฿${Number(value || 0).toLocaleString()}`, t('settings.items.accounting')]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1">TOTAL OpEx</span>
                                <span className="text-3xl font-black text-foreground tracking-tighter italic">
                                    ฿{(financials.cost.total / 1000).toFixed(0)}K
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mt-8">
                            {costBreakdownData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-5 bg-muted/40 rounded-2xl border border-border/5 hover:border-border/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 15px ${item.color}50` }} />
                                        <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{item.name}</span>
                                    </div>
                                    <span className="text-xl font-black text-foreground italic">
                                        {financials.cost.total > 0 ? ((item.value / financials.cost.total) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </PremiumCard>

                {/* Performance Ledger Table */}
                <PremiumCard className="lg:col-span-3 bg-muted/50 border border-border/10 shadow-3xl p-0 overflow-hidden rounded-br-[6rem] rounded-tl-[3rem]">
                    <div className="p-10 border-b border-border/5 bg-gradient-to-r from-slate-500/20 via-slate-500/5 to-transparent backdrop-blur-md relative overflow-hidden flex items-center justify-between">
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-3 bg-muted/80 rounded-2xl text-foreground border border-border/10">
                                <Activity size={22} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-foreground tracking-tighter italic uppercase underline decoration-primary/30 underline-offset-8">{t('analytics.performance_ledger')}</h4>
                                <p className="text-muted-foreground text-base font-bold font-black uppercase tracking-[0.4em] mt-2">{t('analytics.detailed_audit')}</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-4 bg-muted/50 px-6 py-3 rounded-2xl border border-border/10 backdrop-blur-md">
                            <Zap size={14} className="text-primary animate-pulse" />
                            <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.2em]">{t('analytics.live_uplink')}</span>
                        </div>
                    </div>
                    <div className="p-0 overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-border/5 bg-muted/30">
                                    <th className="p-10 text-[12px] font-black text-muted-foreground uppercase tracking-[0.1em] italic">{t('common.asset_id')}</th>
                                    <th className="p-10 text-[12px] font-black text-muted-foreground uppercase tracking-[0.1em] italic text-right">{t('common.revenue_yield')}</th>
                                    <th className="p-10 text-[12px] font-black text-muted-foreground uppercase tracking-[0.1em] italic text-right">{t('common.driver_payout')}</th>
                                    <th className="p-10 text-[12px] font-black text-muted-foreground uppercase tracking-[0.1em] italic text-right">{t('common.fuel_expenditure')}</th>
                                    <th className="p-10 text-[12px] font-black text-muted-foreground uppercase tracking-[0.1em] italic text-right">{t('common.technical_maint')}</th>
                                    <th className="p-10 text-[12px] font-black text-foreground uppercase tracking-[0.1em] italic text-right">{t('common.net_margin')}</th>
                                    <th className="p-10 text-[12px] font-black text-muted-foreground uppercase tracking-[0.1em] italic text-center">{t('common.efficiency_rating')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.slice(0, 10).map((item) => (
                                    <tr 
                                        key={item.plate} 
                                        className="group/row hover:bg-white/[0.04] transition-all border-l-4 border-transparent hover:border-primary/50 cursor-pointer"
                                        onClick={() => setSelectedVehicle(item.plate)}
                                    >
                                        <td className="p-10">
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-foreground text-lg tracking-tighter uppercase italic group-hover/row:translate-x-2 transition-transform duration-500">{item.plate}</span>
                                                <Info size={14} className="text-primary opacity-0 group-hover/row:opacity-100 transition-opacity" />
                                            </div>
                                        </td>
                                        <td className="p-10 text-right font-black text-primary text-xl tracking-tighter italic">฿{item.revenue.toLocaleString()}</td>
                                        <td className="p-10 text-right font-black text-muted-foreground text-xl italic">฿{item.driverCost.toLocaleString()}</td>
                                        <td className="p-10 text-right font-black text-muted-foreground text-xl italic">฿{item.fuelCost.toLocaleString()}</td>
                                        <td className="p-10 text-right font-black text-muted-foreground text-xl italic">฿{item.maintenanceCost.toLocaleString()}</td>
                                        <td className={cn(
                                            "p-10 text-right font-black text-2xl tracking-tighter italic",
                                            item.netProfit > 0 ? 'text-emerald-500' : 'text-rose-500'
                                        )}>
                                            ฿{item.netProfit.toLocaleString()}
                                        </td>
                                        <td className="p-10 text-center">
                                            <div className={cn(
                                                "inline-block px-6 py-2.5 rounded-2xl text-base font-bold font-black uppercase tracking-[0.2em] italic border transition-all duration-500",
                                                item.revenue > 0 && (item.netProfit / item.revenue) > 0.2 
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                                                    : item.revenue > 0 && (item.netProfit / item.revenue) > 0.1 
                                                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' 
                                                        : 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse'
                                            )}>
                                                {item.revenue > 0 ? ((item.netProfit / item.revenue) * 100).toFixed(1) : 0}% {t('common.yield')}
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
