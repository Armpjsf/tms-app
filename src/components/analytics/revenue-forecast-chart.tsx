"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { useLanguage } from "@/components/providers/language-provider"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts'
import { BrainCircuit, TrendingUp, Zap } from "lucide-react"

type ForecastData = {
    month: string
    actual?: number
    forecast?: number
}

type Props = {
    data: ForecastData[]
}

export function RevenueForecastChart({ data = [] }: Props) {
    const { t } = useLanguage()

    if (data.length === 0) return null

    return (
        <PremiumCard className="bg-background border-2 border-border/5 shadow-3xl p-0 overflow-hidden rounded-br-[6rem] rounded-tl-[3rem] group/forecast">
            <div className="p-10 border-b border-border/5 bg-black/40 relative overflow-hidden flex items-center justify-between">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-transparent" />
                <div className="flex items-center gap-5 relative z-10">
                    <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                        <BrainCircuit size={22} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-foreground tracking-tighter italic uppercase">{t('analytics.revenue_prediction') || 'Revenue Forecasting'}</h3>
                        <p className="text-purple-400 text-base font-bold font-black uppercase tracking-[0.4em]">{t('analytics.ai_inference') || 'Strategic AI Inference'}</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 bg-purple-500/10 px-6 py-3 rounded-2xl border border-purple-500/20">
                    <Zap size={14} className="text-purple-400 animate-pulse" />
                    <span className="text-base font-bold font-black text-purple-300 uppercase tracking-[0.2em]">{t('analytics.predictive_active') || 'Predictive Core v2'}</span>
                </div>
            </div>
            
            <div className="p-12 h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis 
                            dataKey="month" 
                            stroke="#475569" 
                            fontSize={11} 
                            fontWeight="900" 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(val) => {
                                const [y, m] = val.split('-')
                                const date = new Date(parseInt(y), parseInt(m)-1)
                                return date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
                            }}
                        />
                        <YAxis 
                            stroke="#475569" 
                            fontSize={11} 
                            fontWeight="900" 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(val) => `฿${(val/1000).toFixed(0)}K`}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                                border: '2px solid rgba(255,255,255,0.1)', 
                                borderRadius: '24px', 
                                backdropFilter: 'blur(12px)',
                                padding: '20px'
                            }}
                            itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                            formatter={(value: number) => [`฿${value.toLocaleString()}`, '']}
                        />
                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                        <Area 
                            type="monotone" 
                            dataKey="actual" 
                            name={t('analytics.actual_revenue') || 'Actual'} 
                            stroke="#10b981" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorActual)" 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="forecast" 
                            name={t('analytics.forecast_revenue') || 'Forecast'} 
                            stroke="#8b5cf6" 
                            strokeWidth={4}
                            strokeDasharray="10 10"
                            fillOpacity={1} 
                            fill="url(#colorForecast)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="p-10 bg-muted/30 border-t border-border/5">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                            <TrendingUp className="text-emerald-500" size={24} />
                        </div>
                        <div>
                            <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest leading-none mb-2">{t('analytics.projection_confidence') || 'Confidence Level'}</p>
                            <p className="text-2xl font-black text-foreground italic">🔥 HIGH (88%)</p>
                        </div>
                    </div>
                    <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest max-w-md italic text-center md:text-right">
                        {t('analytics.forecast_disclaimer') || 'AI models utilize historical seasonality and recent trends to project quarterly performance.'}
                    </p>
                </div>
            </div>
        </PremiumCard>
    )
}
