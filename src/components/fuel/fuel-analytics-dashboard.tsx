"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Gauge,
  DollarSign,
  Droplets,
} from "lucide-react"
import type { FuelAnalytics } from "@/lib/supabase/fuel-analytics"

export function FuelAnalyticsDashboard({ analytics }: { analytics: FuelAnalytics }) {
  const maxCost = Math.max(...analytics.vehicleBreakdown.map(v => v.totalCost), 1)
  const maxMonthCost = Math.max(...analytics.monthlyTrends.map(m => m.totalCost), 1)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={16} className="text-emerald-500" />
              <span className="text-xs text-muted-foreground">ลิตรรวม</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{analytics.totalLiters.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{analytics.totalLogs} ครั้ง</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-emerald-400" />
              <span className="text-xs text-muted-foreground">ค่าใช้จ่ายรวม</span>
            </div>
            <p className="text-2xl font-bold text-foreground">฿{analytics.totalCost.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Fuel size={16} className="text-amber-400" />
              <span className="text-xs text-muted-foreground">ราคาเฉลี่ย/ลิตร</span>
            </div>
            <p className="text-2xl font-bold text-foreground">฿{analytics.avgCostPerLiter.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={16} className="text-cyan-400" />
              <span className="text-xs text-muted-foreground">เฉลี่ย กม./ลิตร</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{analytics.avgKmPerLiter || '—'}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {analytics.avgKmPerLiter >= 8 ? '✅ ดี' : analytics.avgKmPerLiter >= 5 ? '⚠️ ปานกลาง' : analytics.avgKmPerLiter > 0 ? '🔴 ต่ำ' : ''}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-xs text-muted-foreground">ผิดปกติ</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{analytics.anomalies.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">รายการ</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <BarChart3 size={16} className="text-primary" />
              แนวโน้มรายเดือน
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyTrends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-3">
                {analytics.monthlyTrends.map((month, i) => {
                  const prev = analytics.monthlyTrends[i - 1]
                  const change = prev ? ((month.totalCost - prev.totalCost) / prev.totalCost * 100) : 0
                  return (
                    <div key={month.month} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-mono">{month.month}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{month.totalLiters.toLocaleString()} L</span>
                          <span className="font-medium text-foreground">฿{month.totalCost.toLocaleString()}</span>
                          {prev && (
                            <span className={`text-xs flex items-center gap-0.5 ${change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {Math.abs(change).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                          style={{ width: `${(month.totalCost / maxMonthCost) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Cost Ranking */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <Fuel size={16} className="text-amber-400" />
              ค่าใช้จ่ายรายรถ (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.vehicleBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-2.5">
                {analytics.vehicleBreakdown.slice(0, 10).map((v, i) => (
                  <div key={v.vehicle_plate} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                          {i + 1}
                        </span>
                        <span className="font-medium text-foreground">{v.vehicle_plate}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">{v.totalLiters} L</span>
                        {v.avgEfficiency > 0 && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            v.avgEfficiency >= 8 ? 'bg-emerald-500/20 text-emerald-400' :
                            v.avgEfficiency >= 5 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {v.avgEfficiency} km/L
                          </span>
                        )}
                        <span className="font-medium text-foreground">฿{v.totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                        style={{ width: `${(v.totalCost / maxCost) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      {analytics.anomalies.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <AlertTriangle size={16} />
              พบรายการผิดปกติ ({analytics.anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.anomalies.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-red-500/10">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground font-medium">{a.vehicle_plate}</p>
                      <p className="text-xs text-muted-foreground">{a.issue}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">฿{a.cost.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
