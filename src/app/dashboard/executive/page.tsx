"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { 
    TrendingUp, 
    Zap, 
    Truck, 
    PieChart as PieIcon, 
    Calendar,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    BarChart3
} from "lucide-react"
import { 
    getExecutiveDashboardUnified,
    getFuelAnomalyAlerts
} from "@/lib/supabase/financial-analytics"
import { getSetting, saveSetting } from "@/lib/supabase/settings"
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    AreaChart, 
    Area,
    Cell,
    PieChart,
    Pie
} from 'recharts'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useBranch } from "@/components/providers/branch-provider"
import { useRealtime } from "@/hooks/useRealtime"
import { RealtimeIndicator } from "@/components/ui/realtime-indicator"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { useLanguage } from "@/components/providers/language-provider"

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ExecutiveDashboard() {
    const { selectedBranch } = useBranch()
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [savingRemark, setSavingRemark] = useState(false)
    const [data, setData] = useState<any>(null)
    const [remark, setRemark] = useState("")
    const [currentMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    const loadData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        try {
            const [
                unifiedData,
                fuelAlerts,
                compliance,
                health,
                savedRemark
            ] = await Promise.all([
                getExecutiveDashboardUnified(selectedBranch),
                getFuelAnomalyAlerts(selectedBranch),
                Promise.resolve({ score: 94, status: 'Excellent', details: [{ label: 'Insurance', value: 100 }, { label: 'Registration', value: 88 }, { label: 'Maintenance', value: 92 }] }),
                Promise.resolve({ score: 88, status: 'Healthy', metrics: [{ label: 'Uptime', value: 98 }, { label: 'Utilization', value: 76 }, { label: 'Breakdowns', value: 2 }] }),
                getSetting(`exec_remark_${currentMonth}_${selectedBranch}`, "")
            ])

            setData({ ...unifiedData, fuelAlerts, compliance, health })
            setRemark(savedRemark)
        } catch (e) {
            toast.error("Failed to load executive data")
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    // Real-time: Jobs_Main
    useRealtime('Jobs_Main', (payload) => {
        loadData(false)
    })

    useEffect(() => {
        loadData()
    }, [selectedBranch])

    const handleSaveRemark = async () => {
        setSavingRemark(true)
        try {
            await saveSetting(`exec_remark_${currentMonth}_${selectedBranch}`, remark)
            toast.success("Executive insights updated")
        } catch {
            toast.error("Failed to save remark")
        } finally {
            setSavingRemark(false)
        }
    }

    if (loading && !data) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-primary animate-pulse font-black uppercase tracking-[0.3em] text-lg font-bold">
                        {t('common.loading')}
                    </p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-10 pb-20">
                {/* Header Command Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/50 backdrop-blur-xl p-8 rounded-[3rem] border border-border/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                            <Target className="text-primary" size={32} />
                            {t('dashboard.title')}
                        </h1>
                        <p className="text-primary/80 font-bold mt-1 uppercase tracking-widest text-base font-bold">{t('dashboard.subtitle')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 relative z-10">
                        <RealtimeIndicator isLive={true} className="bg-muted/50 border-border/10 text-foreground" />
                        <div className="flex items-center gap-3 bg-muted/50 p-2 px-4 rounded-2xl border border-border/10">
                            <Calendar className="text-primary" size={18} />
                            <span className="text-white font-black text-xl uppercase tracking-tighter">
                                {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Primary KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard 
                        title={t('dashboard.revenue')} 
                        value={data.financial.revenue} 
                        unit="THB" 
                        icon={<TrendingUp className="text-emerald-500" />}
                        growth={12.5}
                    />
                    <KpiCard 
                        title={t('dashboard.profit')} 
                        value={data.financial.netProfit} 
                        unit="THB" 
                        icon={<Zap className="text-blue-500" />}
                        growth={8.2}
                    />
                    <KpiCard 
                        title={t('dashboard.margin')} 
                        value={data.kpi.margin.current} 
                        growth={data.kpi.margin.growth} 
                        unit="%" 
                        icon={<PieIcon className="text-amber-500" />}
                        isPercentage
                    />
                    <KpiCard 
                        title={t('dashboard.jobs')} 
                        value={data.kpi.jobs.current} 
                        growth={data.kpi.jobs.growth} 
                        unit="TRIPS" 
                        icon={<Truck className="text-rose-500" />}
                    />
                </div>

                {/* Data Matrix Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Revenue Trend Chart */}
                    <PremiumCard className="lg:col-span-2 p-8" title={t('dashboard.revenue_trend')}>
                        <div className="h-[350px] mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.trend}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff1e85" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#ff1e85" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="month" 
                                        stroke="#64748b" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={(val) => val.split('-')[1]}
                                    />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `฿${val/1000}k`} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#050110', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#ff1e85" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </PremiumCard>

                    {/* Top Profitable Vehicles */}
                    <PremiumCard className="p-8" title={t('dashboard.top_vehicles')}>
                        <div className="mt-6 space-y-6">
                            {data.vehicles.map((v: any, i: number) => (
                                <div key={v.plate} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center font-black text-primary border border-border/5 group-hover:border-primary/30 transition-colors">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-black text-white uppercase tracking-tighter">{v.plate}</p>
                                            <p className="text-base font-bold text-muted-foreground font-bold uppercase tracking-widest">
                                                {t('dashboard.profit')}: <AnimatedNumber value={v.netProfit} prefix="฿" />
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-primary font-black tracking-tighter">
                                            <AnimatedNumber value={v.revenue} prefix="฿" />
                                        </p>
                                        <p className="text-base font-bold text-muted-foreground font-bold uppercase tracking-widest">{t('dashboard.revenue')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PremiumCard>
                </div>
            </div>
        </DashboardLayout>
    )
}

function KpiCard({ title, value, unit, icon, growth, isPercentage = false }: any) {
    const { t } = useLanguage();
    return (
        <PremiumCard className="p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {icon}
            </div>
            <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">{title}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-foreground tracking-tighter">
                    {isPercentage ? (
                        <AnimatedNumber value={value} decimals={1} suffix="%" />
                    ) : (
                        <AnimatedNumber value={value} prefix="฿" />
                    )}
                </h3>
                <span className="text-muted-foreground text-base font-bold font-black uppercase">{unit}</span>
            </div>
            {growth !== undefined && (
                <div className={cn(
                    "flex items-center mt-4 text-base font-bold font-black px-2 py-1 rounded-lg w-fit",
                    growth >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                )}>
                    {growth >= 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                    <span>{Math.abs(growth).toFixed(1)}%</span>
                    <span className="opacity-50 ml-1 uppercase tracking-tighter">{t('dashboard.vs_last_month')}</span>
                </div>
            )}
        </PremiumCard>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}

