"use client"

import { Star, TrendingUp } from "lucide-react"

type DriverPerformance = {
  name: string
  revenue: number
  completedJobs: number
  totalJobs: number
  successRate: number
}

export function DriverLeaderboard({ data }: { data: DriverPerformance[] }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-4">
      {data.map((driver, index) => (
        <div 
            key={driver.name} 
            className="group relative flex items-center justify-between p-4 bg-muted/40 border border-border/5 rounded-xl hover:border-emerald-500/30 transition-all overflow-hidden"
        >
          {/* Rank indicator */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-black text-xl
                ${index === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 
                  index === 1 ? 'bg-slate-300/10 text-gray-700 border border-slate-300/20' : 
                  index === 2 ? 'bg-orange-900/20 text-orange-500 border border-orange-500/20' : 
                  'bg-gray-100 text-gray-400'}`}
            >
              {index + 1}
            </div>
            <div>
              <p className="font-black text-foreground mb-0.5">{driver.name}</p>
              <div className="flex items-center gap-3 text-base font-bold font-black text-muted-foreground">
                <span className="flex items-center gap-1"><Star size={10} className="text-amber-500" /> {driver.successRate.toFixed(0)}% Success</span>
                <span>•</span>
                <span>{driver.completedJobs} / {driver.totalJobs} Jobs</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-black text-foreground">{formatCurrency(driver.revenue)}</p>
            <div className="flex items-center justify-end gap-1 text-base font-bold uppercase font-bold text-emerald-400">
              <TrendingUp size={10} /> Yield Focus
            </div>
          </div>
        </div>
      ))}
      
      {data.length === 0 && (
        <div className="text-center p-8 text-gray-700 italic font-bold">ไม่มีข้อมูลคนขับในช่วงเวลานี้</div>
      )}
    </div>
  )
}

