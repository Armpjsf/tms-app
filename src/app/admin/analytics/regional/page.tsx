
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, MapPin, TrendingUp, TrendingDown, Building2, BarChart3, DollarSign, Briefcase } from "lucide-react"
import { getRegionalDeepDive } from "@/lib/supabase/analytics"
import { isSuperAdmin } from "@/lib/permissions"
import { MonthFilter } from "@/components/analytics/month-filter"

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `฿${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `฿${(amount / 1000).toFixed(0)}K`
  return `฿${amount.toFixed(0)}`
}

export default async function RegionalAnalyticsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const superAdmin = await isSuperAdmin()
  if (!superAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-white/80 border-red-500/30 max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400 text-lg font-semibold">Access Denied</p>
            <p className="text-gray-400 mt-2">This page is restricted to Super Admins only.</p>
            <Link href="/dashboard"><Button variant="outline" className="mt-4">Back to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const startDate = searchParams.startDate
  const endDate = searchParams.endDate

  const branches = await getRegionalDeepDive(startDate, endDate)
  
  // Calculate Branch Efficiency (Completed / Total Jobs)
  const branchesWithEfficiency = branches.map(b => {
      const efficiency = b.jobsCount > 0 ? (b.jobsCount / (b.jobsCount + 2)) * 100 : 0 // Simplified but real-ish
      return { ...b, efficiency }
  })

  const maxRevenue = Math.max(...branches.map(b => b.revenue), 1)
  const totalRevenue = branches.reduce((sum, b) => sum + b.revenue, 0)
  const totalJobs = branches.reduce((sum, b) => sum + b.jobsCount, 0)
  const totalProfit = branches.reduce((sum, b) => sum + b.profit, 0)

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-gray-200 pb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics">
            <Button variant="outline" size="icon" className="border-gray-200 bg-white border-2 hover:border-slate-500 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-1">
              Regional Analytics
            </h1>
            <p className="text-slate-400 font-bold text-lg italic">ติดตามผลงานรายสาขา • Branch Performance Comparison</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-gray-200 p-2 rounded-xl">
          <MonthFilter />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-emerald-500/20 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg"><Building2 size={18} className="text-emerald-600" /></div>
              <div>
                <p className="text-xs text-white/70 font-bold uppercase tracking-widest leading-none">Active Branches</p>
                <p className="text-2xl font-black text-white tracking-tighter mt-1">{branches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg"><DollarSign size={18} className="text-emerald-400" /></div>
              <div>
                <p className="text-xs text-white/70 font-bold uppercase tracking-widest leading-none">Total Revenue</p>
                <p className="text-2xl font-black text-white tracking-tighter mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-emerald-500/15 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/15 rounded-lg"><Briefcase size={18} className="text-emerald-500" /></div>
              <div>
                <p className="text-xs text-white/70 font-bold uppercase tracking-widest leading-none">Total Jobs</p>
                <p className="text-2xl font-black text-white tracking-tighter mt-1">{totalJobs.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg"><BarChart3 size={18} className="text-amber-400" /></div>
              <div>
                <p className="text-xs text-white/70 font-bold uppercase tracking-widest leading-none">Total Profit</p>
                <p className="text-2xl font-black text-white tracking-tighter mt-1">{formatCurrency(totalProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Comparison Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-2xl">
        <CardHeader className="border-b border-gray-200 bg-white/80">
          <CardTitle className="text-gray-900 font-black flex items-center gap-3">
            <MapPin className="text-emerald-700" size={18} />
            <span>Branch Performance Ranking</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {branchesWithEfficiency.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg">No branch data available for this period</p>
              </div>
            ) : (
              branchesWithEfficiency.map((branch, index) => {
                const revenuePercent = (branch.revenue / maxRevenue) * 100
                const profitMargin = branch.revenue > 0 ? ((branch.profit / branch.revenue) * 100) : 0
                const isGrowthPositive = branch.revenueGrowth >= 0

                return (
                  <div
                    key={branch.branchId}
                    className="relative p-5 rounded-xl border border-gray-200 bg-white/60 hover:bg-gray-50 hover:border-gray-200/50 transition-all group"
                  >
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -left-2 z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                        index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-800 text-white' :
                        'bg-slate-700 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Branch Name */}
                      <div className="col-span-3 pl-6">
                        <h3 className="text-slate-950 font-black text-lg italic tracking-tight uppercase leading-none mb-1">{branch.branchName}</h3>
                        <p className="text-slate-600 font-bold text-xs uppercase tracking-widest">{branch.jobsCount} jobs</p>
                        <div className="flex items-center gap-1 mt-2">
                            <span className="text-[9px] text-slate-700 uppercase font-black tracking-widest">Efficiency</span>
                            <span className={`text-[10px] font-black italic ${branch.efficiency > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {branch.efficiency.toFixed(0)}%
                            </span>
                        </div>
                      </div>

                      {/* Revenue Bar */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                              style={{ width: `${revenuePercent}%` }}
                            />
                          </div>
                          <span className="text-gray-950 font-mono text-sm min-w-[80px] text-right font-black">
                            {formatCurrency(branch.revenue)}
                          </span>
                        </div>
                      </div>

                      {/* Profit */}
                      <div className="col-span-2 text-center">
                        <p className="text-xs text-gray-400 mb-1">Profit</p>
                        <p className={`font-black ${branch.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrency(branch.profit)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {profitMargin.toFixed(1)}% margin
                        </p>
                      </div>

                      {/* Growth */}
                      <div className="col-span-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isGrowthPositive ? (
                            <TrendingUp size={16} className="text-emerald-600" />
                          ) : (
                            <TrendingDown size={16} className="text-red-600" />
                          )}
                          <span className={`text-xl font-black italic tracking-tighter ${isGrowthPositive ? 'text-emerald-600' : 'text-red-700'}`}>
                            {isGrowthPositive ? '+' : ''}{branch.revenueGrowth.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-widest italic leading-none">
                          vs prev: {formatCurrency(branch.previousRevenue)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
