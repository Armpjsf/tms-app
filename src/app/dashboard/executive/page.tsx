
"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { 
    getFinancialStats, 
    getRevenueTrend, 
    getExecutiveKPIs,
    getVehicleProfitability,
    getJobStatusDistribution,
    getFuelAnomalyAlerts
} from "@/lib/supabase/financial-analytics"
import { getFleetComplianceMetrics, getFleetHealthScore } from "@/lib/supabase/fleet-analytics"
import { getSetting, saveSetting } from "@/lib/supabase/system_settings"
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts"
import { 
    TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, 
    AlertTriangle, CheckCircle2, Truck, FileText, Loader2, Save,
    ArrowUpRight, Target, Activity, Calendar
} from "lucide-react"
import { PremiumCard, PremiumCardHeader, PremiumCardTitle } from "@/components/ui/premium-card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useBranch } from "@/components/providers/branch-provider"
import { useRealtime } from "@/hooks/useRealtime"
import { RealtimeIndicator } from "@/components/ui/realtime-indicator"
import { AnimatedNumber } from "@/components/ui/animated-number"

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ExecutiveDashboard() {
    const { selectedBranch } = useBranch()
    const [loading, setLoading] = useState(true)
    const [savingRemark, setSavingRemark] = useState(false)
    const [data, setData] = useState<any>(null)
    const [remark, setRemark] = useState("")
    const [currentMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    const loadData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        try {
            const [
                financial, 
                trend, 
                kpi, 
                vehicles, 
                compliance, 
                health, 
                statusDist,
                fuelAlerts,
                savedRemark
            ] = await Promise.all([
                getFinancialStats(undefined, undefined, selectedBranch),
                getRevenueTrend(undefined, undefined, selectedBranch),
                getExecutiveKPIs(undefined, undefined, selectedBranch),
                getVehicleProfitability(undefined, undefined, selectedBranch),
                getFleetComplianceMetrics(selectedBranch),
                getFleetHealthScore(selectedBranch),
                getJobStatusDistribution(undefined, undefined, selectedBranch),
                getFuelAnomalyAlerts(selectedBranch),
                getSetting(`exec_remark_${currentMonth}_${selectedBranch}`, "")
            ])

            setData({ financial, trend, kpi, vehicles, compliance, health, statusDist, fuelAlerts })
            setRemark(savedRemark)
        } catch (e) {
            toast.error("Failed to load executive data")
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    // เปิดระบบ Real-time: คอยฟังการเปลี่ยนแปลงใน Jobs_Main
    useRealtime('Jobs_Main', (payload) => {
        console.log("Real-time update received in Executive Dashboard:", payload)
        loadData(false) // รีเฟรชข้อมูลโดยไม่ต้องขึ้น Loading บดบังหน้าจอ
    })

    useEffect(() => {
        loadData()
    }, [selectedBranch])


    const handleSaveRemark = async () => {
        setSavingRemark(true)
        const res = await saveSetting(`exec_remark_${currentMonth}_${selectedBranch}`, remark, `Executive remark for ${currentMonth}`)
        if (res.success) toast.success("บันทึกหมายเหตุผู้บริหารเรียบร้อย")
        else toast.error("บันทึกไม่สำเร็จ")
        setSavingRemark(false)
    }

    if (loading) return (
        <DashboardLayout>
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header with Title & Period */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                            <Target className="text-emerald-500" size={32} />
                            Executive Strategy Command
                        </h1>
                        <p className="text-emerald-400 font-black mt-1 uppercase tracking-widest text-[10px]">Financial Intelligence & Operational Performance Control</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 relative z-10">
                        <RealtimeIndicator isLive={true} className="bg-white/10 border-white/20 text-white" />
                        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                            <Calendar className="text-emerald-500" size={18} />
                            <span className="text-white font-bold text-sm uppercase tracking-tighter">
                                {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* KPI Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KpiCard 
                        title="Monthly Revenue" 
                        value={data.kpi.revenue.current} 
                        growth={data.kpi.revenue.growth} 
                        unit="THB" 
                        icon={<DollarSign className="text-emerald-500" />}
                    />
                    <KpiCard 
                        title="Net Profit" 
                        value={data.kpi.profit.current} 
                        growth={data.kpi.profit.growth} 
                        unit="THB" 
                        icon={<Activity className="text-blue-500" />}
                    />
                    <KpiCard 
                        title="Profit Margin" 
                        value={data.kpi.margin.current} 
                        growth={data.kpi.margin.growth} 
                        unit="%" 
                        icon={<PieIcon className="text-amber-500" />}
                        isPercentage
                    />
                    <KpiCard 
                        title="Fleet Health" 
                        value={data.health} 
                        unit="%" 
                        icon={<Truck className="text-rose-500" />}
                        isPercentage
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main P&L Chart */}
                    <PremiumCard className="lg:col-span-2 p-6 bg-white shadow-xl border-none">
                        <PremiumCardHeader className="p-0 mb-6">
                            <PremiumCardTitle icon={<TrendingUp className="text-emerald-600" />}>
                                REVENUE VS COST TREND (30D)
                            </PremiumCardTitle>
                        </PremiumCardHeader>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.trend}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </PremiumCard>

                    {/* Job Status Distribution */}
                    <PremiumCard className="p-6 bg-white shadow-xl border-none">
                        <PremiumCardHeader className="p-0 mb-6">
                            <PremiumCardTitle icon={<PieIcon className="text-blue-600" />}>
                                OPS DISTRIBUTION
                            </PremiumCardTitle>
                        </PremiumCardHeader>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.statusDist}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.statusDist.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {data.statusDist.slice(0, 4).map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{d.name} ({d.value})</span>
                                </div>
                            ))}
                        </div>
                    </PremiumCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Profitable Vehicles */}
                    <PremiumCard className="p-6 bg-white shadow-xl border-none overflow-hidden">
                        <PremiumCardHeader className="p-0 mb-4">
                            <PremiumCardTitle icon={<Truck className="text-emerald-600" />}>
                                TOP 5 PROFITABLE VEHICLES
                            </PremiumCardTitle>
                        </PremiumCardHeader>
                        <div className="space-y-3">
                            {data.vehicles.slice(0, 5).map((v: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-emerald-50 hover:border-emerald-100 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-xs text-slate-900">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-950 uppercase tracking-tighter">{v.plate}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                Net Profit: <AnimatedNumber value={v.netProfit} prefix="฿" />
                                            </p>
                                        </div>
                                        </div>
                                        <div className="text-right">
                                        <p className="text-emerald-600 font-black tracking-tighter">
                                            <AnimatedNumber value={v.revenue} prefix="฿" />
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold">REVENUE</p>
                                        </div>
                                        </div>
                                        ))}
                                        </div>
                                        </PremiumCard>


                    {/* Fleet Compliance & Risks */}
                    <PremiumCard className="p-6 bg-white shadow-xl border-none">
                        <PremiumCardHeader className="p-0 mb-4">
                            <PremiumCardTitle icon={<AlertTriangle className="text-rose-600" />}>
                                FLEET COMPLIANCE RISKS
                            </PremiumCardTitle>
                        </PremiumCardHeader>
                        <div className="space-y-4">
                            {data.compliance.map((c: any, i: number) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700">{c.name}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                            c.status === 'valid' ? 'bg-emerald-100 text-emerald-700' : 
                                            c.status === 'expiring' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {c.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${c.status === 'valid' ? 'bg-emerald-500' : c.status === 'expiring' ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                            style={{ width: `${Math.max(5, 100 - (c.alert * 10))}%` }} 
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                                        <span>Latest Exp: {c.date}</span>
                                        <span>{c.alert} Vehicles Alert</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PremiumCard>
                </div>

                {/* Fuel Guard & Fraud Detection Section */}
                {data.fuelAlerts && data.fuelAlerts.length > 0 && (
                <PremiumCard className="p-8 bg-rose-50 border-2 border-rose-200 shadow-xl rounded-3xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-600 rounded-xl shadow-lg shadow-rose-500/20">
                            <AlertTriangle className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-rose-950 tracking-tight">Fuel Guard - Fraud Detection Alerts</h2>
                            <p className="text-rose-600 text-xs font-bold uppercase tracking-widest">ตรวจพบความผิดปกติในการเติมน้ำมันหรืออัตราสิ้นเปลือง</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.fuelAlerts.map((alert: any, i: number) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 font-black text-xs">
                                        {alert.type}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-950 tracking-tighter">{alert.plate}</p>
                                        <p className="text-[11px] text-rose-600 font-bold">{alert.message}</p>
                                        <p className="text-[9px] text-slate-400 mt-1 uppercase">{new Date(alert.date).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-rose-700 font-black tracking-tighter">+{alert.excess.toFixed(1)}L</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Overfilled</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </PremiumCard>
                )}

                {/* Management Remarks Section */}
                <PremiumCard className="p-8 bg-slate-950 shadow-2xl border-none rounded-[3rem]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                                <FileText className="text-white" size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Executive Management Remarks</h2>
                        </div>
                        <Button 
                            onClick={handleSaveRemark} 
                            disabled={savingRemark}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-6 rounded-2xl shadow-xl shadow-emerald-500/20"
                        >
                            {savingRemark ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            บันทึกการสั่งการ
                        </Button>
                    </div>
                    <Textarea 
                        placeholder="กรุณาพิมพ์หมายเหตุหรือการสั่งการบริหารจัดการประจำเดือนนี้..."
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="bg-white/5 border-white/10 text-white min-h-[150px] rounded-2xl placeholder:text-slate-600 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-4 italic font-bold uppercase tracking-widest">
                        * ข้อมูลส่วนนี้จะถูกบันทึกแยกเป็นรายเดือนและรายสาขา เพื่อใช้เป็นบันทึกประวัติการบริหารจัดการ
                    </p>
                </PremiumCard>
            </div>
        </DashboardLayout>
    )
}

function KpiCard({ title, value, growth, unit, icon, isPercentage = false }: any) {
    const isNegative = growth < 0
    return (
        <PremiumCard className="p-6 bg-white shadow-xl border-none hover:translate-y-[-4px] transition-all cursor-default relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                {icon}
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                    {isPercentage ? (
                        <AnimatedNumber value={value} decimals={1} suffix="%" />
                    ) : (
                        <AnimatedNumber value={value} prefix="฿" />
                    )}
                </h3>
                <span className="text-slate-500 text-xs font-bold">{unit}</span>
            </div>
            {growth !== undefined && (
                <div className={`flex items-center gap-1 mt-3 px-2 py-1 rounded-lg w-fit ${isNegative ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {isNegative ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span className="text-[10px] font-black">{Math.abs(growth).toFixed(1)}%</span>
                    <span className="text-[9px] font-bold text-slate-400 ml-1">vs Last Month</span>
                </div>
            )}
        </PremiumCard>
    )
}
