"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BillingAnalytics } from "@/lib/supabase/billing-analytics"
import { DollarSign, Wallet, Percent, FileText, AlertCircle, Clock } from "lucide-react"

export function BillingSection({ data }: { data: BillingAnalytics }) {
  const { accountsReceivable, accountsPayable, collectionRate, revenueVsPayout } = data
  
  // Max value for aging bars
  const maxAging = Math.max(
    accountsReceivable.aging['0-30'], 
    accountsReceivable.aging['31-60'], 
    accountsReceivable.aging['61-90'], 
    accountsReceivable.aging['90+']
  ) || 1

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 text-indigo-400">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <Wallet size={20} />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Billing & Accounts</h2>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AR Card */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">ลูกหนี้คงค้าง (AR)</span>
              <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
                <FileText size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">฿{accountsReceivable.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">{accountsReceivable.invoiceCount} รายการค้างชำระ</p>
          </CardContent>
        </Card>

        {/* AP Card */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">เจ้าหนี้คงค้าง (AP)</span>
              <div className="p-2 bg-purple-500/10 rounded-full text-purple-400">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">฿{accountsPayable.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">{accountsPayable.paymentCount} รายการรอจ่าย</p>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">อัตราการเก็บเงิน</span>
              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                <Percent size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{collectionRate.toFixed(1)}%</div>
            <p className="text-xs text-slate-500 mt-1">เทียบกับยอดบิลทั้งหมด</p>
          </CardContent>
        </Card>

         {/* Overdue Alert */}
         <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">เกินกำหนด (90+ วัน)</span>
              <div className="p-2 bg-red-500/10 rounded-full text-red-400">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-400">฿{accountsReceivable.aging['90+'].toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">ต้องติดตามเร่งด่วน</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
           <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <Clock size={16} className="text-slate-400" />
               AR Aging Timeline
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-6 space-y-5">
              {Object.entries(accountsReceivable.aging).map(([range, amount]) => (
                <div key={range} className="space-y-2">
                  <div className="flex justify-between text-sm">
                     <span className="text-slate-400">{range} วัน</span>
                     <span className="text-white font-medium">฿{amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                     <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            range === '90+' ? 'bg-red-500' :
                            range === '61-90' ? 'bg-orange-500' :
                            range === '31-60' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(amount / maxAging) * 100}%` }}
                     />
                  </div>
                </div>
              ))}
           </CardContent>
        </Card>

        {/* Recent Unpaid */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader className="border-b border-white/5 pb-4">
             <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
               <AlertCircle size={16} className="text-slate-400" />
               Top Overdue Invoices
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
              <div className="divide-y divide-white/5">
                {accountsReceivable.recentUnpaid.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">ไม่มีรายการค้างชำระ</div>
                ) : (
                    accountsReceivable.recentUnpaid.map((inv) => (
                        <div key={inv.id} className="py-4 flex items-center justify-between group">
                            <div>
                                <div className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors">{inv.customer}</div>
                                <div className="text-xs text-red-400 mt-1">เกินกำหนด {inv.daysOverdue} วัน</div>
                            </div>
                            <div className="text-right">
                                <div className="text-emerald-400 font-bold text-sm">฿{inv.amount.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{inv.id}</div>
                            </div>
                        </div>
                    ))
                )}
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
