"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, FileWarning, TrendingUp, Award } from "lucide-react"

type LeaderboardEntry = {
    name: string
    revenue: number
    completedJobs: number
    successRate: number
}

type ComplianceStats = {
    valid: number
    expiring: number
    expired: number
    missing: number
}

type EfficiencySummary = {
    avgSuccess: number
    avgOnTime: number
    totalDrivers: number
}

interface DriverPerformanceSummaryProps {
    leaderboard: LeaderboardEntry[]
    compliance: ComplianceStats
    efficiency: EfficiencySummary
}

export function DriverPerformanceSummary({ leaderboard, compliance, efficiency }: DriverPerformanceSummaryProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
            {/* 1. Yield Hero: Top Performers */}
            <Card className="lg:col-span-12 bg-gradient-to-br from-blue-900/20 to-slate-900 border-blue-500/20 shadow-2xl overflow-hidden relative group">
                <CardHeader className="pb-2">
                    <CardTitle className="text-white flex items-center gap-3">
                        <Award className="text-amber-400" size={20} />
                        Fleet Performance & Yield Leaders
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="md:col-span-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {leaderboard.slice(0, 3).map((driver, i) => (
                                    <div key={driver.name} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 relative">
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-black text-black">#{i+1}</div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 truncate">{driver.name}</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-white">฿{driver.revenue.toLocaleString()}</span>
                                            <span className="text-[10px] text-emerald-400 font-bold">Yield</span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                                            <span>{driver.completedJobs} Jobs</span>
                                            <span className="text-emerald-500">{driver.successRate.toFixed(1)}% SR</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl flex flex-col items-center justify-center border border-white/5">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Avg. On-Time Rate</p>
                            <p className="text-5xl font-black text-white">{efficiency.avgOnTime}%</p>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-4">
                                <div className="bg-blue-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${efficiency.avgOnTime}%` }} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Compliance & Documents */}
            <Card className="lg:col-span-5 bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl self-start">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-400" /> License & Compliance Audit
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                            <p className="text-sm font-bold text-emerald-400">{compliance.valid}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Valid & Active</p>
                        </div>
                        <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
                            <p className="text-sm font-bold text-amber-400">{compliance.expiring}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Expiring &lt; 30d</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                        <div className="flex items-center gap-2">
                            <FileWarning size={14} className="text-red-400" />
                            <span className="text-xs font-bold text-red-400 uppercase">Attention Required</span>
                        </div>
                        <span className="text-sm font-black text-red-500">{compliance.expired + compliance.missing}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 text-center italic">Compliance Score: {Math.round((compliance.valid / (efficiency.totalDrivers || 1)) * 100)}%</p>
                </CardContent>
            </Card>

            {/* 3. Reliability Metrics */}
            <Card className="lg:col-span-7 bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-xl h-full">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-400" /> Service Reliability Index
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-full justify-center pb-8">
                    <div className="flex items-center justify-around mb-8">
                        <div className="text-center">
                            <div className="text-4xl font-black text-white mb-1">{efficiency.avgSuccess}%</div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Job Success</p>
                        </div>
                        <div className="w-px h-12 bg-slate-800" />
                        <div className="text-center">
                            <div className="text-4xl font-black text-indigo-400 mb-1">{efficiency.totalDrivers}</div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Managed Fleet</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                         <div className="flex justify-between text-[10px] uppercase font-black tracking-widest">
                             <span className="text-slate-500">Fleet Uptime Goal</span>
                             <span className="text-indigo-400">92%</span>
                         </div>
                         <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                             <div className="bg-indigo-500 h-full rounded-full" style={{ width: '85%' }} />
                         </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
