"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, MapPin, TrendingUp, DollarSign } from "lucide-react"

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

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 text-purple-400">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <MapPin size={20} />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Customer & Route Intelligence</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
           <CardHeader className="border-b border-gray-200 pb-4">
             <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-2">
               <Building2 size={16} className="text-purple-400" />
               Top Customers (Revenue)
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {customers.map((c, i) => (
                    <div key={i} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold text-white ${i < 3 ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-100 text-gray-500'}`}>
                                {i + 1}
                            </div>
                            <div>
                                <div className="text-gray-800 font-medium text-sm group-hover:text-purple-400 transition-colors">{c.name}</div>
                                <div className="text-xs text-gray-700 font-black mt-0.5">{c.jobCount} Jobs</div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-gray-950 font-black text-sm">฿{c.revenue.toLocaleString()}</div>
                             {/* <div className="text-[10px] text-gray-400 mt-0.5">Revenue</div> */}
                        </div>
                    </div>
                ))}
                {customers.length === 0 && (
                     <div className="py-8 text-center text-gray-400 text-sm">ไม่มีข้อมูลลูกค้า</div>
                )}
             </div>
           </CardContent>
        </Card>

        {/* Route Profitability */}
        <Card className="bg-white/80 border-gray-200 backdrop-blur-sm">
           <CardHeader className="border-b border-gray-200 pb-4">
             <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-2">
               <TrendingUp size={16} className="text-emerald-400" />
               Route Profitability (Top 5)
             </CardTitle>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="divide-y divide-white/5">
                {routes.slice(0, 5).map((r, i) => (
                    <div key={i} className="py-4 flex items-center justify-between">
                        <div>
                            <div className="text-gray-800 font-medium text-sm">{r.route}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{r.count} trips</span>
                                <span className="text-[10px] text-gray-400">Cost: ฿{r.cost.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-emerald-700 font-black text-sm">{r.margin.toFixed(1)}% Margin</div>
                             <div className="text-[10px] text-gray-700 font-black mt-0.5">Rev: ฿{r.revenue.toLocaleString()}</div>
                        </div>
                    </div>
                ))}
                {routes.length === 0 && (
                     <div className="py-8 text-center text-gray-400 text-sm">ไม่มีข้อมูลเส้นทาง</div>
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
