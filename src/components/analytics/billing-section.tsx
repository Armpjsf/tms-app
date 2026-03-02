"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BillingAnalytics } from "@/lib/supabase/billing-analytics"
import { DollarSign, Wallet, Percent, FileText, AlertCircle, Clock } from "lucide-react"

export function BillingSection({ data }: { data: BillingAnalytics }) {
  const { accountsReceivable, accountsPayable, collectionRate } = data
  
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
      <div className="flex items-center gap-3 text-emerald-600">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <Wallet size={20} />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Billing & Accounts</h2>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AR Card */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <span className="text-gray-500 text-sm font-medium">ลูกหนี้คงค้าง (AR)</span>
                <p className="text-[10px] text-muted-foreground font-medium">คำนวณจากใบวางบิลที่ยังไม่ชำระ (Billing Notes)</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-full text-emerald-500">
                <FileText size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">฿{accountsReceivable.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-gray-700 font-bold mt-1">{accountsReceivable.invoiceCount} รายการค้างชำระ</p>
          </CardContent>
        </Card>

        {/* AP Card */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <span className="text-gray-500 text-sm font-medium">เจ้าหนี้คงค้าง (AP)</span>
                <p className="text-[10px] text-muted-foreground font-medium">คำนวณจากยอดรอจ่ายคนขับ (Driver Payments)</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-full text-purple-400">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">฿{accountsPayable.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-gray-700 font-bold mt-1">{accountsPayable.paymentCount} รายการรอจ่าย</p>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">อัตราการเก็บเงิน</span>
              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                <Percent size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{collectionRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-700 font-bold mt-1">เทียบกับยอดบิลทั้งหมด</p>
          </CardContent>
        </Card>

         {/* Overdue Alert */}
         <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">เกินกำหนด (90+ วัน)</span>
              <div className="p-2 bg-red-500/10 rounded-full text-red-400">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-red-700">฿{accountsReceivable.aging['90+'].toLocaleString()}</div>
            <p className="text-xs text-gray-700 font-bold mt-1">ต้องติดตามเร่งด่วน</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
           <CardHeader className="border-b border-gray-200 pb-4">
             <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-2">
               <Clock size={16} className="text-gray-500" />
               AR Aging Timeline
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-6 space-y-5">
              {Object.entries(accountsReceivable.aging).map(([range, amount]) => (
                <div key={range} className="space-y-2">
                  <div className="flex justify-between text-sm">
                     <span className="text-gray-500">{range} วัน</span>
                     <span className="text-gray-800 font-medium">฿{amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
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
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
            <CardHeader className="border-b border-gray-200 pb-4">
             <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-2">
               <AlertCircle size={16} className="text-gray-500" />
               Top Overdue Invoices
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
              <div className="divide-y divide-white/5">
                {accountsReceivable.recentUnpaid.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">ไม่มีรายการค้างชำระ</div>
                ) : (
                    accountsReceivable.recentUnpaid.map((inv) => (
                        <div key={inv.id} className="py-4 flex items-center justify-between group">
                            <div>
                                <div className="text-gray-800 font-medium text-sm group-hover:text-emerald-500 transition-colors">{inv.customer}</div>
                                <div className="text-xs text-red-700 font-bold mt-1">เกินกำหนด {inv.daysOverdue} วัน</div>
                            </div>
                            <div className="text-right">
                                <div className="text-emerald-700 font-black text-sm">฿{inv.amount.toLocaleString()}</div>
                                <div className="text-[10px] text-gray-700 font-bold mt-0.5">{inv.id}</div>
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
