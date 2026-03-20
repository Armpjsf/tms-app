import { PremiumCard } from "@/components/ui/premium-card"
import { Building2, MapPin, TrendingUp, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

type CustomerStat = {
  name: string
  revenue: number
  jobCount: number
}

type RouteStat = {
  route: string
  revenue: number
  cost: number
  count: number
  margin: number // Percentage
}

export function CustomerRouteSection({ 
  customers, 
  routes 
}: { 
  customers: CustomerStat[]
  routes: RouteStat[] 
}) {
  const { t } = useLanguage()

  return (
    <div className="space-y-10">
      {/* Sub-Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-950 rounded-xl text-purple-500 shadow-lg border border-slate-800">
          <MapPin size={18} />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight uppercase premium-text-gradient">{t('dashboard.customer_route_header')}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Customers Elite */}
        <PremiumCard className="bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-purple-600 rounded-xl text-white shadow-lg">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight italic uppercase">{t('dashboard.market_command')}</h3>
                  <p className="text-purple-400 text-[9px] font-bold uppercase tracking-[0.2em]">{t('dashboard.customer_yield')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-slate-50">
                {customers.map((c, i) => (
                    <div key={i} className="p-8 flex items-center justify-between group/cust hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-purple-500">
                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center text-[12px] font-black shadow-xl italic transition-transform duration-500 transition-all uppercase",
                                i < 3 ? "bg-purple-100 text-purple-700" : "bg-slate-950 text-white"
                            )}>
                                #{i + 1}
                            </div>
                            <div>
                                <div className="text-slate-900 font-black text-sm tracking-tight uppercase italic group-hover/cust:text-purple-600 transition-colors">{c.name}</div>
                                <div className="text-[10px] text-slate-500 font-black mt-2 tracking-widest italic uppercase">
                                    {t('dashboard.mission_volume')}: {c.jobCount}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-lg font-black text-slate-950 tracking-tighter italic">฿{c.revenue.toLocaleString()}</div>
                             <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">{t('dashboard.aggregate_revenue')}</div>
                        </div>
                    </div>
                ))}
                {customers.length === 0 && (
                     <div className="p-24 text-center">
                        <Building2 size={48} strokeWidth={1} className="mx-auto mb-4 text-slate-100" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t('dashboard.awaiting_market')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>

        {/* Route Profitability Elite */}
        <PremiumCard className="bg-white border-none shadow-[0_30px_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-br-[5rem] rounded-tl-[3rem]">
           <div className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight italic uppercase">{t('dashboard.corridor_yield')}</h3>
                  <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-[0.2em]">{t('dashboard.route_margin')}</p>
                </div>
              </div>
           </div>
           <div className="p-0">
              <div className="divide-y divide-slate-50">
                {routes.slice(0, 5).map((r, i) => (
                    <div key={i} className="p-8 flex items-center justify-between group/route hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-emerald-500">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-[12px] font-black shadow-xl italic uppercase">
                                {r.route.slice(0, 2)}
                            </div>
                            <div>
                                <div className="text-slate-900 font-black text-sm tracking-tight uppercase italic">{r.route}</div>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 tracking-widest uppercase">
                                        {r.count} {t('dashboard.missions')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold italic">COST: ฿{r.cost.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-lg font-black text-emerald-600 tracking-tighter italic">+{r.margin.toFixed(1)}%</div>
                             <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">{t('dashboard.net_margin')}</div>
                        </div>
                    </div>
                ))}
                {routes.length === 0 && (
                     <div className="p-24 text-center">
                        <Activity size={48} strokeWidth={1} className="mx-auto mb-4 text-slate-100" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t('dashboard.sector_nominal')}</p>
                    </div>
                )}
              </div>
           </div>
        </PremiumCard>
      </div>
    </div>
  )
}
