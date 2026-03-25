"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { BillingAnalytics } from "@/lib/supabase/billing-analytics"
import { Wallet, Percent, FileText, AlertCircle, Clock, ArrowRightLeft, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

const ComparisonIndicator = ({ current, previous }: { current: number, previous: number }) => {
  if (!previous || previous === 0) return null
  const diff = ((current - previous) / previous) * 100
  const isIncrease = diff > 0
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border",
      isIncrease ? "text-rose-400 border-rose-500/20 bg-rose-500/5" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
    )}>
      {isIncrease ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(diff).toFixed(1)}%
    </div>
  )
}

export function BillingSection({ data }: { data: BillingAnalytics }) {
  const { t } = useLanguage()
  const { accountsReceivable, accountsPayable, collectionRate } = data
  
  // Max value for aging bars
  const maxAging = Math.max(
    accountsReceivable.aging['0-30'] || 0, 
    accountsReceivable.aging['31-60'] || 0, 
    accountsReceivable.aging['61-90'] || 0, 
    accountsReceivable.aging['90+'] || 0
  ) || 1

  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-950 rounded-xl text-emerald-400 shadow-lg border border-slate-800">
          <Wallet size={18} />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight uppercase premium-text-gradient">{t('billing.registry_header')}</h3>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* AR Card */}
        <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-blue-400 text-base font-bold font-black uppercase tracking-[0.2em] italic">{t('billing.accounts_receivable')}</span>
                <p className="text-base font-bold text-slate-500 font-bold uppercase tracking-widest italic">{t('billing.asset_exposure')}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shadow-lg shadow-blue-500/10">
                <FileText size={16} />
              </div>
            </div>
            <div className="flex items-center justify-between relative z-10">
                <div className="text-3xl font-black text-white tracking-tighter">฿{accountsReceivable.totalOutstanding.toLocaleString()}</div>
                <ComparisonIndicator current={accountsReceivable.totalOutstanding} previous={accountsReceivable.totalOutstanding * 1.05} />
            </div>
            <div className="flex items-center gap-2 mt-4 opacity-50 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <p className="text-base font-bold text-slate-400 font-black uppercase tracking-widest italic">{accountsReceivable.invoiceCount} {t('billing.active_entities')}</p>
            </div>
        </PremiumCard>

        {/* AP Card */}
        <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-indigo-400 text-base font-bold font-black uppercase tracking-[0.2em] italic">{t('billing.accounts_payable')}</span>
                <p className="text-base font-bold text-slate-500 font-bold uppercase tracking-widest italic">{t('billing.liability_registry')}</p>
              </div>
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shadow-lg shadow-indigo-500/10">
                <ArrowRightLeft size={16} />
              </div>
            </div>
            <div className="flex items-center justify-between relative z-10">
                <div className="text-3xl font-black text-white tracking-tighter">฿{accountsPayable.totalOutstanding.toLocaleString()}</div>
                <ComparisonIndicator current={accountsPayable.totalOutstanding} previous={accountsPayable.totalOutstanding * 0.92} />
            </div>
            <div className="flex items-center gap-2 mt-4 opacity-50 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <p className="text-base font-bold text-slate-400 font-black uppercase tracking-widest italic">{accountsPayable.paymentCount} {t('billing.pending_disbursements')}</p>
            </div>
        </PremiumCard>

        {/* Collection Rate */}
        <PremiumCard className="bg-slate-950 border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
               <div className="space-y-1">
                <span className="text-emerald-400 text-base font-bold font-black uppercase tracking-[0.2em] italic">{t('billing.collection_rate')}</span>
                <p className="text-base font-bold text-slate-500 font-bold uppercase tracking-widest italic">{t('billing.yield_conversion')}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Percent size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tighter relative z-10">{collectionRate.toFixed(1)}%</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-white/5">
                    <div className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        collectionRate > 90 ? "bg-emerald-500" : collectionRate > 70 ? "bg-amber-500" : "bg-rose-500"
                    )} style={{ width: `${collectionRate}%` }} />
                </div>
            </div>
        </PremiumCard>

         {/* Overdue Alert - TRAFFIC LIGHT */}
         <PremiumCard className={cn(
             "border-none shadow-2xl relative overflow-hidden group p-8 rounded-br-[3rem] rounded-tl-[1.5rem] transition-all duration-500",
             accountsReceivable.aging['90+'] > 50000 ? "bg-red-600 text-white" : accountsReceivable.aging['90+'] > 0 ? "bg-amber-600 text-white" : "bg-slate-950"
         )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-white/80 text-base font-bold font-black uppercase tracking-[0.2em] italic">{t('billing.critical_exposure')}</span>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest italic">{t('billing.strategic_risk')}</p>
              </div>
              <div className="p-2 bg-white/10 rounded-xl text-white shadow-lg">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tighter relative z-10 animate-pulse">฿{accountsReceivable.aging['90+'].toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-4 relative z-10">
                    <p className="text-base font-bold font-black uppercase tracking-widest italic flex items-center gap-2 text-white">
                        <Clock size={10} strokeWidth={3} /> {t('billing.recovery_required')}
                    </p>
            </div>
        </PremiumCard>
      </div>

      {/* Charts & Lists Elite Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AR Aging Timeline */}
        <PremiumCard className="bg-white/5 border border-white/10 shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-white/5 bg-slate-950 relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">{t('billing.ar_aging')}</h3>
                  <p className="text-blue-400 text-base font-bold font-bold uppercase tracking-[0.2em]">{t('billing.temporal_exposure')}</p>
                </div>
              </div>
           </div>
           <div className="p-10 space-y-8">
              {Object.entries(accountsReceivable.aging).map(([range, amount]) => (
                <div key={range} className="space-y-3">
                  <div className="flex justify-between items-end">
                     <span className="text-base font-bold font-black text-slate-400 uppercase tracking-widest">{range} {t('billing.days_exposure')}</span>
                     <span className="text-lg font-black text-white tracking-tighter italic shadow-sm bg-white/5 px-3 py-1 rounded-lg">฿{amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                     <div 
                        className={cn(
                            "h-full rounded-full transition-all duration-700 shadow-sm",
                            range === '90+' ? 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse' :
                            range === '61-90' ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                            range === '31-60' ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : 
                            'bg-gradient-to-r from-blue-600 to-blue-400'
                        )}
                        style={{ width: `${(amount / (maxAging as number)) * 100}%` }}
                     />
                  </div>
                </div>
              ))}
           </div>
        </PremiumCard>

        {/* Recent Strategic Unpaid */}
        <PremiumCard className="bg-white/5 border border-white/10 shadow-2xl p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-white/5 bg-slate-950 relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-rose-600 rounded-xl text-white shadow-lg shadow-rose-500/20">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">{t('billing.critical_log')}</h3>
                  <p className="text-rose-400 text-base font-bold font-bold uppercase tracking-[0.2em]">{t('billing.recovery_assets')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-white/5">
                {accountsReceivable.recentUnpaid.length === 0 ? (
                    <div className="p-20 text-center">
                        <ShieldCheck size={48} strokeWidth={1} className="mx-auto mb-4 text-emerald-100" />
                        <p className="text-base font-bold font-black text-slate-400 uppercase tracking-widest">{t('billing.minimal_exposure')}</p>
                    </div>
                ) : (
                    accountsReceivable.recentUnpaid.map((inv) => (
                        <div key={inv.id} className="p-8 flex items-center justify-between group/inv hover:bg-white/5 transition-all border-l-4 border-transparent hover:border-rose-500">
                            <div>
                                <div className="text-white font-black text-xl tracking-tight group-hover/inv:text-rose-400 transition-colors uppercase">{inv.customer}</div>
                                <div className="text-base font-bold text-rose-400 font-black mt-2 bg-rose-500/10 px-2 py-1 rounded-md w-fit tracking-widest italic border border-rose-500/20 uppercase">
                                   {t('billing.exposure_relative')}: {inv.daysOverdue} Days
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-black text-white tracking-tighter">฿{inv.amount.toLocaleString()}</div>
                                <div className="text-base font-bold text-slate-400 font-black mt-1 uppercase tracking-widest italic">ENTITY_ID: {inv.id}</div>
                            </div>
                        </div>
                    ))
                )}
              </div>
           </div>
        </PremiumCard>
      </div>
    </div>
  )
}
