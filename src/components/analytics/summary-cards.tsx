"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard, TrendingUp, Percent } from "lucide-react"

type FinancialStats = {
  revenue: number
  cost: {
    total: number
    driver: number
    fuel: number
    maintenance: number
  }
  netProfit: number
  profitMargin: number
}

export function FinancialSummaryCards({ data }: { data: FinancialStats }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Revenue */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">รายรับรวม (Revenue)</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatCurrency(data.revenue)}</div>
          <p className="text-xs text-slate-500 mt-1">จากงานที่ส่งสำเร็จ</p>
        </CardContent>
      </Card>

      {/* Total Cost */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">ต้นทุนรวม (Cost)</CardTitle>
          <CreditCard className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatCurrency(data.cost.total)}</div>
          <p className="text-xs text-slate-500 mt-1">คนขับ + น้ำมัน + ซ่อมบำรุง</p>
        </CardContent>
      </Card>

      {/* Net Profit */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">กำไรสุทธิ (Net Profit)</CardTitle>
          <TrendingUp className={`h-4 w-4 ${data.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(data.netProfit)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Revenue - Cost</p>
        </CardContent>
      </Card>

      {/* Profit Margin */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">อัตรากำไร (Margin)</CardTitle>
          <Percent className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{data.profitMargin.toFixed(2)}%</div>
          <p className="text-xs text-slate-500 mt-1">% ของรายรับ</p>
        </CardContent>
      </Card>
    </div>
  )
}
